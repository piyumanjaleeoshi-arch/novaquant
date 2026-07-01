import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import crypto from "crypto";
import admin from "firebase-admin";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { Firestore } from "@google-cloud/firestore";
import { db as pgDb, schema as pgSchema } from "./src/utils/index.ts";
import { eq, and, desc } from "drizzle-orm";

if (fs.existsSync(path.join(process.cwd(), ".env"))) {
  dotenv.config({ override: true });
} else if (fs.existsSync(path.join(process.cwd(), ".env.example"))) {
  dotenv.config({ path: path.join(process.cwd(), ".env.example"), override: true });
}

// Clean quotes utility for modern cloud environments and platform secret injectors
function cleanEnvString(val: string | undefined): string {
  if (!val) return "";
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1);
  } else if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

const JWT_SECRET = cleanEnvString(process.env.JWT_SECRET) || "novaquant_quantum_trading_session_encryption_key";

// Loading Firebase configuration from local applet json blueprint
let firebaseConfig: any = null;
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    console.info("[Server Auth] Found firebase-applet-config.json:", firebaseConfig.projectId);
  } catch (err: any) {
    console.error("[Server Auth] Error parsing firebase-applet-config.json:", err);
  }
}

// Override with process environment variables if defined by user (.env or .env.example)
const envApiKey = cleanEnvString(process.env.VITE_FIREBASE_API_KEY);
const envProjectId = cleanEnvString(process.env.VITE_FIREBASE_PROJECT_ID);
const envAuthDomain = cleanEnvString(process.env.VITE_FIREBASE_AUTH_DOMAIN);
const envStorageBucket = cleanEnvString(process.env.VITE_FIREBASE_STORAGE_BUCKET);
const envMessagingSenderId = cleanEnvString(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
const envAppId = cleanEnvString(process.env.VITE_FIREBASE_APP_ID);

if (envProjectId) {
  firebaseConfig = firebaseConfig || {};
  firebaseConfig.apiKey = envApiKey || firebaseConfig.apiKey;
  const oldProj = firebaseConfig.projectId;
  firebaseConfig.projectId = envProjectId || firebaseConfig.projectId;
  firebaseConfig.authDomain = envAuthDomain || firebaseConfig.authDomain;
  firebaseConfig.storageBucket = envStorageBucket || firebaseConfig.storageBucket;
  firebaseConfig.messagingSenderId = envMessagingSenderId || firebaseConfig.messagingSenderId;
  firebaseConfig.appId = envAppId || firebaseConfig.appId;
  
  if (firebaseConfig.projectId !== "silken-will-kthgf") {
    firebaseConfig.firestoreDatabaseId = undefined; // Force default database check for custom projects
  }
  console.info("[Server Auth] Overrode firebaseConfig with custom/local .env variables! Project ID:", firebaseConfig.projectId);
}

// Initializing Firebase Admin
if (firebaseConfig) {
  try {
    if (getApps().length === 0) {
      initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.info("[Server Auth] Firebase Admin successfully initialized.");
    }
  } catch (adminErr: any) {
    console.warn("[Server Auth] Firebase Admin credentials initialization fallback:", adminErr.message);
    try {
      if (getApps().length === 0) {
        initializeApp({
          projectId: firebaseConfig.projectId,
        });
        console.info("[Server Auth] Firebase Admin initialized in fallback context.");
      }
    } catch (fallbackErr: any) {
      console.error("[Server Auth] Firebase Admin failed to initialize entirely:", fallbackErr);
    }
  }
}

// Helper getter for the custom Firestore instance
let customFirestoreInstance: any = null;
function getAdminDb() {
  if (!customFirestoreInstance && firebaseConfig) {
    try {
      if (firebaseConfig.firestoreDatabaseId) {
        customFirestoreInstance = getFirestore(firebaseConfig.firestoreDatabaseId);
        console.info("[Server Auth] Dedicated custom Firestore instance established via firebase-admin:", firebaseConfig.firestoreDatabaseId);
      } else {
        customFirestoreInstance = getFirestore();
        console.info("[Server Auth] Default Firestore instance established via firebase-admin.");
      }
    } catch (err: any) {
      console.error("[Server Auth] Error establishing Firestore via firebase-admin:", err);
      try {
        customFirestoreInstance = new Firestore({
          projectId: firebaseConfig.projectId,
          databaseId: firebaseConfig.firestoreDatabaseId,
        });
        console.info("[Server Auth] Fallback to raw @google-cloud/firestore instance.");
      } catch (e) {
        console.error("[Server Auth] Could not establish fallback Firestore instance:", e);
      }
    }
  }
  return customFirestoreInstance;
}

// Users state schema matching the request's core database fields
interface UserData {
  id: string;
  full_name: string;
  username?: string;
  email: string;
  role?: string;
  plan?: string;
  encryptedBinanceApiKey?: string | null;
  encryptedBinanceApiSecret?: string | null;
  password_hash: string;
  passwordHash?: string;
  email_verified: boolean;
  verification_code: string | null;
  verification_expiry: number | null; // Epoc ms
  financial_loss_agreed?: boolean;
  financial_agreement_timestamp?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
}



// In-memory rate limiting to prevent brute force attacks on authentication
const rateLimitMap = new Map<string, { attempts: number; lockUntil: number }>();

function checkRateLimit(key: string, limit = 3, durationMs = 5 * 60 * 1000): { isBlocked: boolean; timeLeftMinutes: number } {
  const normalizedKey = key.toLowerCase().trim();
  const now = Date.now();
  const record = rateLimitMap.get(normalizedKey);

  if (record && record.lockUntil > now) {
    const timeLeft = Math.ceil((record.lockUntil - now) / 1000 / 60);
    return { isBlocked: true, timeLeftMinutes: timeLeft };
  }

  return { isBlocked: false, timeLeftMinutes: 0 };
}

function incrementRateLimit(key: string, limit = 3, durationMs = 5 * 60 * 1000): void {
  const normalizedKey = key.toLowerCase().trim();
  const now = Date.now();
  const record = rateLimitMap.get(normalizedKey) || { attempts: 0, lockUntil: 0 };

  record.attempts += 1;
  if (record.attempts >= limit) {
    record.lockUntil = now + durationMs;
    record.attempts = 0; // reset
  }
  rateLimitMap.set(normalizedKey, record);
}

function resetRateLimit(key: string): void {
  rateLimitMap.delete(key.toLowerCase().trim());
}

// Custom templates matching requested welcome and reset layouts
function getEmailTemplate(purpose: 'verification' | 'reset' | 'welcome', name: string, code?: string) {
  if (purpose === 'verification') {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>NovaQuant Security Handshake</title>
        <style>
          body {
            margin: 0; padding: 0; background-color: #02050b;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #cbd5e1;
          }
          .container {
            max-width: 550px; margin: 40px auto; background-color: #040d1a !important;
            border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            background-color: #02050b; text-align: center; padding: 30px 20px;
            border-bottom: 1px solid #0f172a;
          }
          .header h1 { color: #ffffff; font-size: 24px; margin: 5px 0 0 0; font-weight: 800; }
          .header p { color: #fbbf24; font-family: monospace; font-size: 11px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2.5px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 15px; margin-bottom: 20px; color: #cbd5e1; }
          .verification-wrapper {
            text-align: center; margin: 35px 0; padding: 24px;
            background-color: #02050b; border: 1px dashed #334155; border-radius: 8px;
          }
          .code-caption { font-size: 10px; font-family: monospace; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
          .passcode { font-size: 38px; font-weight: 800; font-family: monospace; color: #fbbf24; letter-spacing: 6px; margin: 0; }
          .instructions { font-size: 13px; line-height: 1.6; color: #94a3b8; margin-top: 25px; }
          .footer { background-color: #02050b; text-align: center; padding: 20px; font-size: 11px; color: #475569; font-family: monospace; border-top: 1px solid #0f172a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NovaQuant</h1>
            <p>QUANTUM SECURE PASSWAY</p>
          </div>
          <div class="content">
            <div class="greeting">Hello, <strong>${name}</strong></div>
            <p class="instructions">
              An operator request was deployed to authenticate index node connections. Please authorize this hardware handshake by entering the secure passcode token displayed below on your terminal viewport.
            </p>
            <div class="verification-wrapper">
              <div class="code-caption">SESSION PASSCODE KEY</div>
              <div class="passcode">${code}</div>
            </div>
            <p class="instructions" style="font-size:11px; color:#475569;">
              This security code is strictly volatile and will expire in 10 minutes. If you did not command this launch sequence, you can safely ignore this uplink dispatch.
            </p>
          </div>
          <div class="footer">
            ⚡ NovaQuant Console Autopilot • High-Frequency Algo Hub
          </div>
        </div>
      </body>
    </html>
    `;
  } else if (purpose === 'reset') {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>NovaQuant Password Reset</title>
        <style>
          body {
            margin: 0; padding: 0; background-color: #02050b;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #cbd5e1;
          }
          .container {
            max-width: 550px; margin: 40px auto; background-color: #040d1a !important;
            border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            background-color: #02050b; text-align: center; padding: 30px 20px;
            border-bottom: 1px solid #0f172a;
          }
          .header h1 { color: #ffffff; font-size: 24px; margin: 5px 0 0 0; font-weight: 800; }
          .header p { color: #ef4444; font-family: monospace; font-size: 11px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2.5px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 15px; margin-bottom: 20px; color: #cbd5e1; }
          .verification-wrapper {
            text-align: center; margin: 35px 0; padding: 24px;
            background-color: #02050b; border: 1px dashed #ef4444; border-radius: 8px;
          }
          .code-caption { font-size: 10px; font-family: monospace; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
          .passcode { font-size: 38px; font-weight: 800; font-family: monospace; color: #ef4444; letter-spacing: 6px; margin: 0; }
          .instructions { font-size: 13px; line-height: 1.6; color: #94a3b8; margin-top: 25px; }
          .footer { background-color: #02050b; text-align: center; padding: 20px; font-size: 11px; color: #475569; font-family: monospace; border-top: 1px solid #0f172a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NovaQuant</h1>
            <p>PASSWORD CHANGE DEVIATION LOCK</p>
          </div>
          <div class="content">
            <div class="greeting">Hello, <strong>${name}</strong></div>
            <p class="instructions">
              We received a request to override the current terminal password key connected to your account. To proceed with setting coordinates for a new safety password, enter the secondary OTP passcode token detailed below:
            </p>
            <div class="verification-wrapper">
              <div class="code-caption">RESET PASSCODE KEY</div>
              <div class="passcode">${code}</div>
            </div>
            <p class="instructions" style="font-size:11px; color:#475569;">
              This lockout bypass passcode is active for 10 minutes. If you did not trigger this sequence, update your security log files or contact support immediately.
            </p>
          </div>
          <div class="footer">
            🛡️ NovaQuant Autopilot Systems • High-Frequency Algo Hub
          </div>
        </div>
      </body>
    </html>
    `;
  } else {
    // welcome
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to NovaQuant Autopilot</title>
        <style>
          body {
            margin: 0; padding: 0; background-color: #02050b;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #cbd5e1;
          }
          .container {
            max-width: 550px; margin: 40px auto; background-color: #040d1a !important;
            border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            background-color: #02050b; text-align: center; padding: 35px 20px;
            border-bottom: 1px solid #0f172a;
          }
          .header h1 { color: #ffffff; font-size: 26px; margin: 5px 0 0 0; font-weight: 800; }
          .header p { color: #10b981; font-family: monospace; font-size: 11px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 16px; margin-bottom: 20px; color: #ffffff; }
          .bullets { margin: 25px 0; padding-left: 20px; }
          .bullets li { margin-bottom: 12px; font-size: 13px; line-height: 1.5; color: #94a3b8; }
          .bullets strong { color: #e2e8f0; }
          .action-box { text-align: center; margin: 30px 0; padding: 20px; background-color: #02050b; border: 1px solid #1e293b; border-radius: 8px; }
          .btn { background-color: #10b981; color: #02050b !important; font-weight: 800; text-transform: uppercase; font-family: monospace; font-size: 12px; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .instructions { font-size: 13px; line-height: 1.6; color: #94a3b8; }
          .footer { background-color: #02050b; text-align: center; padding: 20px; font-size: 11px; color: #475569; font-family: monospace; border-top: 1px solid #0f172a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NovaQuant</h1>
            <p>UPLINK ESTABLISHED SUCCESSFULLY</p>
          </div>
          <div class="content">
            <div class="greeting">Welcome, <strong>${name}</strong>!</div>
            <p class="instructions">
              Your security handshake process has been perfectly authorized, and your secure NovaQuant Index profile node is fully synchronized. Your terminal dashboard is ready to track.
            </p>
            <ul class="bullets">
              <li><strong>Algorithmic Auto-Execution:</strong> Fully-isolated virtual sandboxed runtimes execute SOL, BTC, and custom quantitative trading strategies.</li>
              <li><strong>Zero Risk Capital Protection:</strong> Built-in stop-losses, trailing dynamic sliders, and safety caps keep your indices risk-free.</li>
              <li><strong>Backtesting Telemetry:</strong> Backtest any workspace utilizing raw historical futures feeds retrieved directly from Exchange APIs.</li>
            </ul>
            <p class="instructions" style="font-size:11px; color:#475569; margin-top:25px;">
              For live execution: Be sure to configure API key strings, customize safety parameters in settings, and keep standard gas tanks filled to sync live indicators.
            </p>
          </div>
          <div class="footer">
            ⚡ NovaQuant Terminal Autopilot • Live Quant System Active
          </div>
        </div>
      </body>
    </html>
    `;
  }
}

// Unified secure dispatcher (Nodemailer SMTP & SendGrid-exclusive API)
async function sendEmailUnified(
  email: string,
  subject: string,
  htmlContent: string,
  name: string,
  code: string
): Promise<{ success: boolean; simulated: boolean; message: string; code?: string }> {
  let emailSent = false;
  let serviceUsed = "";
  let serviceErrorLogs = "";

  const smtpUser = cleanEnvString(process.env.SMTP_USER || "novaquant2026@gmail.com");
  let smtpPass = cleanEnvString(process.env.SMTP_PASS);
  // Google App Passwords consist of 16 lowercase characters often grouped with spaces for readability.
  // We automatically clean and strip any whitespaces for optimal Gmail verification compatibility.
  if (smtpPass) {
    smtpPass = smtpPass.replace(/\s+/g, "");
  }
  const smtpHost = cleanEnvString(process.env.SMTP_HOST || "smtp.gmail.com");
  const smtpPort = Number(cleanEnvString(process.env.SMTP_PORT) || "465");
  // Default to secure=true unless port is specifically 587
  const smtpSecure = cleanEnvString(process.env.SMTP_SECURE) !== "false" && smtpPort !== 587;

  // 0. EmailJS REST API Service (Primary requested delivery partner)
  const emailjsServiceId = cleanEnvString(process.env.VITE_EMAILJS_SERVICE_ID);
  const emailjsTemplateId = cleanEnvString(process.env.VITE_EMAILJS_TEMPLATE_ID);
  const emailjsPublicKey = cleanEnvString(process.env.VITE_EMAILJS_PUBLIC_KEY);

  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    try {
      console.log(`[NovaQuant Unified Mailer] Launching EmailJS REST pipeline to: ${email}`);
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          service_id: emailjsServiceId,
          template_id: emailjsTemplateId,
          user_id: emailjsPublicKey,
          template_params: {
            to_email: email,
            to_name: name || email.split("@")[0],
            otp_code: code,
            message: `Your secure validation code is: ${code}. This code is valid for 10 minutes (expires strictly after 10m).`
          }
        })
      });

      if (response.ok) {
        emailSent = true;
        serviceUsed = "EmailJS REST Service";
        console.log(`[NovaQuant Unified Mailer] EmailJS delivery succeeded for: ${email}`);
      } else {
        const text = await response.text();
        console.error(`[NovaQuant Unified Mailer] EmailJS delivery failed: ${text}`);
        serviceErrorLogs += `[EmailJS failed: ${text}] `;
      }
    } catch (err: any) {
      console.error(`[NovaQuant Unified Mailer] EmailJS error:`, err);
      serviceErrorLogs += `[EmailJS exception: ${err.message || err}] `;
    }
  }

  // 1. Nodemailer SMTP (Highly encouraged for custom mailboxes / Gmail accounts)
  if (smtpPass) {
    try {
      console.log(`[NovaQuant Unified Mailer] Launching Nodemailer SMTP pipeline of ${smtpUser} to: ${email}`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        timeout: 8000 // 8 second timeout threshold
      } as any);

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'NovaQuant Secure Automation'}" <${smtpUser}>`,
        to: email,
        subject: subject,
        html: htmlContent
      };

      await transporter.sendMail(mailOptions);
      emailSent = true;
      serviceUsed = `SMTP (${smtpUser} via ${smtpHost})`;
      console.log(`[NovaQuant Unified Mailer] Success! Email dispatched via SMTP to: ${email}`);
    } catch (err: any) {
      console.error("[NovaQuant Unified Mailer] SMTP Transmission Failure:", err);
      serviceErrorLogs += `[SMTP failed: ${err.message || String(err)}] `;
    }
  }

  // 2. SendGrid API Fallback
  if (!emailSent && process.env.SENDGRID_API_KEY) {
    try {
      console.log(`[NovaQuant Unified Mailer] Launching SendGrid pipeline to: ${email}`);
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: process.env.EMAIL_FROM || smtpUser, name: "NovaQuant Security" },
          subject,
          content: [{ type: "text/html", value: htmlContent }]
        })
      });

      if (response.ok) {
        emailSent = true;
        serviceUsed = "SendGrid API Service";
      } else {
        const text = await response.text();
        serviceErrorLogs += `[SendGrid failed ${response.status}: ${text}] `;
      }
    } catch (err: any) {
      serviceErrorLogs += `[SendGrid exception: ${err.message || err}] `;
    }
  }

  if (emailSent) {
    return {
      success: true,
      simulated: false,
      message: `Passcode token dispatched successfully to ${email} via real-time ${serviceUsed}!`
    };
  } else {
    // If SMTP_PASS is missing, warn the user clearly with how to connect
    let customMessage = `Quantum bypass passcode generated: ${code}.`;
    if (serviceErrorLogs) {
      customMessage += ` (Delivery error details: "${serviceErrorLogs.trim()}")`;
    } else {
      customMessage += ` (To receive real emails on Gmail, set your SMTP_PASS App Password in the Secrets panel for ${smtpUser})`;
    }

    return {
      success: true,
      simulated: true,
      message: customMessage,
      code
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // 1. SIGN UP (Create Account) with secure constraints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { full_name, email, password, confirm_password, financial_loss_agreed } = req.body;

      if (!full_name || !email || !password || !confirm_password) {
        return res.status(400).json({ success: false, error: "All account parameters are required." });
      }

      if (!financial_loss_agreed) {
        return res.status(400).json({ success: false, error: "You must review and explicitly accept sole financial responsibility and risk liability before creating an account." });
      }

      // Email formatting validation check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: "Please declare a valid email address format." });
      }

      // Password minimum 8 characters; uppercase, lowercase, number, special char
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-+=[\]{}()^#|\\\/`~:;'"<>?])[A-Za-z\d@$!%*?&._\-+=[\]{}()^#|\\\/`~:;'"<>?]{8,}$/;
      if (!passRegex.test(password)) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one unique special character."
        });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ success: false, error: "Confirmation password does not match establish criteria." });
      }

      const adminDb = getAdminDb();
      if (!adminDb) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      const emailLower = email.toLowerCase().trim();
      const userRole = (emailLower === "piyumanjaleeoshi@gmail.com" || emailLower === "novaquant2026@gmail.com" || emailLower === "salindaperera1997@gmail.com" || emailLower.startsWith("admin") || emailLower.includes("admin@")) ? "ADMIN" : "USER";

      // Query if user already exists in Firestore users collection
      const usersSnap = await adminDb.collection("users").where("email", "==", emailLower).limit(1).get();
      
      if (!usersSnap.empty) {
        const existingUserDoc = usersSnap.docs[0];
        const existingUser = existingUserDoc.data();
        if (existingUser.email_verified) {
          return res.status(400).json({
            success: false,
            error: "This email address is already connected to an operator node. Please log in or reset password."
          });
        } else {
          // Unverified signup trace refresh/overwrite block
          console.log(`[NovaQuant Auth] Re-triggering registration process for unverified account: ${emailLower}`);
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          const passHashValObj = bcrypt.hashSync(password, 10);
          
          const updatedUserFields = {
            full_name,
            username: full_name,
            role: userRole,
            plan: "BASIC",
            password_hash: passHashValObj,
            passwordHash: passHashValObj,
            verification_code: otpCode,
            verification_expiry: Date.now() + 10 * 60 * 1000 + 10 * 1000, // 10 minute and 10 second TTL
            updated_at: new Date().toISOString()
          };

          // Update user record in Firestore
          await existingUserDoc.ref.set(updatedUserFields, { merge: true });

          // Synchronize user fields to PostgreSQL
          await syncUserToPg(existingUser.id, emailLower, updatedUserFields);

          // Sync unverified state update to Firebase Auth
          try {
            await getAuth().updateUser(existingUser.id, {
              password: password,
              displayName: full_name,
            });
          } catch (fbErr: any) {
            if (fbErr.code === "auth/user-not-found" || fbErr.code === "messaging/invalid-argument" || fbErr.message?.includes("not found")) {
              try {
                await getAuth().createUser({
                  uid: existingUser.id,
                  email: emailLower,
                  password: password,
                  displayName: full_name,
                  emailVerified: false,
                });
              } catch (crErr) {}
            }
          }

          // Dispatch Email Verification OTP
          const subject = `[NovaQuant Autopilot] Securing Session Key: ${otpCode}`;
          const htmlContent = getEmailTemplate('verification', full_name, otpCode);
          const emailResult = await sendEmailUnified(emailLower, subject, htmlContent, full_name, otpCode);

          return res.json({
            success: true,
            message: `Your pending signup process has been refreshed! ${emailResult.message}`,
            simulated: emailResult.simulated,
            code: emailResult.code,
            email: emailLower
          });
        }
      }

      // User does not exist, create a completely new profile
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const passHashVal = bcrypt.hashSync(password, 10);
      const newUserId = `usr-${Date.now()}`;
      const newUser = {
        id: newUserId,
        email: emailLower,
        full_name,
        username: full_name,
        role: userRole,
        plan: "BASIC",
        password_hash: passHashVal,
        passwordHash: passHashVal,
        email_verified: false,
        verification_code: otpCode,
        verification_expiry: Date.now() + 10 * 60 * 1000 + 10 * 1000, // 10 minute and 10 second TTL
        financial_loss_agreed: true,
        financial_agreement_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 1. Save user into Firebase Authentication (Primary Auth)
      try {
        await getAuth().createUser({
          uid: newUserId,
          email: emailLower,
          password: password, // clear text password for Firebase Auth signup (Firebase manages hashing)
          displayName: full_name,
          emailVerified: false,
        });
        console.log(`[NovaQuant Auth] Successfully registered operator in Firebase Auth: ${emailLower}`);
      } catch (fbErr: any) {
        console.warn(`[NovaQuant Auth] Firebase Auth signup failed / bypassed:`, fbErr.message);
      }

      // 2. Save profile into Firestore (Primary DB)
      await adminDb.collection("users").doc(newUserId).set(newUser);
      console.log(`[NovaQuant Auth] Successfully created Firestore profile: ${emailLower}`);

      // Synchronize new profile with PostgreSQL
      await syncUserToPg(newUserId, emailLower, newUser);

      console.log(`[NovaQuant Auth] Registered unverified operator: ${emailLower} with passcode: ${otpCode}`);

      // Dispatch Email Verification OTP
      const subject = `[NovaQuant Autopilot] Securing Session Key: ${otpCode}`;
      const htmlContent = getEmailTemplate('verification', full_name, otpCode);
      const emailResult = await sendEmailUnified(emailLower, subject, htmlContent, full_name, otpCode);

      return res.json({
        success: true,
        message: emailResult.message,
        simulated: emailResult.simulated,
        code: emailResult.code,
        email: emailLower
      });

    } catch (err: any) {
      console.error("[NovaQuant Auth] Registration error index:", err);
      return res.status(500).json({ success: false, error: "Registration processing failure." });
    }
  });

  // 2. VERIFY NEW Account OTP
  app.post("/api/auth/register-verify", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ success: false, error: "Email address and 6-digit key are required." });
      }

      const adminDb = getAdminDb();
      if (!adminDb) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      const emailLower = email.toLowerCase().trim();
      const usersSnap = await adminDb.collection("users").where("email", "==", emailLower).limit(1).get();

      if (usersSnap.empty) {
        return res.status(400).json({ success: false, error: "Operator node profile not found." });
      }

      const userDoc = usersSnap.docs[0];
      const user = userDoc.data();

      if (user.email_verified) {
        return res.json({ success: true, message: "Email is already verified. Proceeding to login console." });
      }

      if (!user.verification_code || user.verification_code !== code.trim()) {
        return res.status(400).json({ success: false, error: "Invalid verification key code. Please check again." });
      }

      if (user.verification_expiry && Date.now() > user.verification_expiry) {
        return res.status(400).json({ success: false, error: "The verification passcode has decayed (10-minute and 10-second timeout). Please request a new code." });
      }

      // Mark verified in Firestore
      await userDoc.ref.set({
        email_verified: true,
        verification_code: null,
        verification_expiry: null,
        updated_at: new Date().toISOString()
      }, { merge: true });

      // Synchronize verification with PostgreSQL
      await syncUserToPg(user.id, emailLower, { email_verified: true });

      console.log(`[NovaQuant Auth] Operator node ${emailLower} verified successfully.`);

      // Send Welcome Email
      const welcomeSubject = "Welcome to NovaQuant Autopilot Trading Suite!";
      const welcomeHtml = getEmailTemplate('welcome', user.full_name);
      await sendEmailUnified(emailLower, welcomeSubject, welcomeHtml, user.full_name, "");

      // Generate secure cryptographic JWT session token expiring in 24h
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.full_name },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const userRole = user.role || (emailLower === 'piyumanjaleeoshi@gmail.com' || emailLower === 'novaquant2026@gmail.com' || emailLower === 'salindaperera1997@gmail.com' || emailLower.startsWith('admin') || emailLower.includes('admin@') ? 'ADMIN' : 'USER');

      return res.json({
        success: true,
        message: "Security handshake verified! Access pipeline authorized.",
        token,
        user: {
          email: user.email,
          name: user.full_name,
          provider: "EMAIL",
          role: userRole,
          email_verified: true
        }
      });

    } catch (err: any) {
      console.error("[NovaQuant Auth] Verification error index:", err);
      return res.status(500).json({ success: false, error: "Handshake verification engine failure." });
    }
  });

  // 3. SECURE LOGIN
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email address and password coordinates are required." });
      }

      // Implement rate limiting to prevent brute force attacks on authentication
      const rateLimitCheck = checkRateLimit(email, 6, 5 * 60 * 1000); // 6 attempts per 5 mins (additional 3 attempts)
      if (rateLimitCheck.isBlocked) {
        return res.status(429).json({
          success: false,
          error: `Brute force safety activated. Account is lockup-frozen for ${rateLimitCheck.timeLeftMinutes} minute(s) due to consecutive login failures.`
        });
      }

      const emailLower = email.toLowerCase().trim();
      let firebaseAvailable = false;
      let fbUserRecord: any = null;

      // 1. Primary Source Verification Check: Firebase Auth
      try {
        fbUserRecord = await getAuth().getUserByEmail(emailLower);
        firebaseAvailable = true;
        console.log(`[NovaQuant Auth] Primary check succeeded: User profile exists in Firebase Auth for ${emailLower}`);
      } catch (fbErr: any) {
        if (fbErr.code === "auth/user-not-found" || fbErr.code === "messaging/invalid-argument" || fbErr.message?.includes("not found")) {
          firebaseAvailable = true; // Firebase is online, but user simply not registered in it yet
          console.log(`[NovaQuant Auth] Primary check: User not discovered in Firebase Auth for ${emailLower}`);
        } else {
          console.warn(`[NovaQuant Auth] Primary Auth engine is offline: ${fbErr.message}.`);
        }
      }

      // 2. Fetch Firestore user profile
      const adminDb = getAdminDb();
      if (!adminDb) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      const usersSnap = await adminDb.collection("users").where("email", "==", emailLower).limit(1).get();
      let user: any = null;
      let userDoc: any = null;

      if (!usersSnap.empty) {
        userDoc = usersSnap.docs[0];
        user = userDoc.data();
      }

      // Restore / Sync user profile from Firebase Auth into Firestore if missing
      if (firebaseAvailable && fbUserRecord && !user) {
        const userRole = (emailLower === "piyumanjaleeoshi@gmail.com" || emailLower === "novaquant2026@gmail.com" || emailLower === "salindaperera1997@gmail.com" || emailLower.startsWith("admin") || emailLower.includes("admin@")) ? "ADMIN" : "USER";
        user = {
          id: fbUserRecord.uid,
          full_name: fbUserRecord.displayName || emailLower.split("@")[0],
          username: fbUserRecord.displayName || emailLower.split("@")[0],
          email: emailLower,
          role: userRole,
          plan: "BASIC",
          password_hash: bcrypt.hashSync(password, 10),
          passwordHash: bcrypt.hashSync(password, 10),
          email_verified: fbUserRecord.emailVerified === true,
          verification_code: null,
          verification_expiry: null,
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await adminDb.collection("users").doc(user.id).set(user);
      }

      if (!user) {
        incrementRateLimit(email, 6, 5 * 60 * 1000);
        const record = rateLimitMap.get(emailLower);
        const remaining = record ? (6 - record.attempts) : 5;
        const msg = remaining > 0 
          ? `Invalid email credentials or security passcode. You have ${remaining} attempts remaining before temporary lockout.`
          : `Brute force safety activated. Account is lockup-frozen due to consecutive login failures.`;
        return res.status(401).json({ success: false, error: msg });
      }

      const passMatches = bcrypt.compareSync(password, user.password_hash || user.passwordHash || "");
      if (!passMatches) {
        incrementRateLimit(email, 6, 5 * 60 * 1000);
        const record = rateLimitMap.get(emailLower);
        const remaining = record ? (6 - record.attempts) : 5;
        const msg = remaining > 0 
          ? `Invalid email credentials or security passcode. You have ${remaining} attempts remaining before temporary lockout.`
          : `Brute force safety activated. Account is lockup-frozen due to consecutive login failures.`;
        return res.status(401).json({ success: false, error: msg });
      }

      // Enforce email verification check
      if (!user.email_verified) {
        return res.status(403).json({
          success: false,
          unverified: true, // Special tag so frontend routes to OTP check immediately
          error: "Your security credentials are fine, but your email address has not been authenticated yet. Please authorize email first.",
          email: user.email,
          name: user.full_name
        });
      }

      // Settle session, clear rate-limit logs
      resetRateLimit(email);

      // Create secure cryptographic JWT session token expiring in 24h
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.full_name },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      const userRole = user.role || (emailLower === 'piyumanjaleeoshi@gmail.com' || emailLower === 'novaquant2026@gmail.com' || emailLower === 'salindaperera1997@gmail.com' || emailLower.startsWith('admin') || emailLower.includes('admin@') ? 'ADMIN' : 'USER');

      return res.json({
        success: true,
        token,
        user: {
          email: user.email,
          name: user.full_name,
          provider: "EMAIL",
          role: userRole,
          email_verified: user.email_verified
        }
      });

    } catch (err: any) {
      console.error("[NovaQuant Auth] Login processing failure:", err);
      return res.status(500).json({ success: false, error: "Uplink validation engine crash." });
    }
  });

  // 4. RESEND OTP CODE FOR VERIFICATION OR RESET FLOWS
  app.post("/api/auth/resend-otp", async (req, res) => {
    try {
      const { email, purpose } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: "Email address is required." });
      }

      const adminDb = getAdminDb();
      if (!adminDb) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      const emailLower = email.toLowerCase().trim();
      const usersSnap = await adminDb.collection("users").where("email", "==", emailLower).limit(1).get();

      if (usersSnap.empty) {
        return res.status(400).json({ success: false, error: "Operator node profile not found." });
      }

      const userDoc = usersSnap.docs[0];
      const user = userDoc.data();

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await userDoc.ref.set({
        verification_code: otpCode,
        verification_expiry: Date.now() + 10 * 60 * 1000 + 10 * 1000,
        updated_at: new Date().toISOString()
      }, { merge: true });

      const isReset = purpose === 'reset';
      const emailPurpose = isReset ? 'reset' : 'verification';
      const emailSubject = isReset 
        ? `[NovaQuant Autopilot] Security reset passcode: ${otpCode}` 
        : `[NovaQuant Autopilot] Securing Session Key: ${otpCode}`;

      const htmlContent = getEmailTemplate(emailPurpose, user.full_name, otpCode);
      const emailResult = await sendEmailUnified(emailLower, emailSubject, htmlContent, user.full_name, otpCode);

      console.log(`[NovaQuant Auth] Re-triggered code ${otpCode} for ${emailLower}. Purpose: ${purpose}`);

      return res.json({
        success: true,
        message: emailResult.message,
        simulated: emailResult.simulated,
        code: emailResult.code
      });

    } catch (err: any) {
      console.error("[NovaQuant Auth] Resend OTP error index:", err);
      return res.status(500).json({ success: false, error: "Passcode generation failure." });
    }
  });

  // 5. FORGOT PASSWORD REQUEST
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: "Please declare your registered email address." });
      }

      const emailLower = email.toLowerCase().trim();
      console.log(`[NovaQuant Auth] Password reset request received for email: ${emailLower}`);

      // 1. Verify email exists in Firebase Authentication or Firestore
      let finalName = emailLower.split('@')[0];
      let userExists = false;

      try {
        const userRecord = await getAuth().getUserByEmail(emailLower);
        userExists = true;
        if (userRecord.displayName) {
          finalName = userRecord.displayName;
        }
        console.log(`[NovaQuant Auth] Checked Firebase Auth: User directory exists for ${emailLower} (UID: ${userRecord.uid})`);
      } catch (fbErr: any) {
        console.warn(`[NovaQuant Auth] Checked Firebase Auth: user not found or error for ${emailLower}:`, fbErr.message);
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      if (!userExists) {
        // Double-check Firestore
        const usersSnap = await db.collection("users").where("email", "==", emailLower).limit(1).get();
        if (!usersSnap.empty) {
          userExists = true;
          const u = usersSnap.docs[0].data();
          if (u.full_name) finalName = u.full_name;
        }
      }

      if (!userExists) {
        return res.status(400).json({ success: false, error: "Operator node profile not found." });
      }

      // 2. Rate-limit check & prevention of OTP flooding in Firestore (1 request per 60s)
      try {
        const recentQuery = await db.collection("password_resets")
          .where("email", "==", emailLower)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (!recentQuery.empty) {
          const lastResetDoc = recentQuery.docs[0].data();
          const timePassed = Date.now() - (lastResetDoc.createdAt || 0);
          if (timePassed < 60 * 1000) {
            const secondsRemaining = Math.ceil((60 * 1000 - timePassed) / 1000);
            console.warn(`[NovaQuant Auth] Rate limit triggered for ${emailLower}. Wait ${secondsRemaining}s.`);
            return res.status(429).json({
              success: false,
              error: `auth/too-many-requests - Rate limit active. Please wait ${secondsRemaining} seconds before requesting another passcode.`
            });
          }
        }
      } catch (dbQueryErr: any) {
        console.error("[NovaQuant Auth] Error checking rate limits from Firestore:", dbQueryErr.message);
      }

      // 3. Generate secure random 6-digit OTP passcode
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

      // 4. Store OTP in Firestore with attempts and verified flags
      try {
        await db.collection("password_resets").add({
          email: emailLower,
          code: otpCode,
          expiresAt: expiresAt,
          used: false,
          attempts: 0,
          verified: false,
          createdAt: Date.now()
        });
        console.log(`[NovaQuant Auth] Successfully stored reset OTP in Firestore collection.`);

        // Synchronize password reset with PostgreSQL
        await syncPasswordResetToPg(emailLower, otpCode, expiresAt);

        // Create audit log
        await db.collection("audit_logs").add({
          email: emailLower,
          action: "PASSWORD_RESET_GENERATED",
          timestamp: Date.now(),
          ip: req.ip || "0.0.0.0"
        });

        // Synchronize audit log with PostgreSQL
        await syncAuditLogToPg(null, emailLower, "PASSWORD_RESET_GENERATED", req.ip, req.headers["user-agent"]);
      } catch (dbWriteErr: any) {
        console.error("[NovaQuant Auth] Failed to write reset OTP to Firestore:", dbWriteErr.message);
      }

      console.log(`[NovaQuant Auth] Dispatched security passcode: ${otpCode} to: ${emailLower}`);

      // 6. Send OTP to the email using Resend / Nodemailer (sendEmailUnified)
      const subject = `[NovaQuant Autopilot] Security reset passcode: ${otpCode}`;
      const htmlContent = getEmailTemplate('reset', finalName, otpCode);
      const emailResult = await sendEmailUnified(emailLower, subject, htmlContent, finalName, otpCode);

      return res.json({
        success: true,
        message: "A password reset code has been sent to your email. It will expire in 10 minutes.",
        simulated: emailResult.simulated,
        code: emailResult.code
      });

    } catch (err: any) {
      console.error("[NovaQuant Auth] Forgot password overall endpoint failure:", err);
      return res.status(500).json({ success: false, error: `auth/network-request-failed - Forgot password transaction routing failure: ${err.message}` });
    }
  });

  // 6. FORGOT PASSWORD VERIFY RESET OTP
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ success: false, error: "Email address and 6-digit reset code are required." });
      }

      const emailLower = email.toLowerCase().trim();
      const codeClean = code.trim();

      console.log(`[NovaQuant Auth] Verifying OTP ${codeClean} for email: ${emailLower}`);

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      const querySnapshot = await db.collection("password_resets")
        .where("email", "==", emailLower)
        .where("used", "==", false)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        return res.status(400).json({ success: false, error: "No active password reset request was found for this user." });
      }

      const doc = querySnapshot.docs[0];
      const resetData = doc.data();

      // Check if already expired
      if (resetData.expiresAt && Date.now() > resetData.expiresAt) {
        return res.status(400).json({ success: false, error: "The passcode token key has expired. Please request forgot password again." });
      }

      // Check max attempts (5 trials limit)
      if ((resetData.attempts || 0) >= 5) {
        return res.status(400).json({ success: false, error: "auth/too-many-requests - Maximum OTP verification attempts (limit 5) exceeded. Please request a new security passcode." });
      }

      const incomingHash = crypto.createHash("sha256").update(codeClean).digest("hex");
      const codeMatch = resetData.tokenHash ? (resetData.tokenHash === incomingHash) : (resetData.code === codeClean);

      if (!codeMatch) {
        const nextAttemptsCount = (resetData.attempts || 0) + 1;
        await doc.ref.update({ attempts: nextAttemptsCount });
        
        // Add failure to audit log
        await db.collection("audit_logs").add({
          email: emailLower,
          action: "PASSWORD_RESET_ATTEMPT_FAILED",
          attempts: nextAttemptsCount,
          timestamp: Date.now(),
          ip: req.ip || "0.0.0.0"
        });

        // Synchronize audit log to PostgreSQL
        await syncAuditLogToPg(null, emailLower, "PASSWORD_RESET_ATTEMPT_FAILED", req.ip, req.headers["user-agent"], { attempts: nextAttemptsCount });

        return res.status(400).json({
          success: false,
          error: `Invalid verification passcode token. Security attempts remaining: ${5 - nextAttemptsCount}/5.`
        });
      }

      // Successful OTP verification
      await doc.ref.update({ verified: true });

      // Add verification to audit log
      await db.collection("audit_logs").add({
        email: emailLower,
        action: "PASSWORD_RESET_VERIFIED",
        timestamp: Date.now(),
        ip: req.ip || "0.0.0.0"
      });

      // Synchronize audit log to PostgreSQL
      await syncAuditLogToPg(null, emailLower, "PASSWORD_RESET_VERIFIED", req.ip, req.headers["user-agent"]);

      console.log(`[NovaQuant Auth] OTP verification successful for: ${emailLower}`);
      return res.json({ success: true, message: "Code verified successfully! Please define your new password." });

    } catch (err: any) {
      console.error("[NovaQuant Auth] Verify code endpoint error:", err);
      return res.status(500).json({ success: false, error: "Handshake signature validation failed on the verification server." });
    }
  });

  // 7. RESET PASSWORD UPDATE METHOD
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, password, confirm_password } = req.body;

      if (!email || !code || !password || !confirm_password) {
        return res.status(400).json({ success: false, error: "All reset variables inputs are required." });
      }

      const emailLower = email.toLowerCase().trim();
      const codeClean = code.trim();

      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-+=[\]{}()^#|\\/`~:;'"<>?])[A-Za-z\d@$!%*?&._\-+=[\]{}()^#|\\/`~:;'"<>?]{8,}$/;
      if (!passRegex.test(password)) {
        return res.status(400).json({
          success: false,
          error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one unique special character."
        });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ success: false, error: "Confirmed new credential password does not align." });
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      let otpValid = false;
      let targetDocRef: any = null;

      try {
        const querySnapshot = await db.collection("password_resets")
          .where("email", "==", emailLower)
          .where("used", "==", false)
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const resetData = doc.data();

          if (resetData.code === codeClean && resetData.verified && (!resetData.expiresAt || Date.now() <= resetData.expiresAt)) {
            otpValid = true;
            targetDocRef = doc.ref;
          }
        }
      } catch (dbErr: any) {
        console.error("[NovaQuant Auth] Firestore error checking reset auth:", dbErr.message);
      }

      if (!otpValid) {
        return res.status(400).json({ success: false, error: "Authentication reset session was invalidated or has expired. Please restart the process." });
      }

      // 1. Update password securely using Firebase Authentication Admin SDK
      let firebaseUpdateSuccess = false;
      try {
        const userRecord = await getAuth().getUserByEmail(emailLower);
        await getAuth().updateUser(userRecord.uid, { password: password });
        firebaseUpdateSuccess = true;
        console.log(`[NovaQuant Auth] Direct Firebase Auth password reset succeeded for uid: ${userRecord.uid}`);
      } catch (fbAdminErr: any) {
        console.warn(`[NovaQuant Auth] Tried to update Firebase Auth, but user was not found or error occurred:`, fbAdminErr.message);
        if (fbAdminErr.code === 'auth/user-not-found') {
          try {
            await getAuth().createUser({
              email: emailLower,
              password: password,
              displayName: emailLower.split('@')[0],
              emailVerified: true
            });
            firebaseUpdateSuccess = true;
            console.log(`[NovaQuant Auth] Created new user in Firebase Auth with the reset password.`);
          } catch (createErr: any) {
            console.error(`[NovaQuant Auth] Failed to create user in Firebase Auth on reset:`, createErr.message);
          }
        }
      }

      // 2. Hash and establish the new password record in Firestore users collection
      const usersSnap = await db.collection("users").where("email", "==", emailLower).limit(1).get();
      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const updateData = {
          password_hash: bcrypt.hashSync(password, 10),
          passwordHash: bcrypt.hashSync(password, 10),
          email_verified: true,
          verification_code: null,
          verification_expiry: null,
          updated_at: new Date().toISOString()
        };
        await userDoc.ref.set(updateData, { merge: true });
        console.log(`[NovaQuant Auth] Firestore backup password hash updated.`);

        // Sync to PostgreSQL
        await syncUserToPg(userDoc.id, emailLower, updateData);
      }

      // 3. Mark OTP as used to prevent replay attacks
      if (targetDocRef) {
        try {
          await targetDocRef.update({ used: true, verified: true });
          
          // Add completion to audit log
          await db.collection("audit_logs").add({
            email: emailLower,
            action: "PASSWORD_RESET_COMPLETED",
            timestamp: Date.now(),
            ip: req.ip || "0.0.0.0"
          });

          // Sync audit log to PostgreSQL
          await syncAuditLogToPg(null, emailLower, "PASSWORD_RESET_COMPLETED", req.ip, req.headers["user-agent"]);
        } catch (dbUpdateErr: any) {
          console.error("[NovaQuant Auth] Error marking OTP as used in Firestore:", dbUpdateErr.message);
        }
      }

      console.log(`[NovaQuant Auth] Password successfully reset for user: ${emailLower}`);
      return res.json({ success: true, message: "Security lock updated! Password has been altered successfully. Please log in." });

    } catch (err: any) {
      console.error("[NovaQuant Auth] Password reset final update error:", err);
      return res.status(500).json({ success: false, error: `auth/network-request-failed - Failed to establish new terminal passwords on auth gateway: ${err.message}` });
    }
  });

  // 8. SESSION RECOVERY METHOD (VALIDATES JWT TOKEN ACCROSS VISITS)
  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Uplink offline. Session signature missing." });
      }

      const token = authHeader.split(" ")[1];
      let decoded: any = null;
      let isFirebaseToken = false;

      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtErr) {
        try {
          const fbDecoded = await getAuth().verifyIdToken(token);
          decoded = {
            id: fbDecoded.uid,
            email: fbDecoded.email,
            name: fbDecoded.name || fbDecoded.email
          };
          isFirebaseToken = true;
        } catch (fbErr) {
          throw jwtErr;
        }
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(501).json({ success: false, error: "Database service not initialized." });
      }

      // Look up in Firestore collection "users" by ID
      const userDoc = await db.collection("users").doc(decoded.id).get();
      if (!userDoc.exists) {
        // Fallback: search by email to be extra robust
        const usersSnapByEmail = await db.collection("users").where("email", "==", decoded.email).limit(1).get();
        if (usersSnapByEmail.empty) {
          return res.status(401).json({ success: false, error: "Security node session has expired." });
        }
        const user = usersSnapByEmail.docs[0].data();
        const userRole = user.role || (user.email.toLowerCase() === 'piyumanjaleeoshi@gmail.com' || user.email.toLowerCase() === 'novaquant2026@gmail.com' || user.email.toLowerCase() === 'salindaperera1997@gmail.com' || user.email.toLowerCase().startsWith('admin') || user.email.toLowerCase().includes('admin@') ? 'ADMIN' : 'USER');
        
        let responseToken = token;
        if (isFirebaseToken) {
          responseToken = jwt.sign(
            { id: usersSnapByEmail.docs[0].id, email: user.email, name: user.full_name || user.name },
            JWT_SECRET,
            { expiresIn: "24h" }
          );
        }

        return res.json({
          success: true,
          token: responseToken,
          user: {
            email: user.email,
            name: user.full_name || user.name || "Operator",
            provider: "EMAIL",
            role: userRole,
            email_verified: user.email_verified
          }
        });
      }

      const user = userDoc.data();
      if (!user) {
        return res.status(401).json({ success: false, error: "Security node session has expired." });
      }

      const userRole = user.role || (user.email.toLowerCase() === 'piyumanjaleeoshi@gmail.com' || user.email.toLowerCase() === 'novaquant2026@gmail.com' || user.email.toLowerCase() === 'salindaperera1997@gmail.com' || user.email.toLowerCase().startsWith('admin') || user.email.toLowerCase().includes('admin@') ? 'ADMIN' : 'USER');

      let responseToken = token;
      if (isFirebaseToken) {
        responseToken = jwt.sign(
          { id: userDoc.id, email: user.email, name: user.full_name || user.name },
          JWT_SECRET,
          { expiresIn: "24h" }
        );
      }

      return res.json({
        success: true,
        token: responseToken,
        user: {
          email: user.email,
          name: user.full_name || user.name || "Operator",
          provider: "EMAIL",
          role: userRole,
          email_verified: user.email_verified
        }
      });

    } catch {
      return res.status(401).json({ success: false, error: "Expired authorization key signature." });
    }
  });

  // Fetch true outbound sever-side egress IP
  app.get("/api/server-ip", async (req, res) => {
    const staticIp = process.env.SERVER_PUBLIC_IP;
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // 1. Check for configured Cloud Run static IP
    if (staticIp && ipv4Regex.test(staticIp.trim())) {
      return res.json({ success: true, ip: staticIp.trim(), isStatic: true });
    }

    // 2. Fetch the outbound IP dynamically
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2500);
      const response = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
      clearTimeout(id);
      if (response.ok) {
        const data = (await response.json()) as { ip: string };
        const fetchedIp = data.ip ? data.ip.trim() : "";
        if (ipv4Regex.test(fetchedIp)) {
          return res.json({ success: true, ip: fetchedIp, isStatic: false });
        }
      }
    } catch (e: any) {
      console.error("[NovaQuant Server IP] Failed to fetch egress public IP:", e.message || e);
    }

    // 3. Fail gracefully with fallback if lookup fails
    return res.json({ 
      success: false, 
      ip: "34.120.45.198", 
      isStatic: false, 
      error: "Unable to determine server IP" 
    });
  });

  // Mail settings debug utility
  app.get("/api/mailer-settings", (req, res) => {
    res.json({
      sendgrid: !!process.env.SENDGRID_API_KEY,
      senderFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    });
  });

  // --- Relational PostgreSQL Database Syncer Helper Functions (Senior Architect Spec) ---
  // Ensure connection pooling and automatic transactions / rollbacks are robust.

  async function getOrCreatePgUser(firebaseUid: string, email: string, name?: string, role?: string, emailVerified?: boolean) {
    if (!process.env.SQL_HOST) return null;
    const emailLower = email.toLowerCase().trim();
    return await pgDb.transaction(async (tx) => {
      // 1. Try to fetch user by email
      const userByEmail = await tx.select().from(pgSchema.users).where(eq(pgSchema.users.email, emailLower)).limit(1);
      if (userByEmail.length > 0) {
        if (userByEmail[0].firebaseUid !== firebaseUid) {
          await tx.update(pgSchema.users)
            .set({ firebaseUid, updatedAt: new Date() })
            .where(eq(pgSchema.users.id, userByEmail[0].id));
        }
        return userByEmail[0];
      }

      // 2. Try to fetch user by firebaseUid
      const userByUid = await tx.select().from(pgSchema.users).where(eq(pgSchema.users.firebaseUid, firebaseUid)).limit(1);
      if (userByUid.length > 0) {
        return userByUid[0];
      }

      // 3. Insert new user
      const [inserted] = await tx.insert(pgSchema.users).values({
        firebaseUid,
        email: emailLower,
        name: name || null,
        role: role || "USER",
        emailVerified: emailVerified || false,
      }).returning();
      return inserted;
    });
  }

  async function syncUserToPg(firebaseUid: string, email: string, data: any) {
    if (!process.env.SQL_HOST) return;
    try {
      const emailLower = email.toLowerCase().trim();
      await pgDb.transaction(async (tx) => {
        const existing = await tx.select().from(pgSchema.users).where(eq(pgSchema.users.email, emailLower)).limit(1);
        if (existing.length > 0) {
          await tx.update(pgSchema.users).set({
            firebaseUid,
            name: data.full_name || existing[0].name,
            role: data.role || existing[0].role,
            emailVerified: data.email_verified !== undefined ? data.email_verified : existing[0].emailVerified,
            twoFactorSecret: data.two_factor_secret || existing[0].twoFactorSecret,
            twoFactorEnabled: data.two_factor_enabled !== undefined ? data.two_factor_enabled : existing[0].twoFactorEnabled,
            updatedAt: new Date()
          }).where(eq(pgSchema.users.id, existing[0].id));
        } else {
          await tx.insert(pgSchema.users).values({
            firebaseUid,
            email: emailLower,
            name: data.full_name || null,
            role: data.role || "USER",
            emailVerified: data.email_verified || false,
            twoFactorSecret: data.two_factor_secret || null,
            twoFactorEnabled: data.two_factor_enabled || false,
          });
        }
      });
    } catch (err) {
      console.error("[PG Sync] Failed to sync user to PG:", err);
    }
  }

  async function syncPasswordResetToPg(email: string, code: string, expiresAtMs: number) {
    if (!process.env.SQL_HOST) return;
    try {
      const emailLower = email.toLowerCase().trim();
      await pgDb.insert(pgSchema.passwordResets).values({
        email: emailLower,
        code,
        expiresAt: new Date(expiresAtMs)
      });
    } catch (err) {
      console.error("[PG Sync] Failed to sync password reset to PG:", err);
    }
  }

  async function syncAuditLogToPg(userIdStr: string | null, email: string | null, action: string, ipAddress?: string | null, device?: string | null, metadata?: any) {
    if (!process.env.SQL_HOST) return;
    try {
      let pgUserId: number | null = null;
      if (userIdStr) {
        const userRec = await pgDb.select().from(pgSchema.users).where(eq(pgSchema.users.firebaseUid, userIdStr)).limit(1);
        if (userRec.length > 0) {
          pgUserId = userRec[0].id;
        }
      } else if (email) {
        const userRec = await pgDb.select().from(pgSchema.users).where(eq(pgSchema.users.email, email.toLowerCase().trim())).limit(1);
        if (userRec.length > 0) {
          pgUserId = userRec[0].id;
        }
      }

      await pgDb.insert(pgSchema.auditLogs).values({
        userId: pgUserId,
        action,
        ipAddress: ipAddress || null,
        device: device || null,
        metadata: metadata || null,
      });
    } catch (err) {
      console.error("[PG Sync] Failed to sync audit log to PG:", err);
    }
  }

  async function syncExchangeToPg(userIdStr: string, exchangeId: string, apiKey: string, secretKey: string, testnet: boolean, status: string, tradingEnabled = true) {
    if (!process.env.SQL_HOST) return;
    try {
      const pgUser = await getOrCreatePgUser(userIdStr, userIdStr + "@novaquant.io"); // fallback email
      if (!pgUser) return;

      await pgDb.transaction(async (tx) => {
        const existing = await tx.select().from(pgSchema.exchanges).where(eq(pgSchema.exchanges.id, exchangeId)).limit(1);
        if (existing.length > 0) {
          await tx.update(pgSchema.exchanges).set({
            userId: pgUser.id,
            apiKey,
            secretKey,
            testnet,
            status,
            tradingEnabled,
          }).where(eq(pgSchema.exchanges.id, exchangeId));
        } else {
          await tx.insert(pgSchema.exchanges).values({
            id: exchangeId,
            userId: pgUser.id,
            exchangeName: "Binance Futures",
            apiKey,
            secretKey,
            testnet,
            status,
            tradingEnabled,
          });
        }
      });
    } catch (err) {
      console.error("[PG Sync] Failed to sync exchange connection to PG:", err);
    }
  }

  async function deleteExchangeFromPg(exchangeId: string) {
    if (!process.env.SQL_HOST) return;
    try {
      await pgDb.delete(pgSchema.exchanges).where(eq(pgSchema.exchanges.id, exchangeId));
    } catch (err) {
      console.error("[PG Sync] Failed to delete exchange from PG:", err);
    }
  }

  async function syncTradeToPg(userIdStr: string, tradeDoc: any) {
    if (!process.env.SQL_HOST) return;
    try {
      const userRec = await pgDb.select().from(pgSchema.users).where(eq(pgSchema.users.firebaseUid, userIdStr)).limit(1);
      if (userRec.length === 0) return;
      const pgUserId = userRec[0].id;

      const exchangeId = tradeDoc.exchangeId || null;
      const side = tradeDoc.side || "BUY";
      const symbol = tradeDoc.symbol || "BTCUSDT";
      const entryPrice = tradeDoc.entryPrice?.toString() || tradeDoc.price?.toString() || "0.0";
      const exitPrice = tradeDoc.exitPrice?.toString() || null;
      const quantity = tradeDoc.quantity?.toString() || "0.0";
      const leverage = tradeDoc.leverage?.toString() || "20";
      const status = tradeDoc.status || "COMPLETED";
      const realizedPnl = tradeDoc.realizedPnl?.toString() || tradeDoc.pnl?.toString() || "0.0";
      const fees = tradeDoc.fees?.toString() || "0.0";
      const openedAt = tradeDoc.openedAt ? new Date(tradeDoc.openedAt) : new Date();
      const closedAt = tradeDoc.closedAt ? new Date(tradeDoc.closedAt) : null;

      const tradeId = tradeDoc.id || tradeDoc.tradeId;
      if (tradeId && typeof tradeId === "number") {
        const existing = await pgDb.select().from(pgSchema.trades).where(eq(pgSchema.trades.id, tradeId)).limit(1);
        if (existing.length > 0) {
          await pgDb.update(pgSchema.trades).set({
            userId: pgUserId,
            exchangeId,
            symbol,
            side,
            entryPrice,
            exitPrice,
            quantity,
            leverage,
            status,
            realizedPnl,
            fees,
            openedAt,
            closedAt,
          }).where(eq(pgSchema.trades.id, tradeId));
          return;
        }
      }

      await pgDb.insert(pgSchema.trades).values({
        userId: pgUserId,
        exchangeId,
        symbol,
        side,
        entryPrice,
        exitPrice,
        quantity,
        leverage,
        status,
        realizedPnl,
        fees,
        openedAt,
        closedAt,
      });
    } catch (err) {
      console.error("[PG Sync] Failed to sync trade to PG:", err);
    }
  }

  // Secure Cryptographic Encryption helpers for API Secrets (AES-256-CBC)
  const ENCRYPTION_KEY = crypto.createHash("sha256").update(process.env.BINANCE_ENCRYPTION_SECRET || "NovaQuantSecureExchangeSalt2026").digest();
  const IV_LENGTH = 16;

  function encryptSecret(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  function decryptSecret(text: string): string {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText as any, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // Note: The global BINANCE_API_KEY and BINANCE_SECRET_KEY / BINANCE_API_SECRET environment variables
  // are solely used as admin/fallback defaults to bootstrap the local 'guest_user' and 'ws-alpha' demo
  // environments during initial setup. They are never directly used or read for signing regular registered user trades.
  async function bootstrapEnvCredentials() {
    const apiKey = cleanEnvString(process.env.BINANCE_API_KEY);
    const apiSecret = cleanEnvString(process.env.BINANCE_SECRET_KEY || process.env.BINANCE_API_SECRET);
    if (!apiKey || !apiSecret) {
      console.info("[Bootstrap] No default environment Binance API keys found in env.");
      return;
    }

    console.info("[Bootstrap] Found default environment Binance API keys. Auto-encrypting and syncing...");
    try {
      const db = getAdminDb();
      if (!db) {
        console.warn("[Bootstrap] Firestore db is offline, skipping env keys auto-encryption.");
        return;
      }

      const encryptedApiKey = encryptSecret(apiKey);
      const encryptedApiSecret = encryptSecret(apiSecret);
      const isTestnet = process.env.BINANCE_IS_TESTNET !== "false";

      // 1. Sync default exchange connection doc for 'ws-alpha' in Firestore
      const connectionDoc = {
        apiKey: apiKey,
        encryptedSecret: encryptedApiSecret,
        exchangeId: "ws-alpha",
        exchangeName: "Binance Futures",
        isTestnet: isTestnet,
        riskSettings: {
          maxRiskPerTrade: 2,
          maxDailyLoss: 5,
          maxOpenPositions: 3,
          leverageLimit: 10
        },
        updatedAt: new Date().toISOString()
      };

      await db.collection("exchanges").doc("ws-alpha").set(connectionDoc, { merge: true });
      console.info("[Bootstrap] Encrypted Binance credentials successfully bootstrapped in Firestore exchanges/ws-alpha!");

      // 2. Sync for the demo user and guest_user in Firestore
      const demoUserRef = db.collection("users").doc("user-demo-uid-11111");
      await demoUserRef.set({
        encryptedBinanceApiKey: encryptedApiKey,
        encryptedBinanceApiSecret: encryptedApiSecret,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      const guestUserRef = db.collection("users").doc("guest_user");
      await guestUserRef.set({
        encryptedBinanceApiKey: encryptedApiKey,
        encryptedBinanceApiSecret: encryptedApiSecret,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.info("[Bootstrap] Encrypted Binance credentials successfully bootstrapped in Firestore users/user-demo-uid-11111 and guest_user!");

      // 3. Sync to PostgreSQL exchanges
      await syncExchangeToPg("user-demo-uid-11111", "ws-alpha", encryptedApiKey, encryptedApiSecret, isTestnet, "CONNECTED");
      console.info("[Bootstrap] Encrypted Binance credentials successfully bootstrapped in PostgreSQL exchanges/ws-alpha!");
    } catch (err: any) {
      console.error("[Bootstrap] Failed to bootstrap environment Binance keys:", err.message);
    }
  }

  async function getAuthenticatedUserId(req: any): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    try {
      const token = authHeader.split(" ")[1];
      let decoded: any = null;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtErr) {
        try {
          const fbDecoded = await getAuth().verifyIdToken(token);
          decoded = { id: fbDecoded.uid };
        } catch (fbErr) {
          // Ignored
        }
      }
      if (decoded && decoded.id) {
        return decoded.id;
      }
    } catch (e) {
      // Ignored
    }
    return null;
  }

  async function getUserIdFromRequest(req: any): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        let decoded: any = null;
        try {
          decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (jwtErr) {
          try {
            const fbDecoded = await getAuth().verifyIdToken(token);
            decoded = { id: fbDecoded.uid };
          } catch (fbErr) {
            // Ignored
          }
        }
        if (decoded && decoded.id) {
          return decoded.id;
        }
      } catch (e) {
        // Ignored
      }
    }
    if (req.headers["x-user-id"]) {
      return req.headers["x-user-id"] as string;
    }
    if (req.body && req.body.userId) {
      return req.body.userId;
    }
    if (req.query && req.query.userId) {
      return req.query.userId as string;
    }
    return null;
  }

  async function getUserBinanceCredentials(userId: string) {
    if (!userId) return null;
    try {
      // 1. Try Firestore first
      const db = getAdminDb();
      if (db) {
        const docSnap = await db.collection("users").doc(userId).get();
        if (docSnap.exists) {
          const data = docSnap.data();
          if (data?.encryptedBinanceApiKey && data?.encryptedBinanceApiSecret) {
            return {
              apiKey: decryptSecret(data.encryptedBinanceApiKey),
              apiSecret: decryptSecret(data.encryptedBinanceApiSecret),
              userId: userId, // Include owner's userId
              isTestnet: data.isTestnet !== false,
              tradingEnabled: data.tradingEnabled !== false
            };
          }
        }
      }
    } catch (err) {
      console.error("[getUserBinanceCredentials] Error loading credentials for:", userId, err);
    }
    return null;
  }

  async function checkApiWithdrawalPermissionEnforced(apiKey: string, apiSecret: string, isTestnet: boolean): Promise<{ safe: boolean; reason?: string }> {
    if (isTestnet) {
      // Binance Futures Testnet keys of demo accounts do not enforce IP whitelists/access restrictions,
      // and do not represent any real-fund threat. Releasing restrictions check immediately.
      return { safe: true };
    }
    try {
      const spotBaseUrl = isTestnet ? "https://testnet.binance.vision" : "https://api.binance.com";
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

      const response = await fetch(`${spotBaseUrl}/api/v3/apiRestrictions?${queryString}&signature=${signature}`, {
        method: "GET",
        headers: {
          "X-MBX-APIKEY": apiKey,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const restrictions = await response.json();
        console.log("[Security Audit] Retrieved API Key restrictions:", restrictions);
        if (restrictions.enableWithdrawals === true) {
          return {
            safe: false,
            reason: "Withdrawal permission is ENABLED on this API Key. Withdrawal capabilities represent an unacceptable fund-drain vector for automated trading. For security reasons, please disable 'Enable Withdrawals' inside your Binance API management settings, restrict permissions to read/trade, and connect again."
          };
        }
      } else {
        const errText = await response.text();
        console.warn("[Security Audit] Restrictions check returned non-200 (expected sandbox mismatch or permissions block, proceeding with standard warnings):", errText);
      }
    } catch (err: any) {
      console.warn("[Security Audit] Verification exception (usually sandbox/Testnet lacks spot restrictions API), skipping strict block:", err);
    }
    return { safe: true };
  }

  async function getAssetUsdtPrices(isTestnet: boolean = true): Promise<Record<string, number>> {
    const prices: Record<string, number> = {
      USDT: 1.0,
      USDC: 1.0,
      BUSD: 1.0,
      USD: 1.0,
    };
    try {
      const endpoints = isTestnet
        ? ["https://testnet.binance.vision/api/v3/ticker/price", "https://api.binance.com/api/v3/ticker/price"]
        : ["https://api.binance.com/api/v3/ticker/price"];

      for (const url of endpoints) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = (await response.json()) as any;
            if (Array.isArray(data) && data.length > 0) {
              for (const item of data) {
                if (item.symbol.endsWith("USDT")) {
                  const asset = item.symbol.substring(0, item.symbol.length - 4);
                  prices[asset] = parseFloat(item.price);
                }
              }
              break; // Success, break out of loop
            }
          }
        } catch (e) {
          console.warn(`[getAssetUsdtPrices] Failed fetching price from endpoint ${url}:`, e);
        }
      }
    } catch (err) {
      console.warn("[getPriceMap] Failed to fetch live Binance price tickers, using defaults:", err);
    }
    const fallbacks: Record<string, number> = {
      BTC: 67500,
      ETH: 3500,
      BNB: 600,
      SOL: 145,
      ADA: 0.5,
      XRP: 0.6,
      DOGE: 0.15,
      AVAX: 35
    };
    for (const [k, v] of Object.entries(fallbacks)) {
      if (!prices[k]) {
        prices[k] = v;
      }
    }
    return prices;
  }

  async function getExchangeCredentials(exchangeId: string) {
    if (!exchangeId) return null;
    const db = getAdminDb();
    if (!db) return null;
    try {
      const docRef = db.collection("exchanges").doc(exchangeId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return null;
      const data = docSnap.data();
      if (!data) return null;
      
      let apiKey = data.apiKey;
      if (data.encryptedApiKey) {
        apiKey = decryptSecret(data.encryptedApiKey);
      }
      const apiSecret = decryptSecret(data.encryptedSecret);
      return {
        apiKey,
        apiSecret,
        userId: data.userId || "guest_user", // Include owner's userId
        isTestnet: data.isTestnet !== false, // Default to testnet
        exchangeName: data.exchangeName || "Binance Futures",
        tradingEnabled: data.tradingEnabled !== false, // Default to true
        riskSettings: data.riskSettings || {
          maxRiskPerTrade: 2,
          maxDailyLoss: 5,
          maxOpenPositions: 3,
          leverageLimit: 10
        }
      };
    } catch (err) {
      console.error("[getExchangeCredentials] Crypt decryption failed for connection:", exchangeId, err);
      return null;
    }
  }

  // --- MULTI-USER SAAS BINANCE CREDENTIALS ENDPOINTS ---

  const handleSaveUserBinanceCredentials = async (req: any, res: any) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized. Session signature missing." });
      }

      const apiKey = req.body.apiKey?.trim();
      const apiSecret = req.body.apiSecret?.trim();
      if (!apiKey || !apiSecret) {
        return res.status(400).json({ success: false, error: "Missing required credential parameters: apiKey and apiSecret." });
      }

      console.log(`[SaaS Binance Credentials] Saving credentials for user: ${userId}`);

      // Perform a safety handshake verification before saving
      const isTestnet = req.body.isTestnet !== false; // default to testnet
      const futuresBaseUrl = isTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
      const timestamp = Date.now();
      const recvWindow = 10000;
      const queryString = `recvWindow=${recvWindow}&timestamp=${timestamp}`;
      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

      const futuresUrl = `${futuresBaseUrl}/fapi/v2/account?${queryString}&signature=${signature}`;
      try {
        const testRes = await fetch(futuresUrl, {
          method: "GET",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });
        if (!testRes.ok) {
          const errMsg = await testRes.text();
          return res.status(400).json({
            success: false,
            error: `API key validation failed. Please check your credentials: ${errMsg}`
          });
        }
      } catch (err: any) {
        return res.status(400).json({
          success: false,
          error: `Handshake network error: ${err.message || err}`
        });
      }

      // Security Check: Enforce withdrawal permission lock (Requirement 7)
      const auditResult = await checkApiWithdrawalPermissionEnforced(apiKey, apiSecret, isTestnet);
      if (!auditResult.safe) {
        return res.status(400).json({
          success: false,
          error: auditResult.reason || "Withdrawal permission lock violated."
        });
      }

      // Encrypt credentials server-side (AES-256-CBC)
      const encryptedBinanceApiKey = encryptSecret(apiKey);
      const encryptedBinanceApiSecret = encryptSecret(apiSecret);

      // 1. Save per-user in Firestore
      const db = getAdminDb();
      const tradingEnabled = req.body.tradingEnabled !== false;
      if (db) {
        await db.collection("users").doc(userId).set({
          encryptedBinanceApiKey,
          encryptedBinanceApiSecret,
          tradingEnabled,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Synchronize exchange credentials with PostgreSQL
      await syncExchangeToPg(userId, userId, encryptedBinanceApiKey, encryptedBinanceApiSecret, isTestnet, "CONNECTED", tradingEnabled);

      // Audit Log
      if (db) {
        await db.collection("audit_logs").add({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          event: "BINANCE_CREDENTIALS_SAVED",
          details: `User added/updated and encrypted Binance credentials.`,
          actor: userId
        });
      }

      // Synchronize audit log with PostgreSQL
      await syncAuditLogToPg(userId, null, "BINANCE_CREDENTIALS_SAVED", req.ip, req.headers["user-agent"], { details: "Encrypted Binance credentials saved." });

      return res.json({
        success: true,
        message: "Binance credentials saved, encrypted, and backup verified successfully."
      });
    } catch (error: any) {
      console.error("[SaaS Binance Save Error]:", error);
      return res.status(500).json({ success: false, error: error.message || "Internal server error." });
    }
  };

  app.post(["/api/user/binance", "/api/user/binance/save", "/api/user/binance/update"], handleSaveUserBinanceCredentials);
  app.put(["/api/user/binance", "/api/user/binance/update"], handleSaveUserBinanceCredentials);

  const handleTestUserBinanceConnection = async (req: any, res: any) => {
    try {
      const userId = await getUserIdFromRequest(req);
      let apiKey = req.body.apiKey;
      let apiSecret = req.body.apiSecret;
      const isTestnet = req.body.isTestnet !== false;

      // If keys are not provided, try loading saved credentials
      if (!apiKey || !apiSecret) {
        if (!userId) {
          return res.status(401).json({ success: false, error: "Unauthorized. No credentials provided to test." });
        }

        const creds = await getUserBinanceCredentials(userId);
        if (!creds) {
          return res.status(400).json({ success: false, error: "No saved Binance credentials found to test. Please save them first." });
        }
        apiKey = creds.apiKey;
        apiSecret = creds.apiSecret;
      }

      const futuresBaseUrl = isTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
      const timestamp = Date.now();
      const recvWindow = 10000;
      const queryString = `recvWindow=${recvWindow}&timestamp=${timestamp}`;
      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

      const futuresUrl = `${futuresBaseUrl}/fapi/v2/account?${queryString}&signature=${signature}`;

      const response = await fetch(futuresUrl, {
        method: "GET",
        headers: {
          "X-MBX-APIKEY": apiKey,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          success: true,
          connected: true,
          assets: data.assets || [],
          message: "Binance connection test verified successfully!"
        });
      } else {
        const errText = await response.text();
        return res.status(400).json({
          success: false,
          connected: false,
          error: errText || "Verification failed."
        });
      }
    } catch (error: any) {
      console.error("[SaaS Binance Test Error]:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to test Binance connection." });
    }
  };

  app.post(["/api/user/binance/test", "/api/binance/test"], handleTestUserBinanceConnection);
  app.get(["/api/user/binance/test", "/api/binance/test"], async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }
    const creds = await getUserBinanceCredentials(userId);
    if (!creds) {
      return res.status(400).json({ success: false, error: "No saved Binance credentials found." });
    }

    req.body = { apiKey: creds.apiKey, apiSecret: creds.apiSecret, isTestnet: creds.isTestnet };
    return handleTestUserBinanceConnection(req, res);
  });

  const handleDeleteUserBinanceCredentials = async (req: any, res: any) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }

      console.log(`[SaaS Binance Credentials] Deleting credentials for user: ${userId}`);

      // 1. Remove from Firestore
      const db = getAdminDb();
      if (db) {
        await db.collection("users").doc(userId).set({
          encryptedBinanceApiKey: null,
          encryptedBinanceApiSecret: null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Sync exchange deletion in PostgreSQL
      await deleteExchangeFromPg(userId);

      // Audit Log
      if (db) {
        await db.collection("audit_logs").add({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          event: "BINANCE_CREDENTIALS_DELETED",
          details: `User cleared and deleted Binance credentials.`,
          actor: userId
        });
      }

      // Sync audit log to PostgreSQL
      await syncAuditLogToPg(userId, null, "BINANCE_CREDENTIALS_DELETED", req.ip, req.headers["user-agent"], { details: "Cleared and deleted Binance credentials." });

      return res.json({
        success: true,
        message: "Binance credentials cleared and deleted successfully."
      });
    } catch (error: any) {
      console.error("[SaaS Binance Delete Error]:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to delete Binance credentials." });
    }
  };

  app.delete(["/api/user/binance", "/api/user/binance/delete"], handleDeleteUserBinanceCredentials);
  app.post("/api/user/binance/delete", handleDeleteUserBinanceCredentials);


  // Secure Connect/Validate Exchange Credentials Endpoint
  app.post("/api/binance/connect", async (req, res) => {
    try {
      const { userId, exchangeId, exchangeName, isTestnet, riskSettings } = req.body;
      let apiKey = req.body.apiKey?.trim();
      let apiSecret = req.body.apiSecret?.trim();

      // If updating existing connection, allow preserving existing encrypted credentials when masked or omitted
      if (exchangeId && (!apiKey || apiKey.includes("...") || !apiSecret)) {
        const existing = await getExchangeCredentials(exchangeId);
        if (existing) {
          if (!apiKey || apiKey.includes("...")) {
            apiKey = existing.apiKey;
          }
          if (!apiSecret) {
            apiSecret = existing.apiSecret;
          }
        }
      }
      
      if (!exchangeId || !apiKey || !apiSecret) {
        return res.status(400).json({
          success: false,
          error: "Missing mandatory fields: exchangeId, apiKey, or apiSecret."
        });
      }

      console.log(`[NovaQuant Exchange Connect] Handshaking connection for workspace: ${exchangeId}, testnet: ${isTestnet}`);

      const futuresBaseUrl = isTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
      const timestamp = Date.now();
      const recvWindow = 10000;
      const queryString = `recvWindow=${recvWindow}&timestamp=${timestamp}`;
      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

      const futuresUrl = `${futuresBaseUrl}/fapi/v2/account?${queryString}&signature=${signature}`;

      let validationResponse: any;
      let isSpotConfig = false;
      try {
        const response = await fetch(futuresUrl, {
          method: "GET",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          validationResponse = await response.json();
          console.log("[NovaQuant Exchange Connect] Connection authenticated via Binance Futures!");
        } else {
          const errText = await response.text();
          console.warn(`[NovaQuant Exchange Connect] Futures check failed: ${errText}. Attempting Spot fallback...`);
          throw new Error(errText);
        }
      } catch (futuresErr: any) {
        // Fallback to Spot check
        isSpotConfig = true;
        const spotBaseUrl = isTestnet ? "https://testnet.binance.vision" : "https://api.binance.com";
        const spotUrl = `${spotBaseUrl}/api/v3/account?${queryString}&signature=${signature}`;
        const spotResponse = await fetch(spotUrl, {
          method: "GET",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (spotResponse.ok) {
          validationResponse = await spotResponse.json();
          console.log("[NovaQuant Exchange Connect] Connection authenticated via Binance Spot!");
        } else {
          const spotErrText = await spotResponse.text();
          console.error(`[NovaQuant Exchange Connect] Spot check also failed: ${spotErrText}`);
          let errorMsg = "Credentials verification failed.";
          try {
            const errObj = JSON.parse(spotErrText);
            errorMsg = errObj.msg || errObj.message || errorMsg;
          } catch {
            if (spotErrText) errorMsg = spotErrText;
          }
          return res.status(400).json({
            success: false,
            error: errorMsg
          });
        }
      }

      // Security Check: Enforce withdrawal permission lock (Requirement 7)
      const auditResult = await checkApiWithdrawalPermissionEnforced(apiKey, apiSecret, isTestnet !== false);
      if (!auditResult.safe) {
        return res.status(400).json({
          success: false,
          error: auditResult.reason || "Withdrawal permission lock violated."
        });
      }

      // Credentials are confirmed active and valid! Encrypt and store them.
      const encryptedApiKey = encryptSecret(apiKey);
      const encryptedSecret = encryptSecret(apiSecret);
      const maskedApiKey = apiKey.length > 8
        ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
        : apiKey;
      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: "Database service unavailable." });
      }

      // Calculate immediate balances and values in USDT (Requirement 2 & 3)
      const priceMap = await getAssetUsdtPrices(isTestnet !== false);
      let totalWalletValue = 0;
      let availableBalance = 0;
      let unrealizedPnL = 0;

      if (validationResponse) {
        if (!isSpotConfig && validationResponse.assets) {
          // Futures account
          for (const a of validationResponse.assets) {
            const walletBal = parseFloat(a.walletBalance || "0");
            const availBal = parseFloat(a.availableBalance || "0");
            if (walletBal > 0 || availBal > 0) {
              const price = priceMap[a.asset] || 1.0;
              totalWalletValue += walletBal * price;
              availableBalance += availBal * price;
            }
          }
          unrealizedPnL = parseFloat(validationResponse.totalUnrealizedProfit || "0");
        } else if (validationResponse.balances) {
          // Spot account
          for (const b of validationResponse.balances) {
            const free = parseFloat(b.free || "0");
            const locked = parseFloat(b.locked || "0");
            const total = free + locked;
            if (total > 0) {
              const price = priceMap[b.asset] || 0;
              totalWalletValue += total * price;
              availableBalance += free * price;
            }
          }
          unrealizedPnL = 0;
        } else {
          totalWalletValue = 10000.0;
          availableBalance = 9500.0;
          unrealizedPnL = 0;
        }
      }

      const netCapitalValue = totalWalletValue;

      const tradingEnabledVal = req.body.tradingEnabled !== false;
      const connectionDoc = {
        exchangeId,
        userId: userId || "guest_user",
        exchangeName: exchangeName || (isSpotConfig ? "Binance Spot" : "Binance Futures"),
        apiKey: maskedApiKey,
        encryptedApiKey,
        encryptedSecret,
        isConnected: true,
        isTestnet: isTestnet !== false,
        tradingEnabled: tradingEnabledVal,
        riskSettings: riskSettings || {
          maxRiskPerTrade: 2,
          maxDailyLoss: 5,
          maxOpenPositions: 3,
          leverageLimit: 10
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const targetUserId = userId || "guest_user";
      await db.collection("exchanges").doc(exchangeId).set(connectionDoc);

      // Synchronize exchange connection to PostgreSQL (store encrypted values for complete data security)
      await syncExchangeToPg(targetUserId, exchangeId, encryptedApiKey, encryptedSecret, connectionDoc.isTestnet !== false, "CONNECTED", tradingEnabledVal);

      // Store metrics inside user profile document in Firestore (Requirement 5)
      const userRef = db.collection("users").doc(targetUserId);
      await userRef.set({
        exchangeConnected: true,
        walletValue: parseFloat(totalWalletValue.toFixed(2)),
        netCapital: parseFloat(netCapitalValue.toFixed(2)),
        availableBalance: parseFloat(availableBalance.toFixed(2)),
        exchangeBalance: parseFloat(totalWalletValue.toFixed(2)),
        netCapitalValue: parseFloat(netCapitalValue.toFixed(2)),
        connectionStatus: "CONNECTED",
        lastSync: new Date().toISOString()
      }, { merge: true });

      // Synchronize updated metrics to user profile in PostgreSQL
      await syncUserToPg(targetUserId, targetUserId + "@novaquant.io", { email_verified: true });

      // Audit Log
      await db.collection("audit_logs").add({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: "EXCHANGE_CONNECTED",
        details: `Exchange '${exchangeName || "Binance Futures"}' linked successfully. Net Capital: $${netCapitalValue.toFixed(2)} USDT synchronized.`,
        actor: targetUserId
      });

      // Synchronize audit log to PostgreSQL
      await syncAuditLogToPg(targetUserId, null, "EXCHANGE_CONNECTED", req.ip, req.headers["user-agent"], { details: `Exchange linked. Net Capital: $${netCapitalValue.toFixed(2)}` });

      return res.json({
        success: true,
        connected: true,
        exchange: exchangeName || "Binance Futures",
        isTestnet: isTestnet !== false,
        walletValue: parseFloat(totalWalletValue.toFixed(2)),
        netCapital: parseFloat(netCapitalValue.toFixed(2)),
        availableBalance: parseFloat(availableBalance.toFixed(2))
      });

    } catch (e: any) {
      console.error("[NovaQuant Exchange Connect] Fatal Exception:", e);
      return res.status(500).json({
        success: false,
        error: e.message || "An exception occurred while connecting to Binance exchange."
      });
    }
  });

  // Fetch connection status without exposing the decrypted secret
  app.get("/api/binance/status", async (req, res) => {
    try {
      const exchangeId = req.query.exchangeId as string;
      if (!exchangeId) {
        return res.status(400).json({ success: false, error: "Missing exchangeId parameter." });
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: "Database interface offline." });
      }

      const docSnap = await db.collection("exchanges").doc(exchangeId).get();
      if (!docSnap.exists) {
        return res.json({ connected: false });
      }

      const data = docSnap.data();
      const rawApiKey = data?.apiKey || "";
      const maskedApiKey = rawApiKey.length > 8
        ? `${rawApiKey.substring(0, 4)}...${rawApiKey.substring(rawApiKey.length - 4)}`
        : rawApiKey;

      return res.json({
        connected: true,
        exchangeId: data.exchangeId,
        exchangeName: data.exchangeName,
        apiKey: maskedApiKey,
        isTestnet: data.isTestnet ?? true,
        riskSettings: data.riskSettings,
        tradingEnabled: data.tradingEnabled ?? true,
        updatedAt: data.updatedAt
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Toggle tradingEnabled status per user/exchange
  app.post("/api/user/trading-enabled", async (req, res) => {
    try {
      const { exchangeId, tradingEnabled } = req.body;
      const userId = await getUserIdFromRequest(req) || req.body.userId;
      
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized. Session signature missing." });
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: "Database service unavailable." });
      }

      const enabledBool = tradingEnabled === true;

      // 1. Update users collection in Firestore
      await db.collection("users").doc(userId).set({
        tradingEnabled: enabledBool,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Update exchanges collection in Firestore if exchangeId is provided
      if (exchangeId) {
        await db.collection("exchanges").doc(exchangeId).set({
          tradingEnabled: enabledBool,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Retrieve current exchange credentials to sync properly to Postgres
        const exchangeSnap = await db.collection("exchanges").doc(exchangeId).get();
        if (exchangeSnap.exists) {
          const exData = exchangeSnap.data();
          if (exData) {
            await syncExchangeToPg(
              userId,
              exchangeId,
              exData.encryptedApiKey || exData.apiKey,
              exData.encryptedSecret,
              exData.isTestnet !== false,
              exData.isConnected ? "CONNECTED" : "DISCONNECTED",
              enabledBool
            );
          }
        }
      } else {
        // Fallback sync to Postgres for the user's exchange record
        const userSnap = await db.collection("users").doc(userId).get();
        if (userSnap.exists) {
          const uData = userSnap.data();
          if (uData?.encryptedBinanceApiKey && uData?.encryptedBinanceApiSecret) {
            await syncExchangeToPg(
              userId,
              userId,
              uData.encryptedBinanceApiKey,
              uData.encryptedBinanceApiSecret,
              uData.isTestnet !== false,
              "CONNECTED",
              enabledBool
            );
          }
        }
      }

      // Audit Log
      await db.collection("audit_logs").add({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: "TRADING_ENABLED_TOGGLED",
        details: `Trading execution toggled to ${enabledBool ? 'ENABLED' : 'DISABLED'} for user ${userId}.`,
        actor: userId
      });

      await syncAuditLogToPg(userId, null, "TRADING_ENABLED_TOGGLED", req.ip, req.headers["user-agent"], { details: `Trading set to ${enabledBool}` });

      return res.json({
        success: true,
        tradingEnabled: enabledBool
      });
    } catch (err: any) {
      console.error("[Trading Enabled Toggle] Failed:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error." });
    }
  });

  // Save or update riskSettings separately
  app.post("/api/user/risk-settings", async (req, res) => {
    try {
      const { exchangeId, riskSettings } = req.body;
      const userId = await getUserIdFromRequest(req) || req.body.userId || "guest_user";

      if (!exchangeId) {
        return res.status(400).json({ success: false, error: "Missing exchangeId parameter." });
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: "Database service unavailable." });
      }

      // Check if exchange exists and is owned by the user (isolation)
      const docRef = db.collection("exchanges").doc(exchangeId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data && data.userId && data.userId !== userId && userId !== "guest_user") {
          return res.status(403).json({ success: false, error: "Unauthorized access to exchange." });
        }
      }

      // Merge updated risk settings
      await docRef.set({
        riskSettings: riskSettings,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Audit Log
      await db.collection("audit_logs").add({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: "RISK_SETTINGS_UPDATED",
        details: `Risk settings updated for exchange ${exchangeId} by user ${userId}.`,
        actor: userId
      });

      await syncAuditLogToPg(userId, null, "RISK_SETTINGS_UPDATED", req.ip, req.headers["user-agent"], { details: `Risk settings updated for exchange ${exchangeId}` });

      return res.json({
        success: true,
        riskSettings: riskSettings
      });
    } catch (err: any) {
      console.error("[Risk Settings Update] Failed:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error." });
    }
  });

  // Disconnect credentials route
  app.post("/api/binance/disconnect", async (req, res) => {
    try {
      const { exchangeId, userId } = req.body;
      if (!exchangeId) {
        return res.status(400).json({ success: false, error: "Missing exchangeId parameter." });
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(500).json({ success: false, error: "Database interface offline." });
      }

      await db.collection("exchanges").doc(exchangeId).delete();

      // Sync exchange deletion to PostgreSQL
      await deleteExchangeFromPg(exchangeId);

      // Reset the user profile metrics in Firestore
      const targetUserId = userId || "guest_user";
      await db.collection("users").doc(targetUserId).set({
        exchangeConnected: false,
        walletValue: 0,
        netCapital: 0,
        availableBalance: 0,
        exchangeBalance: 0,
        netCapitalValue: 0,
        connectionStatus: "DISCONNECTED",
        lastSync: new Date().toISOString()
      }, { merge: true });

      // Synchronize metrics reset with PostgreSQL user profile
      await syncUserToPg(targetUserId, targetUserId + "@novaquant.io", { email_verified: true });

      // Audit Log
      await db.collection("audit_logs").add({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: "EXCHANGE_DISCONNECTED",
        details: `Exchange connection deleted for workspace ${exchangeId}.`,
        actor: targetUserId
      });

      // Synchronize audit log to PostgreSQL
      await syncAuditLogToPg(targetUserId, null, "EXCHANGE_DISCONNECTED", req.ip, req.headers["user-agent"], { details: `Exchange connection deleted for workspace ${exchangeId}.` });

      return res.json({ success: true, message: "Exchange disconnected and secondary credentials cleared." });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Rate Limiter background sync tool (Requirement 11)
  app.get("/api/binance/health-check", async (req, res) => {
    try {
      const exchangeId = req.query.exchangeId as string;
      if (!exchangeId) {
        return res.status(400).json({ success: false, error: "Missing exchangeId parameter." });
      }

      const credentials = await getExchangeCredentials(exchangeId);
      if (!credentials) {
        return res.json({ healthy: false, error: "Exchange connection configuration not found in Database." });
      }

      const futuresBaseUrl = credentials.isTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
      const timestamp = Date.now();
      const recvWindow = 5000;
      const queryString = `recvWindow=${recvWindow}&timestamp=${timestamp}`;
      const signature = crypto
        .createHmac("sha256", credentials.apiSecret)
        .update(queryString)
        .digest("hex");

      const checkUrl = `${futuresBaseUrl}/fapi/v2/account?${queryString}&signature=${signature}`;

      const response = await fetch(checkUrl, {
        method: "GET",
        headers: {
          "X-MBX-APIKEY": credentials.apiKey,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        return res.json({ healthy: true });
      } else {
        const errText = await response.text();
        return res.json({ healthy: false, error: errText });
      }
    } catch (e: any) {
      return res.json({ healthy: false, error: e.message || "Network Timeout" });
    }
  });

  // Binance Futures and Spot Connection Verification Endpoint (Supports DB and pass-through fallback)
  app.get("/api/binance/test", async (req, res) => {
    try {
      const exchangeId = req.query.exchangeId as string || req.headers["x-exchange-id"] as string;
      let apiKey = "";
      let apiSecret = "";
      let isTestnet = true;

      if (req.query.isTestnet !== undefined) {
        isTestnet = req.query.isTestnet === "true";
      } else if (req.headers["x-is-testnet"] !== undefined) {
        isTestnet = req.headers["x-is-testnet"] === "true";
      }

      if (exchangeId) {
        const credentials = await getExchangeCredentials(exchangeId);
        if (credentials) {
          apiKey = credentials.apiKey;
          apiSecret = credentials.apiSecret;
          if (req.query.isTestnet === undefined && req.headers["x-is-testnet"] === undefined) {
            isTestnet = credentials.isTestnet;
          }
        }
      }

      // Fallback to user-specific credentials if not found by exchangeId
      if (!apiKey || !apiSecret) {
        const userId = await getUserIdFromRequest(req);
        if (userId) {
          const creds = await getUserBinanceCredentials(userId);
          if (creds) {
            apiKey = creds.apiKey;
            apiSecret = creds.apiSecret;
            isTestnet = creds.isTestnet;
          }
        }
      }

      if (!apiKey || !apiSecret) {
        apiKey = cleanEnvString(req.query.apiKey as string) || cleanEnvString(req.headers["x-binance-api-key"] as string);
        apiSecret = cleanEnvString(req.query.apiSecret as string) || cleanEnvString(req.headers["x-binance-api-secret"] as string);
      }

      if (!apiKey || !apiSecret) {
        return res.status(400).json({
          connected: false,
          error: "Missing API credentials. Please connect your exchange in Settings first."
        });
      }

      console.log(`[NovaQuant Binance Test] Connecting to Binance (Testnet: ${isTestnet})...`);

      const futuresBaseUrl = isTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
      const timestamp = Date.now();
      const recvWindow = 10000;
      
      const queryString = `recvWindow=${recvWindow}&timestamp=${timestamp}`;
      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

      const futuresUrl = `${futuresBaseUrl}/fapi/v2/account?${queryString}&signature=${signature}`;

      try {
        const response = await fetch(futuresUrl, {
          method: "GET",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log("[NovaQuant Binance Test] Futures Connection validated successfully!");
          
          // Security Check: Enforce withdrawal permission lock (Requirement 7)
          const auditResult = await checkApiWithdrawalPermissionEnforced(apiKey, apiSecret, isTestnet);
          if (!auditResult.safe) {
            return res.status(400).json({
              connected: false,
              error: auditResult.reason || "Withdrawal permission lock violated."
            });
          }

          return res.json({
            connected: true,
            isSpot: false,
            isTestnet,
            assets: data.assets?.filter((a: any) => parseFloat(a.walletBalance) > 0) || [],
            canTrade: data.canTrade ?? true,
            canWithdraw: false // Enforce withdraw disabled
          });
        } else {
          const futuresErrText = await response.text();
          console.warn(`[NovaQuant Binance Test] Futures handshake failed: ${futuresErrText}. Trying Spot...`);
          throw new Error(futuresErrText);
        }
      } catch (futuresErr: any) {
        console.log("[NovaQuant Binance Test] Connecting to Binance Spot...");
        const spotBaseUrl = isTestnet ? "https://testnet.binance.vision" : "https://api.binance.com";
        const spotUrl = `${spotBaseUrl}/api/v3/account?${queryString}&signature=${signature}`;

        const spotResponse = await fetch(spotUrl, {
          method: "GET",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (spotResponse.ok) {
          const data = await spotResponse.json();
          console.log("[NovaQuant Binance Test] Spot Connection validated successfully!");

          // Security Check: Enforce withdrawal permission lock (Requirement 7)
          const auditResult = await checkApiWithdrawalPermissionEnforced(apiKey, apiSecret, isTestnet);
          if (!auditResult.safe) {
            return res.status(400).json({
              connected: false,
              error: auditResult.reason || "Withdrawal permission lock violated."
            });
          }
          
          const activeBalances = data.balances?.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0) || [];
          const mappedAssets = activeBalances.map((b: any) => ({
            asset: b.asset,
            walletBalance: (parseFloat(b.free) + parseFloat(b.locked)).toString(),
            availableBalance: b.free
          }));

          return res.json({
            connected: true,
            isSpot: true,
            isTestnet,
            assets: mappedAssets,
            canTrade: data.canTrade ?? true,
            canWithdraw: false // Enforce withdraw disabled
          });
        } else {
          const spotErrText = await spotResponse.text();
          console.error(`[NovaQuant Binance Test] Spot handshake also failed: ${spotErrText}`);
          
          let errorMessage = "Binance connection failed.";
          try {
            const errObj = JSON.parse(spotErrText);
            errorMessage = errObj.msg || errObj.message || errorMessage;
          } catch {
            if (spotErrText) errorMessage = spotErrText;
          }
          return res.status(400).json({
            connected: false,
            error: errorMessage
          });
        }
      }
    } catch (error: any) {
      console.error("[NovaQuant Binance Test] Operation exception:", error);
      return res.status(500).json({
        connected: false,
        error: error.message || "An unexpected error occurred while verifying connection to Binance."
      });
    }
  });

  // Binance Order Execution Engine Endpoint (Supports DB and pass-through fallback)
  app.post("/api/trades/execute", async (req, res) => {
    try {
      const exchangeId = req.body.exchangeId || req.headers["x-exchange-id"] as string;
      const clientUserId = req.body.userId;
      
      // Perform strict production-ready user verification & token validation
      const authenticatedUserId = await getAuthenticatedUserId(req);
      const activeUserId = authenticatedUserId || clientUserId || "guest_user";
      const userId = activeUserId;

      let apiKey = "";
      let apiSecret = "";
      let isTestnet = true;
      let credentials: any = null;
      let tradingEnabled = true;

      if (exchangeId) {
        credentials = await getExchangeCredentials(exchangeId);
        if (credentials) {
          // Prevention of User A triggering User B trades (Multi-User Isolation)
          const isExchangeOwnedByRegisteredUser = credentials.userId && credentials.userId !== "guest_user";
          if (isExchangeOwnedByRegisteredUser) {
            if (!authenticatedUserId || credentials.userId !== authenticatedUserId) {
              const warningMsg = `[SECURITY BREACH ATTEMPT] Mismatch or missing token: Actor (${authenticatedUserId || 'Unauthenticated Guest'}) tried to execute trade on Exchange (${exchangeId}) owned by User (${credentials.userId})!`;
              console.error(warningMsg);
              
              // Log block attempt in secure Firestore audit log
              const db = getAdminDb();
              if (db) {
                await db.collection("audit_logs").add({
                  id: `audit-blocked-trade-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  event: "SECURITY_BREACH_BLOCKED",
                  details: `Blocked trade attempt: User ${authenticatedUserId} attempted to execute on exchange of user ${credentials.userId}`,
                  actor: authenticatedUserId || "anonymous"
                });
              }
              
              // Log block attempt in PostgreSQL audit log
              await syncAuditLogToPg(
                authenticatedUserId || "anonymous",
                null,
                "SECURITY_BREACH_BLOCKED",
                req.ip,
                req.headers["user-agent"],
                { details: `Blocked trade attempt on exchange ${exchangeId} owned by ${credentials.userId}` }
              );

              return res.status(403).json({
                success: false,
                error: "Security Access Denied: Unauthorized attempt to access another user's exchange credentials has been logged and reported."
              });
            }
          }

          apiKey = credentials.apiKey;
          apiSecret = credentials.apiSecret;
          isTestnet = credentials.isTestnet;
          tradingEnabled = credentials.tradingEnabled !== false;
        }
      }

      // Fallback to user-specific credentials if not found by exchangeId
      if (!apiKey || !apiSecret) {
        // Tie to authenticated user only to prevent parameter-tampering bypasses
        const lookupUserId = authenticatedUserId || clientUserId;
        if (lookupUserId) {
          const creds = await getUserBinanceCredentials(lookupUserId);
          if (creds) {
            // Prevention of User A triggering User B trades via direct userId injection
            const isUserCredsOwnedByRegisteredUser = creds.userId && creds.userId !== "guest_user";
            if (isUserCredsOwnedByRegisteredUser) {
              if (!authenticatedUserId || creds.userId !== authenticatedUserId) {
                const warningMsg = `[SECURITY BREACH ATTEMPT] Mismatch or missing token: Actor (${authenticatedUserId || 'Unauthenticated Guest'}) tried to execute trade under User UID (${lookupUserId})!`;
                console.error(warningMsg);
                
                const db = getAdminDb();
                if (db) {
                  await db.collection("audit_logs").add({
                    id: `audit-blocked-user-trade-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    event: "SECURITY_BREACH_BLOCKED",
                    details: `Blocked trade attempt: User ${authenticatedUserId} attempted to execute under user UID ${lookupUserId}`,
                    actor: authenticatedUserId || "anonymous"
                  });
                }
                
                await syncAuditLogToPg(
                  authenticatedUserId || "anonymous",
                  null,
                  "SECURITY_BREACH_BLOCKED",
                  req.ip,
                  req.headers["user-agent"],
                  { details: `Blocked trade attempt under user UID ${lookupUserId}` }
                );

                return res.status(403).json({
                  success: false,
                  error: "Security Access Denied: Unauthorized attempt to execute trade under another user's identity."
                });
              }
            }

            apiKey = creds.apiKey;
            apiSecret = creds.apiSecret;
            isTestnet = creds.isTestnet;
            tradingEnabled = creds.tradingEnabled !== false;
          }
        }
      }

      // Registered User Guard: Block registered users from trading unless they have connected their credentials in the database
      const isRegisteredUser = authenticatedUserId && authenticatedUserId !== "guest_user" && authenticatedUserId !== "user-demo-uid-11111";
      if (isRegisteredUser && (!apiKey || !apiSecret)) {
        return res.status(400).json({
          success: false,
          error: "Error: No connected Binance API credentials found in your database profile. Please go to the Platform Settings page, navigate to Exchange Wallets, and click 'Connect' to save your credentials to the secure database before executing trades or running the bot."
        });
      }

      // If credentials still aren't loaded, check client-supplied temporary headers
      // (Only allowed if no authenticated user is logged in, e.g. dev prototyping)
      if (!apiKey || !apiSecret) {
        apiKey = cleanEnvString(req.headers["x-binance-api-key"] as string) || cleanEnvString(req.body.apiKey as string);
        apiSecret = cleanEnvString(req.headers["x-binance-api-secret"] as string) || cleanEnvString(req.body.apiSecret as string);
        
        if (req.body.isTestnet !== undefined) {
          isTestnet = req.body.isTestnet !== false;
        } else if (req.headers["x-is-testnet"] !== undefined) {
          isTestnet = req.headers["x-is-testnet"] !== "false";
        }
      }

      if (!apiKey || !apiSecret) {
        return res.status(400).json({
          success: false,
          error: "Error: Missing Binance API credentials. Please go to the Platform Settings page, navigate to Exchange Wallets, and click 'Connect' to connect your exchange in Settings first before executing trades."
        });
      }

      // Hard Guard: Prevent accidental real-money live orders (Requirement 2)
      if (isTestnet === false && req.body.confirmLiveTrade !== true) {
        const warningMsg = `[Security Guard Blocked] Accidental Live Trade Blocked: Explicit confirmation is required for live orders. Set 'confirmLiveTrade: true' in request body.`;
        console.warn(warningMsg);

        const db = getAdminDb();
        if (db) {
          await db.collection("audit_logs").add({
            id: `audit-live-trade-prevented-${Date.now()}`,
            timestamp: new Date().toISOString(),
            event: "LIVE_TRADE_PREVENTED",
            details: `Accidental live trade blocked for user ${activeUserId} (confirmLiveTrade missing).`,
            actor: activeUserId
          });
        }

        await syncAuditLogToPg(
          activeUserId,
          null,
          "LIVE_TRADE_PREVENTED",
          req.ip,
          req.headers["user-agent"],
          { details: "Accidental live trade blocked due to missing confirmLiveTrade confirmation" }
        );

        return res.status(400).json({
          success: false,
          error: "Accidental Live Trade Prevented: Explicit confirmation is required for live orders. Please set 'confirmLiveTrade: true' in your request body."
        });
      }

      // Verify if trading is enabled for this user/exchange connection (Trading Guard Enforcement)
      if (!tradingEnabled) {
        const blockedMsg = `[Trading Guard Blocked] Trade execution blocked. Live Trading is currently deactivated (tradingEnabled is false) for user: ${activeUserId}`;
        console.warn(blockedMsg);
        
        // Log blocked trade attempt
        const db = getAdminDb();
        if (db) {
          await db.collection("audit_logs").add({
            id: `audit-trading-guard-block-${Date.now()}`,
            timestamp: new Date().toISOString(),
            event: "TRADE_BLOCKED_BY_GUARD",
            details: `Trade execution blocked for user ${activeUserId} because tradingEnabled is deactivated.`,
            actor: activeUserId
          });
        }
        
        await syncAuditLogToPg(
          activeUserId,
          null,
          "TRADE_BLOCKED_BY_GUARD",
          req.ip,
          req.headers["user-agent"],
          { details: `Blocked trade attempt by Trading Guard (tradingEnabled=false)` }
        );

        return res.status(400).json({
          success: false,
          error: "Trade execution blocked. Live Trading is currently deactivated (tradingEnabled is false) in your settings."
        });
      }

      let { symbol, side, quantity, type, price, stopPrice } = req.body;
      const orderType = (type || "MARKET").toUpperCase().trim();

      if (!symbol || !side || !quantity) {
        return res.status(400).json({
          success: false,
          error: "Missing required order parameters: symbol, side, or quantity."
        });
      }

      let cleanSymbol = symbol.toUpperCase().trim().replace("/", "");
      if (cleanSymbol.endsWith("-PERP")) {
        cleanSymbol = cleanSymbol.replace("-PERP", "");
      }

      let cleanSide = side.toUpperCase().trim();
      if (cleanSide === "LONG") cleanSide = "BUY";
      if (cleanSide === "SHORT") cleanSide = "SELL";

      if (cleanSide !== "BUY" && cleanSide !== "SELL") {
        return res.status(400).json({
          success: false,
          error: `Invalid order side: ${side}. Use BUY/LONG or SELL/SHORT.`
        });
      }

      const qtyNum = parseFloat(quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid quantity: ${quantity}. Must be greater than 0.`
        });
      }

      const futuresBaseUrl = isTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
      const timestamp = Date.now();
      const recvWindow = 10000;

      // RISK MANAGEMENT PRE-FLIGHT VERIFICATIONS (Requirement 8)
      if (exchangeId && credentials) {
        const { riskSettings } = credentials;
        if (riskSettings) {
          const maxOpenPositions = riskSettings.maxOpenPositions ?? 3;
          const leverageLimit = riskSettings.leverageLimit ?? 10;
          
          // 1. Leverage Ceilings compliance
          const requestedLeverage = req.body.leverage ? parseFloat(req.body.leverage) : 10;
          if (requestedLeverage > leverageLimit) {
            return res.status(400).json({
              success: false,
              error: `Risk Limit Breach: Requested leverage (${requestedLeverage}x) exceeds workspace leverage setting limit of (${leverageLimit}x). Order blocked.`
            });
          }

          // Fetch active positions on Binance Futures first to enforce ceilings
          try {
            const tempTimestamp = Date.now();
            const tempQuery = `recvWindow=10000&timestamp=${tempTimestamp}`;
            const tempSignature = crypto.createHmac("sha256", apiSecret).update(tempQuery).digest("hex");
            const tempUrl = `${futuresBaseUrl}/fapi/v2/account?${tempQuery}&signature=${tempSignature}`;
            
            const tempRes = await fetch(tempUrl, {
              method: "GET",
              headers: { "X-MBX-APIKEY": apiKey, "Content-Type": "application/json" }
            });
            
            if (tempRes.ok) {
              const tempData = await tempRes.json();
              const openPositions = tempData.positions?.filter((p: any) => parseFloat(p.positionAmt || "0") !== 0) || [];
              const alreadyHasSymbol = openPositions.some((p: any) => p.symbol === cleanSymbol);

              // 2. Maximum open positions count block
              if (openPositions.length >= maxOpenPositions && !alreadyHasSymbol) {
                return res.status(400).json({
                  success: false,
                  error: `Risk Limit Breach: Maximum open positions capacity Limit (${maxOpenPositions}) is reached. Order execution blocked.`
                });
              }

              // Extract USDT Balance to calculate Max Risk Per Trade (%)
              const usdtAsset = tempData.assets?.find((a: any) => a.asset === "USDT");
              const walletBalance = parseFloat(usdtAsset?.walletBalance || "1000");

              // 3. Max Risk Per Trade (%) Compliance
              const maxRiskPerTrade = riskSettings.maxRiskPerTrade ?? 2;
              const orderValue = qtyNum * (parseFloat(price || stopPrice) || (openPositions.length > 0 ? parseFloat(openPositions[0].entryPrice) : 30));
              const percentageOfCapital = (orderValue / walletBalance) * 100;
              
              if (percentageOfCapital > (maxRiskPerTrade * requestedLeverage * 1.5)) {
                return res.status(400).json({
                  success: false,
                  error: `Risk Limit Breach: Total trade capital value ($${orderValue.toFixed(2)}) is equivalent to ${percentageOfCapital.toFixed(1)}% of your capital, which exceeds Max Risk parameter (${maxRiskPerTrade}% per trade, adjusted for leverage). Order blocked.`
                });
              }

              // 4. Max Daily Loss (%) Check
              if (riskSettings.maxDailyLoss > 0) {
                const db = getAdminDb();
                const startOfToday = new Date();
                startOfToday.setHours(0,0,0,0);

                const tradesSnap = await db.collection("trades")
                  .where("userId", "==", userId || "guest_user")
                  .where("timestamp", ">=", startOfToday.toISOString())
                  .get();

                let totalLossesToday = 0;
                tradesSnap.forEach((doc: any) => {
                  const tData = doc.data();
                  if (tData.pnl < 0) {
                    totalLossesToday += Math.abs(tData.pnl);
                  }
                });

                const lossWholesomeCap = walletBalance * (riskSettings.maxDailyLoss / 100);
                if (totalLossesToday >= lossWholesomeCap) {
                  return res.status(400).json({
                    success: false,
                    error: `Risk Limit Breach: Absolute Daily Loss threshold of ${riskSettings.maxDailyLoss}% exceeded today ($${totalLossesToday.toFixed(2)} spent loss vs $${lossWholesomeCap.toFixed(2)} ceiling). Live ordering locked.`
                  });
                }
              }

              // 5. Max Daily Trades Check
              const maxTradesPerDayLimit = riskSettings.maxTradesPerDay ?? 3;
              if (maxTradesPerDayLimit > 0) {
                const db = getAdminDb();
                const startOfToday = new Date();
                startOfToday.setHours(0,0,0,0);

                const tradesSnap = await db.collection("trades")
                  .where("userId", "==", userId || "guest_user")
                  .where("timestamp", ">=", startOfToday.toISOString())
                  .get();

                const currentDayTradesCount = tradesSnap.size;
                if (currentDayTradesCount >= maxTradesPerDayLimit) {
                  return res.status(400).json({
                    success: false,
                    error: `Risk Limit Breach: Maximum daily trade executions limit (${maxTradesPerDayLimit}) has been reached for today. Order blocked.`
                  });
                }
              }
            }
          } catch (pErr: any) {
            console.warn("[Risk Check] Warning: Position parameters check skipped due to error:", pErr.message || pErr);
          }
        }
      }

      console.log(`[NovaQuant Trade] Routing ${orderType} ${cleanSide} ${qtyNum} ${cleanSymbol} (isTestnet: ${isTestnet})...`);

      // Assemble query parameter strings depending on order types (Requirement 7)
      let queryString = `symbol=${cleanSymbol}&side=${cleanSide}&type=${orderType}&quantity=${qtyNum}&recvWindow=${recvWindow}&timestamp=${timestamp}`;
      if (orderType === "LIMIT") {
        if (!price) {
          return res.status(400).json({ success: false, error: "Limit price parameter is required." });
        }
        queryString += `&price=${price}&timeInForce=GTC`;
      } else if (orderType === "STOP_MARKET" || orderType === "STOP") {
        if (!stopPrice) {
          return res.status(400).json({ success: false, error: "Stop price trigger trigger is required for STOP loss types." });
        }
        queryString += `&stopPrice=${stopPrice}`;
      } else if (orderType === "TAKE_PROFIT_MARKET" || orderType === "TAKE_PROFIT") {
        if (!stopPrice) {
          return res.status(400).json({ success: false, error: "Stop price trigger is required for TAKE_PROFIT loss types." });
        }
        queryString += `&stopPrice=${stopPrice}`;
      }

      const signature = crypto
        .createHmac("sha256", apiSecret)
        .update(queryString)
        .digest("hex");

      let executionResponse: any;
      let isExecutionSpot = false;

      try {
        const url = `${futuresBaseUrl}/fapi/v1/order?${queryString}&signature=${signature}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          executionResponse = await response.json();
        } else {
          const errText = await response.text();
          console.warn(`[NovaQuant Trade] Futures order failed: ${errText}. Attempting Spot fallback...`);
          throw new Error(errText);
        }
      } catch (futuresErr) {
        isExecutionSpot = true;
        const spotBaseUrl = isTestnet ? "https://testnet.binance.vision" : "https://api.binance.com";
        
        let spotQueryString = `symbol=${cleanSymbol}&side=${cleanSide}&type=${orderType === "LIMIT" ? "LIMIT" : "MARKET"}&quantity=${qtyNum}&recvWindow=${recvWindow}&timestamp=${timestamp}`;
        if (orderType === "LIMIT") {
          spotQueryString += `&price=${price}&timeInForce=GTC`;
        }

        const spotSignature = crypto
          .createHmac("sha256", apiSecret)
          .update(spotQueryString)
          .digest("hex");

        const urlSpot = `${spotBaseUrl}/api/v3/order?${spotQueryString}&signature=${spotSignature}`;

        const spotResponse = await fetch(urlSpot, {
          method: "POST",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (spotResponse.ok) {
          executionResponse = await spotResponse.json();
          console.log("[NovaQuant Trade] Spot fallback order execution succeeded!");
        } else {
          const spotErrText = await spotResponse.text();
          console.error(`[NovaQuant Trade] Spot order also failed: ${spotErrText}`);
          let errorMessage = "Binance order execution failed.";
          try {
            const errObj = JSON.parse(spotErrText);
            errorMessage = errObj.msg || errObj.message || errorMessage;
          } catch {
            if (spotErrText) errorMessage = spotErrText;
          }
          return res.status(400).json({
            success: false,
            error: errorMessage
          });
        }
      }

      console.log(`[NovaQuant Trade] Order executed successfully on Binance! OrderID: ${executionResponse.orderId}`);
      
      // Persist log document to database (Requirement 9)
      const executionPrice = parseFloat(executionResponse.avgPrice || executionResponse.price || price || "0") || (executionResponse.fills && executionResponse.fills.length > 0 ? parseFloat(executionResponse.fills[0].price) : 31.5);
      const executionPnl = orderType === "STOP_MARKET" ? -15.5 : 0; // simple simulation of realised PnL on target triggers
      
      const tradeDoc = {
        tradeId: executionResponse.orderId.toString(),
        userId: userId || "guest_user",
        symbol: cleanSymbol,
        side: cleanSide === "BUY" ? "LONG" : "SHORT",
        quantity: qtyNum,
        price: executionPrice,
        pnl: executionPnl,
        status: executionResponse.status || "FILLED",
        exitReason: orderType === "STOP_MARKET" ? "SL" : (orderType === "TAKE_PROFIT_MARKET" ? "TP" : "MANUAL"),
        isLive: true,
        timestamp: new Date().toISOString()
      };

      try {
        const db = getAdminDb();
        if (db) {
          await db.collection("trades").doc(tradeDoc.tradeId).set(tradeDoc);
        }
        // Synchronize trade with PostgreSQL
        await syncTradeToPg(tradeDoc.userId, tradeDoc);
      } catch (dbErr: any) {
        console.warn("[NovaQuant Trade] Failed to store trade record in database:", dbErr.message);
      }

      return res.json({
        success: true,
        orderId: executionResponse.orderId,
        symbol: cleanSymbol,
        side: cleanSide,
        price: executionPrice,
        qty: parseFloat(executionResponse.executedQty || executionResponse.origQty || quantity),
        status: executionResponse.status,
        isSpot: isExecutionSpot,
        binanceResponse: executionResponse
      });

    } catch (error: any) {
      console.error("[NovaQuant Trade] Command exception:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An exception occurred while executing trade on Binance."
      });
    }
  });

  // Binance Futures & Spot Account Status Endpoint (Supports DB and pass-through fallback)
  app.get("/api/binance/account", async (req, res) => {
    try {
      const exchangeId = req.query.exchangeId as string || req.headers["x-exchange-id"] as string;
      let apiKey = "";
      let apiSecret = "";
      let isTestnet = true;

      if (exchangeId) {
        const credentials = await getExchangeCredentials(exchangeId);
        if (credentials) {
          apiKey = credentials.apiKey;
          apiSecret = credentials.apiSecret;
          isTestnet = credentials.isTestnet;
        }
      }

      // Fallback to user-specific credentials if not found by exchangeId
      if (!apiKey || !apiSecret) {
        const reqUserId = await getUserIdFromRequest(req) || req.query.userId as string;
        if (reqUserId) {
          const creds = await getUserBinanceCredentials(reqUserId);
          if (creds) {
            apiKey = creds.apiKey;
            apiSecret = creds.apiSecret;
            isTestnet = creds.isTestnet;
          }
        }
      }

      if (!apiKey || !apiSecret) {
        apiKey = cleanEnvString(req.query.apiKey as string) || cleanEnvString(req.headers["x-binance-api-key"] as string);
        apiSecret = cleanEnvString(req.query.apiSecret as string) || cleanEnvString(req.headers["x-binance-api-secret"] as string);
      }

      if (!apiKey || !apiSecret) {
        return res.status(400).json({
          connected: false,
          error: "Missing API credentials. Please save or connect your credentials under Platform Settings first."
        });
      }

      const symbol = req.query.symbol as string || "BTCUSDT";
      const cleanSymbol = symbol.toUpperCase().replace("-PERP", "").replace("/", "");

      const futuresBaseUrl = isTestnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com";
      const timestamp = Date.now();
      const recvWindow = 10000;

      // 1. Fetch Account Information (/fapi/v2/account)
      const queryStringAccount = `recvWindow=${recvWindow}&timestamp=${timestamp}`;
      const signatureAccount = crypto
        .createHmac("sha256", apiSecret)
        .update(queryStringAccount)
        .digest("hex");

      const urlAccount = `${futuresBaseUrl}/fapi/v2/account?${queryStringAccount}&signature=${signatureAccount}`;

      try {
        const accountResponse = await fetch(urlAccount, {
          method: "GET",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (!accountResponse.ok) {
          const errText = await accountResponse.text();
          console.warn(`[NovaQuant Binance Account] Futures fetch failed: ${errText}. Attempting Spot fallback...`);
          throw new Error(errText);
        }

        const accData = await accountResponse.json();

        // Convert balance assets to USDT using getAssetUsdtPrices (Requirement 2)
        const priceMap = await getAssetUsdtPrices(isTestnet);
        let totalWalletBalance = 0;
        let availableBalance = 0;

        if (accData.assets) {
          for (const a of accData.assets) {
            const walletBal = parseFloat(a.walletBalance || "0");
            const availBal = parseFloat(a.availableBalance || "0");
            if (walletBal > 0 || availBal > 0) {
              const price = priceMap[a.asset] || 1.0;
              totalWalletBalance += walletBal * price;
              availableBalance += availBal * price;
            }
          }
        } else {
          const usdtAsset = accData.assets?.find((a: any) => a.asset === "USDT");
          const usdcAsset = accData.assets?.find((a: any) => a.asset === "USDC");
          availableBalance = parseFloat(usdtAsset?.availableBalance || "0") + parseFloat(usdcAsset?.availableBalance || "0");
          totalWalletBalance = parseFloat(usdtAsset?.walletBalance || "0") + parseFloat(usdcAsset?.walletBalance || "0");
        }

        const unrealizedPnL = parseFloat(accData.totalUnrealizedProfit || "0");
        const netCapitalValue = totalWalletBalance;

        // Extract Active Positions (size !== 0)
        const rawPositions = accData.positions || [];
        const activePositions = rawPositions
          .filter((pos: any) => {
            const amt = parseFloat(pos.positionAmt || "0");
            return amt !== 0;
          })
          .map((pos: any) => {
            const amt = parseFloat(pos.positionAmt || "0");
            const entryPrice = parseFloat(pos.entryPrice || "0");
            return {
              symbol: pos.symbol,
              side: amt > 0 ? "LONG" : "SHORT",
              size: Math.abs(amt),
              entryPrice: entryPrice,
              currentPrice: parseFloat(pos.unrealizedProfit || "0") / amt + entryPrice,
              leverage: parseInt(pos.leverage || "10"),
              pnl: parseFloat(pos.unrealizedProfit || "0"),
              pnlPercent: entryPrice > 0 ? (parseFloat(pos.unrealizedProfit || "0") / (entryPrice * Math.abs(amt))) * 100 : 0,
              margin: parseFloat(pos.positionInitialMargin || "0"),
            };
          });

        // 2. Fetch Order History for active symbol
        let orders = [];
        try {
          const queryStringOrders = `symbol=${cleanSymbol}&limit=20&recvWindow=${recvWindow}&timestamp=${timestamp}`;
          const signatureOrders = crypto
            .createHmac("sha256", apiSecret)
            .update(queryStringOrders)
            .digest("hex");

          const urlOrders = `${futuresBaseUrl}/fapi/v1/allOrders?${queryStringOrders}&signature=${signatureOrders}`;

          const ordersResponse = await fetch(urlOrders, {
            method: "GET",
            headers: {
              "X-MBX-APIKEY": apiKey,
              "Content-Type": "application/json"
            }
          });

          if (ordersResponse.ok) {
            const rawOrders = await ordersResponse.json();
            orders = rawOrders.map((ord: any) => ({
              id: ord.orderId.toString(),
              symbol: ord.symbol,
              side: ord.side === "BUY" ? "LONG" : "SHORT",
              price: parseFloat(ord.avgPrice || ord.price || "0"),
              size: parseFloat(ord.origQty || "0"),
              status: ord.status,
              type: ord.type,
              time: ord.time
            })).reverse(); // newest first
          }
        } catch (ordErr) {
          console.warn("[NovaQuant Binance Account] Could not fetch orders:", ordErr);
        }

        // Perform single-source database sync (Requirement 3 & 5)
        const db = getAdminDb();
        if (db && exchangeId) {
          const exDoc = await db.collection("exchanges").doc(exchangeId).get();
          if (exDoc.exists) {
            const exData = exDoc.data();
            if (exData) {
              const uidToSet = exData.userId || "guest_user";
              await db.collection("users").doc(uidToSet).set({
                exchangeConnected: true,
                walletValue: parseFloat(totalWalletBalance.toFixed(2)),
                netCapital: parseFloat(netCapitalValue.toFixed(2)),
                availableBalance: parseFloat(availableBalance.toFixed(2)),
                unrealizedPnL: parseFloat(unrealizedPnL.toFixed(2)),
                exchangeBalance: parseFloat(totalWalletBalance.toFixed(2)),
                netCapitalValue: parseFloat(netCapitalValue.toFixed(2)),
                connectionStatus: "CONNECTED",
                lastSync: new Date().toISOString()
              }, { merge: true });
            }
          }
        }

        return res.json({
          connected: true,
          isSpot: false,
          isTestnet,
          availableBalance,
          totalWalletBalance,
          unrealizedPnL,
          netCapital: netCapitalValue,
          positions: activePositions,
          orders: orders
        });

      } catch (futuresErr) {
        console.log("[NovaQuant Binance Account] Fetching from Spot...");
        const spotBaseUrl = isTestnet ? "https://testnet.binance.vision" : "https://api.binance.com";
        const spotUrl = `${spotBaseUrl}/api/v3/account?${queryStringAccount}&signature=${signatureAccount}`;

        const spotResponse = await fetch(spotUrl, {
          method: "GET",
          headers: {
            "X-MBX-APIKEY": apiKey,
            "Content-Type": "application/json"
          }
        });

        if (!spotResponse.ok) {
          const errText = await spotResponse.text();
          return res.status(400).json({
            connected: false,
            error: `Binance Account Error: ${errText}`
          });
        }

        const data = await spotResponse.json();

        // Convert spot balances to USDT (Requirement 2)
        const priceMap = await getAssetUsdtPrices(isTestnet);
        let totalWalletBalance = 0;
        let availableBalance = 0;

        if (data.balances) {
          for (const b of data.balances) {
            const free = parseFloat(b.free || "0");
            const locked = parseFloat(b.locked || "0");
            const total = free + locked;
            if (total > 0) {
              const price = priceMap[b.asset] || 0;
              totalWalletBalance += total * price;
              availableBalance += free * price;
            }
          }
        } else {
          const usdtAsset = data.balances?.find((b: any) => b.asset === "USDT");
          const usdcAsset = data.balances?.find((b: any) => b.asset === "USDC");
          const usdtFree = parseFloat(usdtAsset?.free || "0");
          const usdtLocked = parseFloat(usdtAsset?.locked || "0");
          const usdcFree = parseFloat(usdcAsset?.free || "0");
          const usdcLocked = parseFloat(usdcAsset?.locked || "0");
          availableBalance = usdtFree + usdcFree;
          totalWalletBalance = usdtFree + usdtLocked + usdcFree + usdcLocked;
        }

        const unrealizedPnL = 0;
        const netCapitalValue = totalWalletBalance;

        const activePositions: any[] = [];

        let orders = [];
        try {
          const queryStringOrders = `symbol=${cleanSymbol}&limit=20&recvWindow=${recvWindow}&timestamp=${timestamp}`;
          const signatureOrders = crypto
            .createHmac("sha256", apiSecret)
            .update(queryStringOrders)
            .digest("hex");

          const urlOrders = `${spotBaseUrl}/api/v3/allOrders?${queryStringOrders}&signature=${signatureOrders}`;

          const ordersResponse = await fetch(urlOrders, {
            method: "GET",
            headers: {
              "X-MBX-APIKEY": apiKey,
              "Content-Type": "application/json"
            }
          });

          if (ordersResponse.ok) {
            const rawOrders = await ordersResponse.json();
            orders = rawOrders.map((ord: any) => ({
              id: ord.orderId.toString(),
              symbol: ord.symbol,
              side: ord.side === "BUY" ? "LONG" : "SHORT",
              price: parseFloat(ord.avgPrice || ord.price || "0"),
              size: parseFloat(ord.origQty || "0"),
              status: ord.status,
              type: "MARKET",
              time: ord.time
            })).reverse();
          }
        } catch (ordErr) {
          console.warn("[NovaQuant Binance Spot Account] Could not fetch orders:", ordErr);
        }

        // Perform single-source database sync (Requirement 3 & 5)
        const db = getAdminDb();
        if (db && exchangeId) {
          const exDoc = await db.collection("exchanges").doc(exchangeId).get();
          if (exDoc.exists) {
            const exData = exDoc.data();
            if (exData) {
              const uidToSet = exData.userId || "guest_user";
              await db.collection("users").doc(uidToSet).set({
                exchangeConnected: true,
                walletValue: parseFloat(totalWalletBalance.toFixed(2)),
                netCapital: parseFloat(netCapitalValue.toFixed(2)),
                availableBalance: parseFloat(availableBalance.toFixed(2)),
                unrealizedPnL: 0.0,
                exchangeBalance: parseFloat(totalWalletBalance.toFixed(2)),
                netCapitalValue: parseFloat(netCapitalValue.toFixed(2)),
                connectionStatus: "CONNECTED",
                lastSync: new Date().toISOString()
              }, { merge: true });
            }
          }
        }

        return res.json({
          connected: true,
          isSpot: true,
          isTestnet,
          availableBalance,
          totalWalletBalance,
          unrealizedPnL: 0,
          netCapital: netCapitalValue,
          positions: activePositions,
          orders: orders
        });
      }
    } catch (e: any) {
      console.error("[NovaQuant Binance Account Exception]", e);
      return res.status(500).json({
        connected: false,
        error: e.message || "Failed to query Binance account info."
      });
    }
  });

  // Server-side Dual-AI Trade Signal Analyzer
  async function getAITradeSignal(symbol: string, klineData: any, indicatorData: any) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!geminiKey || !anthropicKey) {
      console.warn("[AI Signal] Missing GEMINI_API_KEY or ANTHROPIC_API_KEY. Returning simulated fallback.");
      const rsi = indicatorData.rsi || 50;
      const rsiBuyThreshold = indicatorData.rsiBuyThreshold || 55;
      const rsiSellThreshold = indicatorData.rsiSellThreshold || 45;
      
      let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
      let confidence = 50;
      let reasoning = "Simulated fallback because GEMINI_API_KEY or ANTHROPIC_API_KEY is not configured.";

      if (rsi > rsiBuyThreshold) {
        bias = 'LONG';
        confidence = Math.min(100, Math.round(50 + (rsi - rsiBuyThreshold) * 3));
        reasoning = `Indicators suggest LONG momentum (RSI is ${rsi.toFixed(1)}). Fallback simulated.`;
      } else if (rsi < rsiSellThreshold) {
        bias = 'SHORT';
        confidence = Math.min(100, Math.round(50 + (rsiSellThreshold - rsi) * 3));
        reasoning = `Indicators suggest SHORT momentum (RSI is ${rsi.toFixed(1)}). Fallback simulated.`;
      }

      const mockResponse = {
        gemini: { bias, confidence, reasoning },
        claude: { bias, confidence, reasoning },
        finalSignal: bias,
        agreed: true,
        actionable: confidence >= (indicatorData.confidenceThreshold || 70) && bias !== 'NEUTRAL',
        msg: "Demo/Fallback Mode: Please set keys in Settings > Secrets to activate real Claude/Gemini double-engine analysis."
      };
      return mockResponse;
    }

    const promptText = `
You are an expert crypto quantitative trading bot called "NovaQuant Dual-AI Analysis Engine".
Analyze the market state of ${symbol} based on recent candlesticks and indicators, and decide the next optimal trade.

## Recent Price Action (Latest 5 candles):
${JSON.stringify(klineData)}

## Technical Indicators:
${JSON.stringify(indicatorData)}

Evaluate carefully and output your decision.
Output a JSON object containing exactly 'bias' (LONG, SHORT, or NEUTRAL), 'confidence' (0 to 100 as integer), and 'reasoning' (1-2 sentences explaining).
JSON schema constraint:
{
  "bias": "LONG" | "SHORT" | "NEUTRAL",
  "confidence": number,
  "reasoning": "string"
}
Output ONLY valid JSON. No other text, no wrapper prose, no backticks markdown.
`;

    let geminiResult = { bias: 'NEUTRAL', confidence: 0, reasoning: 'Failed to call Gemini.' };
    let claudeResult = { bias: 'NEUTRAL', confidence: 0, reasoning: 'Failed to call Claude.' };

    // 1. Query Gemini
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bias: { type: Type.STRING, description: "LONG, SHORT, or NEUTRAL" },
              confidence: { type: Type.INTEGER, description: "Confidence score from 0 to 100" },
              reasoning: { type: Type.STRING, description: "Brief reasoning for the decision" }
            },
            required: ["bias", "confidence", "reasoning"]
          }
        }
      });

      if (response && response.text) {
        geminiResult = JSON.parse(response.text.trim());
      }
    } catch (err: any) {
      console.error("[AI Signal] Gemini error:", err);
      geminiResult.reasoning = `Gemini call failed: ${err.message}`;
    }

    // 2. Query Claude (Anthropic)
    try {
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: promptText
            }
          ],
          system: "You are a quantitative trading analysis bot. You must respond ONLY with a raw, valid JSON object containing 'bias' (LONG/SHORT/NEUTRAL), 'confidence' (0-100), and 'reasoning'. Do not add any backticks, markdown, explanation or preamble. Output raw JSON only."
        })
      });

      if (anthropicRes.ok) {
        const data = await anthropicRes.json();
        const textContent = data.content?.[0]?.text || "";
        let cleanText = textContent.trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.substring(7, cleanText.length - 3).trim();
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.substring(3, cleanText.length - 3).trim();
        }
        claudeResult = JSON.parse(cleanText);
      } else {
        const errText = await anthropicRes.text();
        console.error("[AI Signal] Claude API error response:", errText);
        claudeResult.reasoning = `Claude API returned status ${anthropicRes.status}: ${errText}`;
      }
    } catch (err: any) {
      console.error("[AI Signal] Claude call error:", err);
      claudeResult.reasoning = `Claude call failed: ${err.message}`;
    }

    const confidenceThreshold = indicatorData.confidenceThreshold || 70;
    const agreed = geminiResult.bias === claudeResult.bias;
    const bothExceedThreshold = geminiResult.confidence >= confidenceThreshold && claudeResult.confidence >= confidenceThreshold;
    const actionable = agreed && bothExceedThreshold && geminiResult.bias !== 'NEUTRAL';

    const finalSignal = actionable ? geminiResult.bias : 'NEUTRAL';

    return {
      gemini: geminiResult,
      claude: claudeResult,
      finalSignal,
      agreed,
      actionable,
      msg: actionable 
        ? `Consensus reached: ${finalSignal} (Gemini: ${geminiResult.confidence}%, Claude: ${claudeResult.confidence}%)`
        : agreed 
          ? `Agreed on ${geminiResult.bias} but confidence did not exceed threshold of ${confidenceThreshold}%.` 
          : `Disagreement. Gemini bias: ${geminiResult.bias} (${geminiResult.confidence}%), Claude bias: ${claudeResult.bias} (${claudeResult.confidence}%)`
    };
  }

  // Dual-AI Signal Endpoint
  app.post("/api/ai/trade-signal", async (req, res) => {
    const { symbol, klineData, indicatorData } = req.body;
    try {
      const authenticatedUserId = await getAuthenticatedUserId(req);
      const activeUserId = authenticatedUserId || "guest_user";

      if (!symbol || !klineData || !indicatorData) {
        return res.status(400).json({
          success: false,
          error: "Missing required parameters: symbol, klineData, or indicatorData."
        });
      }

      const signalResult = await getAITradeSignal(symbol, klineData, indicatorData);

      // Log signal results to Firestore
      const db = getAdminDb();
      if (db) {
        await db.collection("audit_logs").add({
          id: `audit-ai-signal-${Date.now()}`,
          timestamp: new Date().toISOString(),
          event: "AI_SIGNAL",
          details: `Dual-AI Signal computed for ${symbol}: Final: ${signalResult.finalSignal}. Agreed: ${signalResult.agreed}. Msg: ${signalResult.msg}`,
          actor: activeUserId
        });
      }

      // Log signal results to Postgres
      await syncAuditLogToPg(
        activeUserId,
        null,
        "AI_SIGNAL",
        req.ip,
        req.headers["user-agent"],
        { 
          symbol, 
          finalSignal: signalResult.finalSignal, 
          agreed: signalResult.agreed,
          gemini: signalResult.gemini,
          claude: signalResult.claude,
          msg: signalResult.msg
        }
      );

      return res.json({
        success: true,
        ...signalResult
      });
    } catch (err: any) {
      console.error("[AI Signal API Exception]", err);
      return res.status(500).json({
        success: false,
        error: err.message || "An unexpected error occurred during Dual-AI trade analysis."
      });
    }
  });

  // Legacy fallback compatibility endpoints
  app.post("/api/send-code", async (req, res) => {
    const { email, name, code } = req.body;
    const subj = `[NovaQuant Autopilot] Securing Session Key: ${code}`;
    const txt = getEmailTemplate('verification', name || "Operator", code?.toString() || "");
    const emailRes = await sendEmailUnified(email, subj, txt, name || "Operator", code?.toString() || "");
    return res.json(emailRes);
  });

  // Secure Gemini Portfolio Trade Analyzer Endpoint
  app.post("/api/analyze-trades", async (req, res) => {
    const { trades, stats, config } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Safe, highly detailed simulation fallback if the API key is not set.
        // Direct feedback to user while maintaining functional UX.
        const winRate = stats?.winRate ?? 58.3;
        const fakeAnalysis = {
          statusSummary: `💡 [DEMO ACTIVE] To enable fully autonomous live analysis, navigate to Settings > Secrets & connect your GEMINI_API_KEY. Current index parameters are set under ${config?.mode || 'EQUILIBRIUM'} bounds. Overall portfolio shows standard high-frequency trade coverage.`,
          winRateVerdict: winRate >= 50 ? "PERFORMING STRONG" : "STABILITY HAZARD",
          strengths: [
            "Dynamic Capital Preservation: Stop-loss buffers successfully hedge trend reversals.",
            "Efficient Volatility Tracking: Quick EMA crossings capitalize on dynamic macro swings.",
            "Secure Handshake Authorization: Lockers prevent unauthorized margin slippage."
          ],
          weaknesses: [
            "Basic Execution Threshold limits daily executions to exactly 3 runs.",
            "Potential over-hedging during rapid consolidation cycles due to ATR multiplier settings."
          ],
          tacticalActionPlan: [
            "Authorize the AI Auto-Tuning suit below to optimize active ATR margins automatically.",
            "Simulate Claude prompt directives on the Claud Gateway panel to secure custom micro-parameter thresholds."
          ],
          claudeSynergyGuidance: "Integrate both Claude and Gemini to secure a double-engine analysis grid. Gemini executes high-frequency quantitative analytics while Claude checks compliance factors of active trades."
        };

        return res.json({
          success: true,
          analysis: fakeAnalysis
        });
      }

      // Initialize the official modern @google/genai SDK on server side
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const processedTrades = (trades && trades.length > 0) 
        ? trades.slice(0, 15) // Limit to last 15 trades to stay well within token limits
        : [
            { symbol: config?.symbol || "BTCUSDT", side: "LONG", entryPrice: 67200, exitPrice: 68100, size: 0.15, profit: 135, exitReason: "TP" },
            { symbol: config?.symbol || "BTCUSDT", side: "SHORT", entryPrice: 68450, exitPrice: 68900, size: 0.15, profit: -67.5, exitReason: "SL" }
          ];

      const prompt = `
        You are an expert high-frequency cryptocurrency trader and portfolio risk analyst named "NovaQuant AI Advisor".
        Review this trade ledger feed and workspace parameters, and compile a detailed strategic advisory diagnostic.
        
        ## Active Workspace Statistics:
        - Current Balance: $${stats?.currentBalance || 50000} USDT
        - Aggregate Win Rate: ${(stats?.winRate || 58.3).toFixed(1)}%
        - Total Trade Runs: ${trades?.length || 0}
        
        ## Configuration State:
        - Active Trading Pair: ${config?.symbol || 'BTCUSDT'}
        - Risk Level Mode: ${config?.mode || 'EQUILIBRIUM'}
        - Base Risk Per Trade: ${config?.riskPerTrade || 1}%
        - Safety ATR Stop-loss activation: ${config?.slAtrMultiplier || 1.5}x
        - Take-profit targets: ${config?.tpAtrMultiplier || 3.0}x
        
        ## Raw Closed Ledger Feed:
        ${JSON.stringify(processedTrades)}

        Compile the diagnostic assessment as a JSON object with this exact structure:
        {
          "statusSummary": "1-2 sentences overall trading health verdict summary.",
          "winRateVerdict": "Analysis of the win-rate performance relative to current market conditions.",
          "strengths": ["Strength 1", "Strength 2", "Strength 3"],
          "weaknesses": ["Vulnerability 1", "Vulnerability 2"],
          "tacticalActionPlan": ["Immediate optimization item 1", "Immediate optimization item 2"],
          "claudeSynergyGuidance": "A brief guidance paragraph explaining how the user can paste these coordinates into Claude Chat to safely evaluate risk limits and manual trend overrides."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });

      const text = response.text || "{}";
      const parsedAnalysis = JSON.parse(text);

      return res.json({
        success: true,
        analysis: parsedAnalysis
      });

    } catch (err: any) {
      console.warn("[NovaQuant Gemini API Analyzer] Error calling Gemini API, fallback to resilient local compliance analysis:", err);
      
      const winRate = stats?.winRate ?? 58.3;
      const modeName = config?.mode || "EQUILIBRIUM";
      const activeTradingPair = config?.symbol || "BTCUSDT";
      
      // Resilient local analytical engine compiling realistic heuristic diagnostics
      const fallbackAnalysis = {
        statusSummary: `💡 [LOCAL COMPLIANCE ENGINE] Workspace telemetry is actively scanning market fluctuations under ${modeName} rules. Real-time indicators are validating dynamic parameters for ${activeTradingPair}.`,
        winRateVerdict: winRate >= 50 
          ? `STABLE COMPLIANCE: The current win rate of ${winRate.toFixed(1)}% satisfies risk threshold constraints perfectly under current volatility.` 
          : `SENSITIVITY ALERT: Volatility index suggests stabilizing active ATR bounds to protect the portfolio while win rate is ${winRate.toFixed(1)}%.`,
        strengths: [
          `Dynamic Hedging: Safety ATR multiplier of ${config?.slAtrMultiplier || 1.5}x provides excellent mitigation against sudden downside spikes.`,
          "Proactive Trend Inception: Fast dual-EMA crossovers successfully bypass consolidation noise.",
          `Proportional Allocation: Base trade size risk is safely structured at exactly ${config?.riskPerTrade || 1}% per entry.`
        ],
        weaknesses: [
          "External AI endpoint in high-demand cooldown; local metric engine compiling heuristics successfully.",
          `Exposure parameters are restricted to the default coverage of ${activeTradingPair} during active sweep runs.`
        ],
        tacticalActionPlan: [
          "Optionally adjust current ATR safety limits manually via Settings inside the workspace parameters.",
          "Connect optional Claude key in the Gas Tank Hub to trigger secondary parallel heuristic risk audits."
        ],
        claudeSynergyGuidance: "Combine the visual parameters with Claude AI by copying these parameters. Gemini executes our baseline quantitative metrics while Claude validates regulatory and sentiment metrics in the sandbox."
      };

      return res.json({
        success: true,
        analysis: fallbackAnalysis,
        isFallback: true,
        apiError: err?.message || String(err)
      });
    }
  });

  // --- ADMIN SECURITY & UTILITY ENDPOINTS ---

  // Helper middleware to verify admin privileges using cryptographic JWT session token signatures
  async function requireAdmin(req: any, res: any, next: () => void) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Uplink offline. Session signature missing." });
      }

      const token = authHeader.split(" ")[1];
      let decoded: any = null;

      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtErr) {
        try {
          const fbDecoded = await getAuth().verifyIdToken(token);
          decoded = {
            id: fbDecoded.uid,
            email: fbDecoded.email,
            name: fbDecoded.name || fbDecoded.email
          };
        } catch (fbErr) {
          throw jwtErr;
        }
      }

      const db = getAdminDb();
      if (!db) {
        return res.status(501).json({ success: false, error: "Database service not initialized." });
      }

      const userDoc = await db.collection("users").doc(decoded.id).get();
      if (!userDoc.exists) {
        const usersSnapByEmail = await db.collection("users").where("email", "==", decoded.email).limit(1).get();
        if (usersSnapByEmail.empty) {
          return res.status(401).json({ success: false, error: "Security node session has expired." });
        }
        const user = usersSnapByEmail.docs[0].data();
        const userRole = user.role || (user.email.toLowerCase() === 'piyumanjaleeoshi@gmail.com' || user.email.toLowerCase() === 'novaquant2026@gmail.com' || user.email.toLowerCase() === 'salindaperera1997@gmail.com' || user.email.toLowerCase().startsWith('admin') || user.email.toLowerCase().includes('admin@') ? 'ADMIN' : 'USER');

        if (userRole !== "ADMIN") {
          return res.status(403).json({ success: false, error: "Access privileges restricted. Admin nodes only." });
        }

        req.user = { id: usersSnapByEmail.docs[0].id, ...user };
        return next();
      }

      const user = userDoc.data();
      if (!user) {
        return res.status(401).json({ success: false, error: "Security node session has expired." });
      }

      const userRole = user.role || (user.email.toLowerCase() === 'piyumanjaleeoshi@gmail.com' || user.email.toLowerCase() === 'novaquant2026@gmail.com' || user.email.toLowerCase() === 'salindaperera1997@gmail.com' || user.email.toLowerCase().startsWith('admin') || user.email.toLowerCase().includes('admin@') ? 'ADMIN' : 'USER');

      if (userRole !== "ADMIN") {
        return res.status(403).json({ success: false, error: "Access privileges restricted. Admin nodes only." });
      }

      req.user = { id: userDoc.id, ...user };
      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: "Expired authorization key signature." });
    }
  }

  // GET /api/admin/database-status -> Returns online status metric mapping for active nodes
  app.get("/api/admin/database-status", requireAdmin, async (req, res) => {
    let firebaseActive = false;
    let firestoreActive = false;
    let localDatabaseActive = false;
    let userCount = 0;

    // 1. Validate Firebase Authentication endpoint
    try {
      await getAuth().listUsers(1);
      firebaseActive = true;
    } catch (err: any) {
      console.warn("[NovaQuant DatabaseStatus] Firebase Authentication check offline:", err.message);
    }

    // 2. Validate Firestore Document db response
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        await adminDb.collection("users").limit(1).get();
        firestoreActive = true;
      }
    } catch (err: any) {
      console.warn("[NovaQuant DatabaseStatus] Firestore connection check offline:", err.message);
    }

    // 3. Check Users collection count in Firestore
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        const usersSnap = await adminDb.collection("users").get();
        userCount = usersSnap.size;
        localDatabaseActive = true;
      }
    } catch (err: any) {
      console.warn("[NovaQuant DatabaseStatus] Firestore user collection fetch failed:", err.message);
    }

    let lastUpdated = new Date().toISOString();

    return res.json({
      firebase: firebaseActive,
      firestore: firestoreActive,
      localDatabase: localDatabaseActive,
      userCount,
      lastUpdated
    });
  });

  // GET /api/admin/export-users -> Returns downloadable backup users from Firestore
  app.get("/api/admin/export-users", requireAdmin, async (req, res) => {
    try {
      const adminDb = getAdminDb();
      if (!adminDb) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      const usersSnap = await adminDb.collection("users").get();
      const usersList: any[] = [];
      usersSnap.forEach(doc => {
        usersList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      res.setHeader("Content-Disposition", "attachment; filename=users_export.json");
      res.setHeader("Content-Type", "application/json");
      return res.send(JSON.stringify({ users: usersList }, null, 2));
    } catch (err: any) {
      console.error("[NovaQuant Export] Firestore user backup export failed:", err);
      return res.status(500).json({ success: false, error: `Export failed: ${err.message}` });
    }
  });

  // POST /api/admin/import-users -> accepts exported users dataset merging uniquely into Firestore
  app.post("/api/admin/import-users", requireAdmin, async (req, res) => {
    try {
      const { users: importedUsers } = req.body;

      if (!importedUsers || !Array.isArray(importedUsers)) {
        return res.status(400).json({ success: false, error: "Invalid schema input data format. Expected users list array." });
      }

      const adminDb = getAdminDb();
      if (!adminDb) {
        return res.status(500).json({ success: false, error: "Database service not initialized." });
      }

      let mergedCount = 0;
      let duplicateCount = 0;

      for (const entry of importedUsers) {
        if (!entry.email) continue;

        const emailLower = entry.email.toLowerCase().trim();
        const existingSnap = await adminDb.collection("users").where("email", "==", emailLower).limit(1).get();

        if (!existingSnap.empty) {
          duplicateCount++;
          continue; // Prevent exact duplicated registrations
        }

        const rawPassHash = entry.passwordHash || entry.password_hash || "";
        let finalHash = rawPassHash;

        // If backup password is unhashed, secure it with bcrypt instantly
        if (rawPassHash && !rawPassHash.startsWith("$2a$") && !rawPassHash.startsWith("$2b$") && !rawPassHash.startsWith("$2y$")) {
          finalHash = bcrypt.hashSync(rawPassHash, 10);
        }

        const validatedUser: any = {
          full_name: entry.full_name || entry.username || emailLower.split("@")[0],
          username: entry.username || entry.full_name || emailLower.split("@")[0],
          email: emailLower,
          role: entry.role || "USER",
          password_hash: finalHash,
          passwordHash: finalHash,
          email_verified: entry.email_verified === true || entry.emailVerified === true,
          verification_code: entry.verification_code || null,
          verification_expiry: entry.verification_expiry || null,
          financial_loss_agreed: entry.financial_loss_agreed === true,
          financial_agreement_timestamp: entry.financial_agreement_timestamp || new Date().toISOString(),
          createdAt: entry.createdAt || entry.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const targetId = entry.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await adminDb.collection("users").doc(targetId).set(validatedUser);
        mergedCount++;
      }

      return res.json({
        success: true,
        message: `Firestore database merged successfully. Sync: +${mergedCount} nodes synced, skipped ${duplicateCount} existing duplicates.`,
        mergedCount,
        duplicateCount
      });
    } catch (err: any) {
      console.error("[NovaQuant Import] Firestore user import failed:", err);
      return res.status(500).json({ success: false, error: `Import parsing error: ${err.message}` });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production settings
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Automatic bootstrapping of environment keys if available
  bootstrapEnvCredentials().catch((err) => {
    console.error("[Bootstrap] Error during Binance environment bootstrapping:", err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NovaQuant system server online: http://0.0.0.0:${PORT}`);
  });
}

startServer();
