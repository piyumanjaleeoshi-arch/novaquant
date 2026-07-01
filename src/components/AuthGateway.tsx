import React, { useState, useEffect } from 'react';
import { 
  Mail, Shield, Check, Loader2, ArrowRight, User, 
  ArrowLeft, Send, KeyRound, AlertTriangle, Info, 
  Lock, Eye, EyeOff, CheckCircle, XCircle, RefreshCw 
} from 'lucide-react';
import NovaQuantLogo from './NovaQuantLogo';
import emailjs from '@emailjs/browser';

// Firebase Client SDK imports
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { verifyTOTP } from '../utils/totp';

interface AuthGatewayProps {
  onLoginSuccess: (
    user: { email: string; name: string; provider: 'EMAIL' | 'GOOGLE' | 'TELEGRAM'; role?: string; email_verified?: boolean; uid?: string },
    token?: string
  ) => void;
  initialMode?: AuthMode;
  initialEmail?: string;
}

type AuthMode = 
  | 'login' 
  | 'signup' 
  | 'verify_email' 
  | 'forgot_password' 
  | 'verify_2fa';

export default function AuthGateway({ onLoginSuccess, initialMode, initialEmail }: AuthGatewayProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode || 'login');
  const [loading, setLoading] = useState<string | null>(null);

  // Synchronize dynamic initial states from application core state router
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setSignUpEmail(initialEmail);
    }
  }, [initialEmail]);
  
  // Security visual states
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfigBypass, setShowConfigBypass] = useState(false);

  const handleDeveloperBypass = (bypassEmail: string, bypassName: string) => {
    setSuccessMessage("⚡ Developer Sandbox clearance granted! Bypassing Cloud Authentication...");
    setTimeout(() => {
      const emailLower = bypassEmail.toLowerCase();
      const isAdminEmail = emailLower === 'piyumanjaleeoshi@gmail.com' || 
                           emailLower === 'novaquant2026@gmail.com';
      onLoginSuccess({
        email: bypassEmail,
        name: bypassName,
        provider: 'EMAIL',
        role: isAdminEmail ? 'ADMIN' : 'USER',
        email_verified: true,
        uid: 'dev_' + emailLower.replace(/[^a-zA-Z0-9]/g, '_')
      });
    }, 1200);
  };

  // 1. LOGIN STATES
  const [email, setEmail] = useState(() => {
    if (initialEmail) return initialEmail;
    try {
      return localStorage.getItem('novaquant_remember_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return !!localStorage.getItem('novaquant_remember_email');
    } catch {
      return false;
    }
  });

  // 2. SIGNUP STATES
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState(initialEmail || '');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpTerms, setSignUpTerms] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [financialLossAgreed, setFinancialLossAgreed] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  // 3. EMAIL VERIFICATION STATES
  const [verificationInput, setVerificationInput] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [codeExpiryTimer, setCodeExpiryTimer] = useState(600); // 10 minutes total TTL

  // 4. FORGOT PASSWORD STATES
  const [forgotEmail, setForgotEmail] = useState('');

  // 5. MFA / 2FA VERIFICATION STATES
  const [totpInput, setTotpInput] = useState('');
  const [tempMfaUser, setTempMfaUser] = useState<{
    email: string;
    name: string;
    provider: 'EMAIL' | 'GOOGLE' | 'TELEGRAM';
    role?: string;
    emailVerified?: boolean;
    uid: string;
    secret: string;
  } | null>(null);

  // Sandbox bypass fallback tracking for test/offline environments
  const [generatedBypassCode, setGeneratedBypassCode] = useState('');
  const [dispatchSimulated, setDispatchSimulated] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState('');
  const [bypassTimeRemaining, setBypassTimeRemaining] = useState(600);

  // Auto-disappear/hide simulated bypass OTP block after 10 minutes
  useEffect(() => {
    if (dispatchSimulated) {
      setBypassTimeRemaining(600);
    }
  }, [dispatchSimulated]);

  useEffect(() => {
    if (dispatchSimulated && bypassTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setBypassTimeRemaining(prev => {
          if (prev <= 1) {
            setDispatchSimulated(false);
            setGeneratedBypassCode('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [dispatchSimulated, bypassTimeRemaining]);

  // Cooldown countdown mechanism for resend buttons
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Code expiry countdown timer mechanism (10 minutes TTL)
  useEffect(() => {
    if (mode === 'verify_email') {
      setCodeExpiryTimer(600);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'verify_email' && codeExpiryTimer > 0) {
      const timer = setTimeout(() => setCodeExpiryTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [mode, codeExpiryTimer]);

  const formatExpiryTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Real-time password complexity check indices
  const metLength = signUpPassword.length >= 8;
  const metUppercase = /[A-Z]/.test(signUpPassword);
  const metLowercase = /[a-z]/.test(signUpPassword);
  const metNumber = /\d/.test(signUpPassword);
  const metSpecial = /[@$!%*?&._\-+=[\]{}()^#|\\/`~:;'"<>?]/.test(signUpPassword);
  const allPasswordMet = metLength && metUppercase && metLowercase && metNumber && metSpecial;

  // Clear messages on switching modes
  const handleModeChange = (newMode: AuthMode) => {
    setErrorMessage('');
    setSuccessMessage('');
    setDispatchFeedback('');
    setDispatchSimulated(false);
    setMode(newMode);
  };

  // Modern browser-side cryptographically secure SHA-256 implementation
  async function sha256(text: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // DISPATCH SECURE VERIFICATION CODE OTP VIA EMAILJS OR FALLBACK VISUAL PORTAL
  const dispatchOTP = async (targetName: string, targetEmail: string, otpCode: string): Promise<{ success: boolean; simulated: boolean; info?: string }> => {
    try {
      console.info(`[NovaQuant Auth] Launching EmailJS trigger for verification code to ${targetEmail}...`);
      
      const serviceId = (import.meta as any).env.VITE_EMAILJS_SERVICE_ID || "service_6sv5j2e";
      const templateId = (import.meta as any).env.VITE_EMAILJS_TEMPLATE_ID || "template_28a3th5";
      const publicKey = (import.meta as any).env.VITE_EMAILJS_PUBLIC_KEY || "CPU9ilX6q59CKkaq6";

      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: targetEmail.toLowerCase().trim(),
          to_name: targetName,
          otp_code: otpCode,
          app_name: 'NovaQuant AI Suite'
        },
        publicKey
      );

      return {
        success: true,
        simulated: false,
        info: "6-digit OTP passcode dispatched securely to your email address via EmailJS!"
      };
    } catch (err: any) {
      console.warn("[NovaQuant Auth] EmailJS delivery failed. Activating debug bypass portal fallback:", err);
      return {
        success: true,
        simulated: true,
        info: `EmailJS variables pending setup on your node. For quick review, copy this bypass OTP code: ${otpCode}`
      };
    }
  };

  // HANDLER A: LOGIN WITH FIREBASE AUTH + 2FA VERIFICATION REDIRECT
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading('login');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.info("[NovaQuant Auth] Submitting client credentials...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user profile from Firestore users collection
      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap = null;
      let isOfflineMode = false;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (dbErr: any) {
        console.warn("[NovaQuant Auth] Database fetch failed, checking offline status:", dbErr);
        const isOffline = (dbErr.message && (
                            dbErr.message.toLowerCase().includes('offline') || 
                            dbErr.message.toLowerCase().includes('client is offline') || 
                            dbErr.message.toLowerCase().includes('failed to get document') ||
                            dbErr.message.toLowerCase().includes('unavailable')
                          )) || 
                          dbErr.code === 'unavailable' ||
                          !navigator.onLine;
        if (isOffline) {
          isOfflineMode = true;
        } else {
          throw dbErr;
        }
      }

      let userData = null;
      if (userDocSnap && userDocSnap.exists()) {
        userData = userDocSnap.data();
        // Keep fallback updated
        localStorage.setItem(`user_profile_${email.toLowerCase().trim()}`, JSON.stringify(userData));
      } else {
        const localProfStr = localStorage.getItem(`user_profile_${email.toLowerCase().trim()}`);
        if (localProfStr) {
          userData = JSON.parse(localProfStr);
        } else if (isOfflineMode) {
          // If offline and no backup, provision standard offline profile, default verified to let them in
          userData = {
            uid: user.uid,
            fullName: user.displayName || 'Operator',
            email: email.toLowerCase().trim(),
            emailVerified: true,
            twoFactorEnabled: false
          };
          localStorage.setItem(`user_profile_${email.toLowerCase().trim()}`, JSON.stringify(userData));
        }
      }

      if (userData) {
        // Check A: Email Verification constraint check
        if (!userData.emailVerified) {
          // If unverified, generate OTP and demand verification screen redirect
          setSignUpEmail(email);
          setSignUpName(userData.fullName || 'Operator');
          setErrorMessage("This account is unverified. Dispatching 6-digit verification code...");

          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          const otpHash = await sha256(otpCode);

          // Store OTP state in Firestore under otp_verifications collection
          try {
            await setDoc(doc(db, 'otp_verifications', user.uid), {
              uid: user.uid,
              otpHash: otpHash,
              expiresAt: Date.now() + 10 * 60 * 1000, // 10 min TTL
              attempts: 0
            });
          } catch (otpErr: any) {
            console.warn("[NovaQuant Auth] Verification record save skipped due to offline state.", otpErr);
          }

          // Dispatch 
          const dispatchRes = await dispatchOTP(userData.fullName || 'Operator', email, otpCode);
          setDispatchSimulated(dispatchRes.simulated);
          setGeneratedBypassCode(otpCode);
          setDispatchFeedback(dispatchRes.info || '');
          setResendCountdown(15);

          setTimeout(() => {
            handleModeChange('verify_email');
          }, 1800);
          return;
        }

        // Check B: Multi-Factor Authentication (2FA) constraint check
        if (userData.twoFactorEnabled) {
          setTempMfaUser({
            email: user.email!,
            name: userData.fullName || "Operator",
            provider: 'EMAIL',
            role: userData.role || 'USER',
            emailVerified: true,
            uid: user.uid,
            secret: userData.twoFactorSecret
          });
          setSuccessMessage("Credentials matched. Google Authenticator 2FA key challenge generated!");
          setTimeout(() => {
            handleModeChange('verify_2fa');
          }, 1000);
          return;
        }

        // Standard Login Proceed
        setSuccessMessage("Authentication successful! Loading active dashboard...");
        if (rememberMe) {
          localStorage.setItem('novaquant_remember_email', email);
        } else {
          localStorage.removeItem('novaquant_remember_email');
        }

        setTimeout(() => {
          onLoginSuccess({
            email: user.email!,
            name: userData.fullName || user.displayName || "Operator",
            provider: 'EMAIL',
            role: userData.role || 'USER',
            email_verified: true,
            uid: user.uid
          });
        }, 1000);

      } else {
        // Doc missing? Auto-provision standard profile doc or set default
        const fullName = user.displayName || 'Operator';
        const userObj = {
          uid: user.uid,
          fullName: fullName,
          email: user.email!.toLowerCase().trim(),
          emailVerified: true, // fallback verified
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        try {
          await setDoc(userDocRef, userObj);
        } catch (dbErr: any) {
          console.warn("[NovaQuant Auth] Auto-provision write skipped due to offline state.", dbErr);
        }

        setSuccessMessage("Operator profile auto-provisioned. Redirecting to workspace...");
        setTimeout(() => {
          onLoginSuccess({
            email: user.email!,
            name: fullName,
            provider: 'EMAIL',
            role: 'USER',
            email_verified: true,
            uid: user.uid
          });
        }, 1000);
      }
    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        console.warn("[NovaQuant Auth] Local sandbox fallback activated due to missing/disabled Firebase Auth Provider configuration:", err);
        setSuccessMessage("⚡ Firebase Auth not configured. Launching Developer Sandbox bypass...");
        setTimeout(() => {
          const emailLower = email.toLowerCase().trim();
          const isAdminEmail = emailLower === 'piyumanjaleeoshi@gmail.com' || 
                               emailLower === 'novaquant2026@gmail.com';
          onLoginSuccess({
            email: email,
            name: email.split('@')[0] || 'Operator',
            provider: 'EMAIL',
            role: isAdminEmail ? 'ADMIN' : 'USER',
            email_verified: true,
            uid: 'bypass_' + emailLower.replace(/[^a-zA-Z0-9]/g, '_')
          });
        }, 1000);
        return;
      }
      console.error("[NovaQuant Auth] User log-in error:", err);
      let errMsg = "Invalid credentials. Please verify your email and pass key.";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errMsg = "Authentication failed. Invalid password passcode or unregistered profile.";
      } else if (err.code === 'auth/network-request-failed') {
        errMsg = "Local network signal failure. Please check terminal sockets.";
      } else {
        setShowConfigBypass(true);
        errMsg = err.message || errMsg;
      }
      setErrorMessage(errMsg);
    } finally {
      setLoading(null);
    }
  };

  // HANDLER B: REGISTRATION AND EMAIL VERIFICATION RECORD CREATION
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!signUpName) {
      setErrorMessage("Please input your full legal or corporate name.");
      return;
    }

    if (!signUpTerms) {
      setErrorMessage("You must agree with the terminal's risk disclosures.");
      return;
    }

    if (!allPasswordMet) {
      setErrorMessage("Pass key does not satisfy structural complexity ceilings.");
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    executeRegisterAfterAgreement();
  };

  const executeRegisterAfterAgreement = async () => {
    setLoading('signup');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.info("[NovaQuant Auth] Triggering Firebase account creation...");
      const userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
      const user = userCredential.user;

      await updateProfile(user, { displayName: signUpName });

      // Generate 6-digit OTP code 
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await sha256(otpCode);

      // Save local backup OTP code for potential offline situations
      localStorage.setItem(`otp_${signUpEmail.toLowerCase().trim()}`, JSON.stringify({
        otpCode: otpCode,
        otpHash: otpHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        signUpName: signUpName,
        uid: user.uid
      }));

      // 1. Save profile inside "users" collection
      const userProfile = {
        uid: user.uid,
        fullName: signUpName,
        email: signUpEmail.toLowerCase().trim(),
        emailVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        profile: {
          name: signUpName,
          email: signUpEmail.toLowerCase().trim(),
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        },
        subscription: {
          plan: 'Free',
          status: 'ACTIVE',
          startDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        exchange: {
          apiKey: '',
          apiSecret: '',
          isConnected: false
        },
        botSettings: {
          riskPerTrade: 1.5,
          trailingActivationMult: 1.2,
          leverageCeiling: 20,
          positionSizingMode: 'RISK',
          initialPositionAmount: 100
        },
        statistics: {
          totalPnL: 0,
          winRate: 0,
          tradesCount: 0
        }
      };
      
      try {
        await setDoc(doc(db, 'users', user.uid), userProfile);
      } catch (dbErr: any) {
        console.warn("[NovaQuant Auth] Failed to write user profile online, utilizing offline fallback layout:", dbErr);
      }
      
      localStorage.setItem(`user_profile_${signUpEmail.toLowerCase().trim()}`, JSON.stringify(userProfile));

      // 2. Save secure hashed verification parameters inside "otp_verifications" collection
      try {
        await setDoc(doc(db, 'otp_verifications', user.uid), {
          uid: user.uid,
          otpHash: otpHash,
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 min TTL
          attempts: 0
        });
      } catch (dbErr: any) {
        console.warn("[NovaQuant Auth] Failed to write OTP verification parameters online:", dbErr);
      }

      setSuccessMessage("Account created! Activating secure verification dispatch...");

      // 3. Dispatch code via EmailJS (with visual developer fallback)
      const dispatchRes = await dispatchOTP(signUpName, signUpEmail, otpCode);
      setDispatchSimulated(dispatchRes.simulated);
      setGeneratedBypassCode(otpCode);
      setDispatchFeedback(dispatchRes.info || '');
      setResendCountdown(15);

      setTimeout(() => {
        handleModeChange('verify_email');
      }, 1500);

    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        console.warn("[NovaQuant Auth] Local sandbox fallback activated during registration due to missing/disabled Firebase Auth Provider configuration:", err);
        setSuccessMessage("⚡ Firebase Auth not configured. Launching Developer Sandbox bypass...");
        setTimeout(() => {
          const emailLower = signUpEmail.toLowerCase().trim();
          const isAdminEmail = emailLower === 'piyumanjaleeoshi@gmail.com' || 
                               emailLower === 'novaquant2026@gmail.com';
          onLoginSuccess({
            email: signUpEmail,
            name: signUpName || 'Operator',
            provider: 'EMAIL',
            role: isAdminEmail ? 'ADMIN' : 'USER',
            email_verified: true,
            uid: 'bypass_' + emailLower.replace(/[^a-zA-Z0-9]/g, '_')
          });
        }, 1000);
        return;
      }
      console.error("[NovaQuant Auth] Sign up error:", err);
      let errMsg = "Account registration failed. Please try again.";
      if (err.code === 'email-already-in-use' || err.code === 'auth/email-already-in-use') {
        errMsg = "This email is already registered on our databases. Prefilling input box.";
        setEmail(signUpEmail);
      } else if (err.code === 'auth/weak-password') {
        errMsg = "Passcode strength too weak. Keep at least 6 characters.";
      } else {
        setShowConfigBypass(true);
        errMsg = err.message || errMsg;
      }
      setErrorMessage(errMsg);
    } finally {
      setLoading(null);
    }
  };  // HANDLER C: EMAIL OTP VERIFICATION WITH RETRY LIMIT CEILINGS
  const handleRegisterVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationInput) return;

    setLoading('verifying_otp');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let targetUid = "";
      let isAnonymousSubmission = false;
      const currentUser = auth.currentUser;

      if (!currentUser) {
        const userEmailToQuery = (signUpEmail || "").trim().toLowerCase();
        if (!userEmailToQuery) {
          throw new Error("Please enter your registered email address.");
        }
        
        isAnonymousSubmission = true;
        
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', userEmailToQuery));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            throw new Error(`No registered profile matching email address "${userEmailToQuery}" was found.`);
          }
          
          const userDoc = querySnapshot.docs[0];
          targetUid = userDoc.id;
        } catch (dbErr: any) {
          const isOffline = (dbErr.message && (
                              dbErr.message.toLowerCase().includes('offline') || 
                              dbErr.message.toLowerCase().includes('client is offline') || 
                              dbErr.message.toLowerCase().includes('failed to get document') ||
                              dbErr.message.toLowerCase().includes('unavailable')
                            )) || 
                            dbErr.code === 'unavailable' ||
                            !navigator.onLine;
          if (isOffline) {
            // Offline fallback: Use locally saved uid
            const targetEmail = userEmailToQuery.trim().toLowerCase();
            const localDataStr = localStorage.getItem(`otp_${targetEmail}`);
            const localData = localDataStr ? JSON.parse(localDataStr) : null;
            if (localData && localData.uid) {
              targetUid = localData.uid;
            } else {
              targetUid = "offline_user_id";
            }
          } else {
            throw dbErr;
          }
        }
      } else {
        targetUid = currentUser.uid;
      }

      // Check for offline capability before reading/updating Firestore
      const targetEmail = (currentUser?.email || signUpEmail || "").trim().toLowerCase();
      const localDataStr = localStorage.getItem(`otp_${targetEmail}`);
      const localData = localDataStr ? JSON.parse(localDataStr) : null;

      try {
        const verifyRef = doc(db, 'otp_verifications', targetUid);
        const verifySnap = await getDoc(verifyRef);

        if (!verifySnap.exists()) {
          throw new Error("No verification code records matched on servers. Please request a new OTP code.");
        }

        const verifyData = verifySnap.data();

        // Check Expiration
        if (Date.now() > verifyData.expiresAt) {
          throw new Error("This verification passcode has expired. Please click Resend Code.");
        }

        // Check max attempt ceilings
        if (verifyData.attempts >= 5) {
          throw new Error("Maximum 5 incorrect attempts exceeded. De-authorizing code block. Request a fresh OTP.");
        }

        // Compute and match SHA-256 OTP hashes
        const inputHash = await sha256(verificationInput.trim());
        if (inputHash !== verifyData.otpHash) {
          // Increment attempts tracker
          const nextAttemptsCount = verifyData.attempts + 1;
          await updateDoc(verifyRef, {
            attempts: nextAttemptsCount
          });

          throw new Error(`Invalid verification passcode. Attempts matching counter: ${nextAttemptsCount}/5`);
        }

        // Handshake Success -> Enforce status update in Users profile
        await updateDoc(doc(db, 'users', targetUid), {
          emailVerified: true
        });

        // Set local storage verified flag
        localStorage.setItem(`user_verified_${targetEmail}`, 'true');

        // Clear the verification session doc securely to save DB space
        await deleteDoc(verifyRef);

      } catch (innerErr: any) {
        // If it's a structural offline exception, try offline fallback verification
        const isOffline = (innerErr.message && (
                            innerErr.message.toLowerCase().includes('offline') || 
                            innerErr.message.toLowerCase().includes('client is offline') || 
                            innerErr.message.toLowerCase().includes('failed to get document') ||
                            innerErr.message.toLowerCase().includes('unavailable')
                          )) || 
                          innerErr.code === 'unavailable' ||
                          !navigator.onLine;
        if (isOffline) {
          const backupCode = localData?.otpCode || generatedBypassCode;
          if (backupCode && verificationInput.trim() === backupCode) {
            console.warn("[NovaQuant] Verified successfully via offline local backup!");
            localStorage.setItem(`user_verified_${targetEmail}`, 'true');
          } else {
            throw new Error("Failed to connect to verification servers (client is offline). Please enter the correct verification code to authenticate offline.");
          }
        } else {
          throw innerErr;
        }
      }

      if (isAnonymousSubmission) {
        setSuccessMessage("Handshake completed successfully! Your email has been verified. Redirecting to signature sign-in...");
        setTimeout(() => {
          setEmail(signUpEmail);
          setMode('login');
        }, 2200);
      } else {
        setSuccessMessage("Handshake completed successfully! Redirecting to secure terminal...");
        let displayName = signUpName;
        try {
          const userRef = doc(db, 'users', targetUid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            displayName = userDoc.data().fullName || displayName;
          }
        } catch {
          // offline, ignore
        }

        setTimeout(() => {
          onLoginSuccess({
            email: currentUser!.email!,
            name: displayName || currentUser!.displayName || "Operator",
            provider: 'EMAIL',
            role: 'USER',
            email_verified: true,
            uid: targetUid
          });
        }, 1500);
      }

    } catch (err: any) {
      console.error("[NovaQuant] Handshake verification error:", err);
      setErrorMessage(err.message || "Failed resolving secure verification check.");
    } finally {
      setLoading(null);
    }
  };

  // HANDLER D: OTP COOLDOWN TRIGGER DISPATCH
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setLoading('resending_otp');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Unable to establish active auth mapping.");
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await sha256(otpCode);

      // Save local backup OTP code for potential offline situations
      localStorage.setItem(`otp_${currentUser.email!.toLowerCase().trim()}`, JSON.stringify({
        otpCode: otpCode,
        otpHash: otpHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        signUpName: "", // will look up fullName if exists
        uid: currentUser.uid
      }));

      // Reset record inside Firestore under otp_verifications collection
      try {
        await setDoc(doc(db, 'otp_verifications', currentUser.uid), {
          uid: currentUser.uid,
          otpHash: otpHash,
          expiresAt: Date.now() + 10 * 60 * 1000,
          attempts: 0
        });
      } catch (dbErr: any) {
        console.warn("[NovaQuant Auth] Resend OTP registration on server code skipped offline", dbErr);
      }

      let userName = "Operator";
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        userName = userDoc.exists() ? userDoc.data().fullName : "Operator";
      } catch {
        // Fallback to name in local profile
        const localProfStr = localStorage.getItem(`user_profile_${currentUser.email!.toLowerCase().trim()}`);
        if (localProfStr) {
          const lp = JSON.parse(localProfStr);
          userName = lp.fullName || userName;
        }
      }

      // Send EmailJS 
      const dispatchRes = await dispatchOTP(userName, currentUser.email!, otpCode);
      setDispatchSimulated(dispatchRes.simulated);
      setGeneratedBypassCode(otpCode);
      setDispatchFeedback(dispatchRes.info || '');
      setSuccessMessage(`passcode successfully resent! TTL: 10 minutes.`);
      setResendCountdown(15);

    } catch (err: any) {
      console.error("[Resend Attempt Aborted]", err);
      setErrorMessage(err.message || 'Error executing OTP verification send.');
    } finally {
      setLoading(null);
    }
  };

  // HANDLER E: PASSWORD FORGOTTEN TRIGGERS (STANDARD AUTH SERVICES)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setLoading('forgot');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.info(`[NovaQuant Auth] Submitting standard password recovery link to: ${forgotEmail}...`);
      await sendPasswordResetEmail(auth, forgotEmail.toLowerCase().trim());
      setSuccessMessage("A cryptographic password recovery link has been dispatched to your email coordinates!");
    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        console.warn("[ForgotPassword Error] Local sandbox fallback activated due to missing/disabled Firebase Auth Provider configuration.");
        setSuccessMessage("⚡ Developer Sandbox bypass: Recovery link simulated. Loading platform...");
        setTimeout(() => {
          const emailLower = forgotEmail.toLowerCase().trim();
          const isAdminEmail = emailLower === 'piyumanjaleeoshi@gmail.com' || 
                               emailLower === 'novaquant2026@gmail.com';
          onLoginSuccess({
            email: forgotEmail,
            name: forgotEmail.split('@')[0] || 'Operator',
            provider: 'EMAIL',
            role: isAdminEmail ? 'ADMIN' : 'USER',
            email_verified: true,
            uid: 'bypass_' + emailLower.replace(/[^a-zA-Z0-9]/g, '_')
          });
        }, 1000);
        return;
      }
      console.error("[ForgotPassword Error]", err);
      let errMsg = "Failed resetting account credentials. Please verify your address is registered on our servers.";
      if (err.code === 'auth/user-not-found') {
        errMsg = "No profile matched inside our databases.";
        setShowConfigBypass(true);
      } else {
        setShowConfigBypass(true);
        errMsg = err.message || errMsg;
      }
      setErrorMessage(errMsg);
    } finally {
      setLoading(null);
    }
  };

  // HANDLER F: REAL GOOGLE POPUP AUTHENTICATION SIGN IN
  const handleGoogleLogin = async () => {
    setLoading('google');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.info("[NovaQuant Auth] Spawning Google login authorization popup...");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userData: any = null;
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
      } else {
        // Automatically create and index profile mapping inside users collection
        userData = {
          uid: user.uid,
          fullName: user.displayName || 'Google Operator',
          email: user.email!.toLowerCase().trim(),
          emailVerified: true, // OAuth is implicit verification
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          profile: {
            name: user.displayName || 'Google Operator',
            email: user.email!.toLowerCase().trim(),
            photoURL: user.photoURL || '',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          },
          subscription: {
            plan: 'Free',
            status: 'ACTIVE',
            startDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          exchange: {
            apiKey: '',
            apiSecret: '',
            isConnected: false
          },
          botSettings: {
            riskPerTrade: 1.5,
            trailingActivationMult: 1.2,
            leverageCeiling: 20,
            positionSizingMode: 'RISK',
            initialPositionAmount: 100
          },
          statistics: {
            totalPnL: 0,
            winRate: 0,
            tradesCount: 0
          }
        };
        await setDoc(userDocRef, userData);
      }

      // Is Two-Factor active for Google signee?
      if (userData.twoFactorEnabled) {
        setTempMfaUser({
          email: user.email!,
          name: userData.fullName || user.displayName || 'Google Operator',
          provider: 'GOOGLE',
          role: userData.role || 'USER',
          emailVerified: true,
          uid: user.uid,
          secret: userData.twoFactorSecret
        });
        setSuccessMessage("OAuth validated! Authenticator challenge generated.");
        setTimeout(() => {
          handleModeChange('verify_2fa');
        }, 1000);
        return;
      }

      setSuccessMessage("Successfully authenticated via Google Identity SSO!");
      setTimeout(() => {
        onLoginSuccess({
          email: user.email!,
          name: userData.fullName || user.displayName || 'Google Operator',
          provider: 'GOOGLE',
          role: userData.role || 'USER',
          email_verified: true,
          uid: user.uid
        });
      }, 1000);

    } catch (err: any) {
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        console.warn("[Google Login Error] Local sandbox fallback activated due to missing/disabled Google Provider configuration.");
        setSuccessMessage("⚡ Developer Sandbox bypass: Google OAuth simulated. Loading platform...");
        setTimeout(() => {
          onLoginSuccess({
            email: 'google.operator@novaquant.com',
            name: 'Google Operator',
            provider: 'GOOGLE',
            role: 'USER',
            email_verified: true,
            uid: 'bypass_google_operator'
          });
        }, 1000);
        return;
      }
      console.error("[Google Login Error]", err);
      let errMsg = err.message || 'SSO OAuth verification was interrupted.';
      setShowConfigBypass(true);
      setErrorMessage(errMsg);
    } finally {
      setLoading(null);
    }
  };

  // HANDLER G: MFA CODE VERIFICATION CEILING Handshake
  const handleTotpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpInput || !tempMfaUser) return;

    setLoading('verifying_totp_totp');
    setErrorMessage('');

    try {
      const isValid = await verifyTOTP(totpInput, tempMfaUser.secret);
      if (isValid) {
        setSuccessMessage("Two-factor clearance granted! Loading autopilot terminal environment...");
        setTimeout(() => {
          onLoginSuccess({
            email: tempMfaUser.email,
            name: tempMfaUser.name,
            provider: tempMfaUser.provider,
            role: tempMfaUser.role,
            email_verified: true,
            uid: tempMfaUser.uid
          });
        }, 1200);
      } else {
        setErrorMessage("Invalid authenticator credentials. Check your clock or device sync parameters.");
      }
    } catch (err: any) {
      console.error("[TOTP Verify Exception]", err);
      setErrorMessage(err.message || 'MFA validation process aborted.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen sleek-gradient-bg flex items-center justify-center p-4 md:p-6 select-none font-sans" id="auth-gateway-container">
      <div className="w-full glassmorphism-auth sleek-card p-6 md:p-8 relative overflow-hidden shadow-2xl transition-all duration-500 max-w-md" id="auth-box">
        
        {/* Backdrop highlights */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="space-y-5 flex flex-col justify-between z-10 relative">
          <div>
            {/* BRAND HEADER */}
            <div className="text-center space-y-1.5 mb-5">
              <div className="mx-auto flex justify-center">
                <NovaQuantLogo size={68} />
              </div>
              <h1 className="text-lg font-extrabold tracking-tight text-white mt-2 font-sans" id="gateway-brand-title">
                NovaQuant AI Platform
              </h1>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                Secure Algorithmic Trading & Portfolio Management Gateway
              </p>
            </div>

            {/* ERROR AND SUCCESS GRAPHICAL ANCHORS */}
            {errorMessage && (
              <div className="bg-rose-950/40 border border-rose-900/35 text-rose-350 px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2 animate-fade-in mb-4">
                <XCircle className="h-4 w-4 text-rose-450 shrink-0 mt-0.5" />
                <span className="font-sans text-left leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-950/35 border border-emerald-900/30 text-emerald-400 px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2 animate-fade-in mb-4">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-sans text-left leading-relaxed">{successMessage}</span>
              </div>
            )}

            {showConfigBypass && (
              <div className="bg-amber-950/40 border border-amber-900/35 text-amber-300 p-4 rounded-lg text-xs text-left mb-4 space-y-3 font-sans animate-fade-in" id="firebase-config-bypass-card">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-900/30">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="font-extrabold uppercase text-[10px] tracking-wide text-amber-300">Firebase Configuration Guide</span>
                </div>
                
                <p className="text-[10.5px] text-slate-300 leading-relaxed">
                  Your Firebase client setup was detected with disabled/missing auth providers. Update it via:
                </p>

                <ul className="list-decimal pl-4.5 space-y-1 text-[10px] text-slate-450 leading-normal">
                  <li>Navigate to your <strong>Firebase Console</strong>.</li>
                  <li>Click <strong>Build &gt; Authentication &gt; Sign-in method</strong>.</li>
                  <li>Activate the <strong>Email/Password</strong> and <strong>Google</strong> providers.</li>
                </ul>

                <div className="pt-2.5 border-t border-amber-900/30 font-sans space-y-2">
                  <p className="text-[10px] text-slate-350 leading-relaxed italic font-semibold">
                    ⚡ Use the Sandbox Bypass below to test the full system right now:
                  </p>
                  
                  <div className="flex flex-col gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleDeveloperBypass('novaquant2026@gmail.com', 'NovaQuant Master')}
                      className="bg-[#fbbf24] hover:bg-[#f59e0b] active:scale-95 text-slate-950 font-bold px-3 py-2 rounded text-[10px] uppercase transition-all tracking-wider flex items-center justify-center gap-1 cursor-pointer w-full text-center shadow-lg"
                    >
                      Bypass as App Admin (novaquant2026@gmail.com)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeveloperBypass('piyumanjaleeoshi@gmail.com', 'Oshi Piyumanjalee')}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-95 text-slate-100 font-bold px-3 py-1.5 rounded text-[10px] uppercase transition-all flex items-center justify-center gap-1 cursor-pointer w-full text-center"
                    >
                      Bypass as Oshi Admin (piyumanjaleeoshi@gmail.com)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeveloperBypass('operator@novaquant.com', 'Guest Operator')}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 active:scale-95 text-slate-300 font-bold px-3 py-1.5 rounded text-[10px] uppercase transition-all flex items-center justify-center gap-1 cursor-pointer w-full text-center"
                    >
                      Bypass as Guest Operator
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* OTP VERIFICATION DEBUG CONTAINER OVERLAY */}
            {dispatchSimulated && generatedBypassCode && (
              <div className="bg-amber-950/40 border border-amber-900/35 text-amber-300 p-3 rounded-lg text-xs text-left mb-4 space-y-2 font-mono" id="offline-simulated-portal">
                <div className="flex justify-between items-center border-b border-amber-900/40 pb-1">
                  <span className="font-bold text-[10px] uppercase flex items-center gap-1">
                    <Info className="h-3 w-3 inline" /> offline debug panel
                  </span>
                  <span className="text-[9px] text-slate-450 uppercase font-sans">Expires in {formatExpiryTime(bypassTimeRemaining)}</span>
                </div>
                <p className="text-[10px] text-slate-350 leading-relaxed font-sans">{dispatchFeedback}</p>
                <div className="flex items-center gap-1 rounded bg-slate-950 p-2 border border-slate-900 text-center justify-center">
                  <span className="text-slate-400 font-sans text-[10px]">OTP passcode:</span>
                  <strong className="text-white text-base tracking-widest pl-1">{generatedBypassCode}</strong>
                </div>
              </div>
            )}

            {/* MAIN ROUTER MODE RENDERING */}
            
            {/* 1. SIGN IN SCREEN */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 font-sans text-xs">
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-sans font-semibold text-slate-300 block">Email Coordinates</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="EX: oshi.p@novaquant.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full text-xs font-sans bg-slate-950/80 border border-slate-800/80 focus:border-[#fbbf24] rounded-lg px-3.5 py-2.5 text-slate-200 outline-none transition-all pl-10"
                      id="login-email-node"
                    />
                    <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-[11px] font-sans font-semibold text-slate-300">Secure Pass Key</label>
                    <button
                      type="button"
                      onClick={() => handleModeChange('forgot_password')}
                      className="text-[10.5px] text-amber-400 font-medium hover:underline outline-none cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter credentials pass key"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full text-xs font-sans bg-slate-950/80 border border-slate-800/80 focus:border-[#fbbf24] rounded-lg px-3.5 py-2.5 text-slate-200 outline-none transition-all pl-10 pr-10"
                      id="login-password-node"
                    />
                    <Lock className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-450 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between select-none py-1">
                  <label className="flex items-center gap-2 text-slate-450 cursor-pointer text-[10.5px]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 h-3.5 w-3.5 focus:ring-0 cursor-pointer"
                    />
                    Remember credentials email
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!!loading}
                  className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] disabled:bg-slate-850 disabled:text-slate-500 text-slate-950 font-sans font-bold py-2.5 px-4 rounded-lg tracking-wider text-xs uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/15"
                  id="login-submit-btn"
                >
                  {loading === 'login' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying Access...
                    </>
                  ) : (
                    <>
                      Sign In to Autopilot <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center font-sans text-slate-450 pt-2 select-none text-[11px] flex flex-col gap-1.5">
                  <div>
                    Unregistered user?{' '}
                    <button
                      type="button"
                      onClick={() => handleModeChange('signup')}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* 2. SIGN UP / REGISTRATION SCREEN */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5 font-sans text-xs">
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-sans font-semibold text-slate-300 block">Operator Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Enter legal/corporate profile name"
                      value={signUpName}
                      onChange={e => setSignUpName(e.target.value)}
                      className="w-full text-xs font-sans bg-slate-950/80 border border-slate-800/80 focus:border-[#fbbf24] rounded-lg px-3.5 py-2.5 text-slate-200 outline-none transition-all pl-10"
                      id="signup-name"
                    />
                    <User className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-405" />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-sans font-semibold text-slate-300 block">Email Coordinates</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="EX: name@novaquant.com"
                      value={signUpEmail}
                      onChange={e => setSignUpEmail(e.target.value)}
                      className="w-full text-xs font-sans bg-slate-950/80 border border-slate-800/80 focus:border-[#fbbf24] rounded-lg px-3.5 py-2.5 text-slate-200 outline-none transition-all pl-10"
                      id="signup-email"
                    />
                    <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-405" />
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-sans font-semibold text-slate-300 block">Secret Pass Key</label>
                  <div className="relative">
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      placeholder="Define complex login password"
                      value={signUpPassword}
                      onChange={e => setSignUpPassword(e.target.value)}
                      className="w-full text-xs font-sans bg-slate-950/80 border border-slate-800/80 focus:border-[#fbbf24] rounded-lg px-3.5 py-2.5 text-slate-200 outline-none transition-all pl-10 pr-10"
                      id="signup-pass-key"
                    />
                    <Lock className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-405" />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-450 hover:text-slate-300 cursor-pointer"
                    >
                      {showSignUpPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Password rules visual helper */}
                  {signUpPassword && (
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-900/60 text-[10px] space-y-1 font-mono text-left tracking-normal">
                      <span className="text-[9.5px] font-bold text-slate-400 block uppercase mb-1">complexity checker</span>
                      <div className="grid grid-cols-2 gap-1 font-semibold leading-normal">
                        <div className={`flex items-center gap-1 ${metLength ? 'text-emerald-450' : 'text-slate-500'}`}>
                          <span>{metLength ? '✓' : '●'}</span> At least 8 chars
                        </div>
                        <div className={`flex items-center gap-1 ${metUppercase ? 'text-emerald-450' : 'text-slate-500'}`}>
                          <span>{metUppercase ? '✓' : '●'}</span> 1 uppercase
                        </div>
                        <div className={`flex items-center gap-1 ${metLowercase ? 'text-emerald-450' : 'text-slate-500'}`}>
                          <span>{metLowercase ? '✓' : '●'}</span> 1 lowercase
                        </div>
                        <div className={`flex items-center gap-1 ${metNumber ? 'text-emerald-450' : 'text-slate-500'}`}>
                          <span>{metNumber ? '✓' : '●'}</span> 1 numeric digit
                        </div>
                        <div className={`flex items-center gap-1 col-span-2 ${metSpecial ? 'text-emerald-450' : 'text-slate-500'}`}>
                          <span>{metSpecial ? '✓' : '●'}</span> 1 special symbol (@$!%*...)
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-sans font-semibold text-slate-300 block">Confirm Pass Key</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="Re-enter password credentials"
                      value={signUpConfirmPassword}
                      onChange={e => setSignUpConfirmPassword(e.target.value)}
                      className="w-full text-xs font-sans bg-slate-950/80 border border-slate-800/80 focus:border-[#fbbf24] rounded-lg px-3.5 py-2.5 text-slate-200 outline-none transition-all pl-10"
                      id="signup-confirm-password"
                    />
                    <KeyRound className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-405" />
                  </div>
                </div>

                {/* Risk Terms checkbox */}
                <div className="flex items-start gap-2 text-left py-1 select-none">
                  <input
                    type="checkbox"
                    id="accept-saas-terms"
                    checked={signUpTerms}
                    onChange={e => setSignUpTerms(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500 h-3.5 w-3.5 shrink-0 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="accept-saas-terms" className="text-[10px] text-slate-405 cursor-pointer leading-relaxed">
                    I agree to the <span className="text-amber-500 font-bold hover:underline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAgreementModal(true); }}>Risk Disclosure & Safety Terms Agreement</span>.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading === 'signup'}
                  className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] disabled:bg-slate-850 disabled:text-slate-500 text-slate-950 font-sans font-bold py-2.5 px-4 rounded-lg tracking-wider text-xs uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  id="signup-submit-btn"
                >
                  {loading === 'signup' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Provisioning Account...
                    </>
                  ) : (
                    <>
                      Create Operator Account <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center font-sans text-slate-450 pt-1 select-none text-[11px] flex flex-col gap-1.5">
                  <div>
                    Registered operator profile?{' '}
                    <button
                      type="button"
                      onClick={() => handleModeChange('login')}
                      className="text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* 3. EMAIL OTP PASSPHRASE VERIFICATION SCREEN */}
            {mode === 'verify_email' && (
              <form onSubmit={handleRegisterVerifySubmit} className="space-y-4 font-sans text-xs">
                {!auth.currentUser ? (
                  <div className="p-3 bg-slate-900/40 border border-slate-800 text-slate-300 rounded-lg text-[10.5px] text-center font-bold leading-normal">
                    💡 If you already received a code, enter your email coordinates and verification code below to activate your account.
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded-lg text-[10.5px] text-center font-bold leading-normal">
                    📨 Verification dispatched: A secure activation link code was sent to your matching device inbox.
                  </div>
                )}
                
                <div className="space-y-3 p-3.5 rounded-lg border border-slate-850 bg-[#020617]/50 text-left font-sans text-[10.5px]">
                  <p className="text-slate-350 leading-relaxed">
                    Verify secure transaction identity mapping template code to confirm your active workspace privileges.
                  </p>
                  <div className="flex justify-between items-center text-[9px] uppercase font-mono text-slate-500 border-t border-slate-900 pt-2 select-none">
                    <span>expiry clock: <b className="text-[#38bdf8]">{formatExpiryTime(codeExpiryTimer)}</b></span>
                    <span>attempts window: <b className="text-amber-450">max 5</b></span>
                  </div>
                </div>

                {!auth.currentUser && (
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-sans font-semibold text-slate-300 block">Email Coordinates</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="EX: name@novaquant.com"
                        value={signUpEmail}
                        onChange={e => setSignUpEmail(e.target.value)}
                        className="w-full text-xs font-sans bg-slate-950/80 border border-slate-800/80 focus:border-[#fbbf24] rounded-lg px-3.5 py-2.5 text-slate-200 outline-none transition-all pl-10"
                        id="verify-email-field"
                      />
                      <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-455" />
                    </div>
                  </div>
                )}

                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-sans font-semibold text-slate-300 block">6-Digit Verification Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="EX: 412035"
                      value={verificationInput}
                      onChange={e => setVerificationInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center font-mono font-black text-xl tracking-widest bg-slate-950 border border-slate-850 focus:border-amber-400 rounded-lg py-2.5 text-slate-200 outline-none transition-all placeholder:text-slate-700 select-all"
                      id="verification-passcard-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading === 'verifying_otp'}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-850 disabled:text-slate-550 text-slate-950 font-sans font-bold py-2.5 px-4 rounded-lg tracking-wider text-xs uppercase active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  id="verification-submit-btn"
                >
                  {loading === 'verifying_otp' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Performing Handshake...
                    </>
                  ) : (
                    <>
                      Verify Security Handshake <Check className="h-4 w-4 stroke-[3]" />
                    </>
                  )}
                </button>

                <div className="flex justify-between items-center px-1 text-[11px] border-t border-slate-900/60 pt-3">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0}
                    className="text-amber-400 disabled:text-slate-500 hover:underline inline-flex items-center gap-1 font-bold cursor-pointer transition-all uppercase text-[10px]"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading === 'resending_otp' ? 'animate-spin' : ''}`} /> 
                    {resendCountdown > 0 ? `Resend OTP (${resendCountdown}s)` : "Resend OTP Code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      auth.signOut().catch(console.error);
                      handleModeChange('login');
                    }}
                    className="text-slate-450 hover:text-slate-250 cursor-pointer select-none underline"
                  >
                    Back to login
                  </button>
                </div>
              </form>
            )}

            {/* 4. FORGOT PASSWORD / PASSWORD RESET SCREEN */}
            {mode === 'forgot_password' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 font-sans text-xs">
                <div className="p-3 bg-[#020617]/50 rounded-lg border border-slate-850 text-slate-350 text-[10.5px] leading-relaxed text-left font-sans">
                  Enter your registered credentials email coordinates below. We will submit a secure Firebase Authentication password recovery link to your server mail address.
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-sans font-semibold text-slate-300 block">Email Coordinates</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="EX: name@novaquant.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full text-xs font-sans bg-slate-950/80 border border-slate-800/80 focus:border-amber-500 rounded-lg px-3.5 py-2.5 text-slate-205 outline-none transition-all pl-10"
                      id="forgot-pass-email"
                    />
                    <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-405" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading === 'forgot'}
                  className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] disabled:bg-slate-850 text-slate-950 font-sans font-bold py-2.5 px-4 rounded-lg tracking-wider text-xs uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  id="forgot-password-submit-btn"
                >
                  {loading === 'forgot' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Dispatching Reset...
                    </>
                  ) : (
                    <>
                      Send Reset Instructions <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>

                <div className="text-center font-sans mt-3 border-t border-slate-900/60 pt-3">
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    className="text-slate-450 hover:text-slate-205 font-bold hover:underline cursor-pointer flex items-center gap-1 mx-auto text-[10.5px] mb-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Cancel and Back to Login
                  </button>
                  {!showConfigBypass && (
                    <button
                      type="button"
                      onClick={() => setShowConfigBypass(true)}
                      className="text-[10px] text-amber-500/80 hover:text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      ⚙️ Having recovery issues? Reveal Sandbox Bypass
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* 5. GOOGLE AUTHENTICATOR MFA / 2FA VERIFICATION CODE SCREEN */}
            {mode === 'verify_2fa' && (
              <form onSubmit={handleTotpVerifySubmit} className="space-y-4 font-sans text-xs">
                <div className="space-y-3 p-3.5 rounded-lg border border-purple-950/20 bg-purple-950/5 text-left font-sans text-[10.5px]">
                  <p className="text-slate-350 leading-relaxed">
                    This profile layout is protected by <b>Google Authenticator Two-Factor (2FA) Guard</b>. Please inspect your synced smartphone device and type the active 6-digit verification code below:
                  </p>
                  <div className="flex justify-between items-center text-[9px] uppercase font-mono text-purple-400 border-t border-purple-950/20 pt-2 select-none">
                    <span>status: standard enforced</span>
                    <span>challenge: periodic totp</span>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-sans font-semibold text-slate-305 block text-center">6-Digit Authenticator Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="EX: 801264"
                      value={totpInput}
                      onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center font-mono font-black text-xl tracking-widest bg-slate-950 border border-slate-855 focus:border-purple-500 rounded-lg py-2.5 text-slate-200 outline-none transition-all placeholder:text-slate-700"
                      id="totp-challenge-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading === 'verifying_totp_totp'}
                  className="w-full bg-gradient-to-r from-purple-700 to-[#a855f7] hover:opacity-95 disabled:opacity-50 text-white font-sans font-bold py-2.5 px-4 rounded-lg tracking-wider text-xs uppercase active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-950/10"
                  id="totp-challenge-submit"
                >
                  {loading === 'verifying_totp_totp' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying Keys...
                    </>
                  ) : (
                    <>
                      Grant Secure Console Clearance <Check className="h-4 w-4 stroke-[3]" />
                    </>
                  )}
                </button>

                <div className="text-center font-sans mt-3 border-t border-slate-900/60 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTempMfaUser(null);
                      setTotpInput('');
                      auth.signOut().catch(console.error);
                      handleModeChange('login');
                    }}
                    className="text-slate-450 hover:text-slate-255 font-bold hover:underline cursor-pointer flex items-center gap-1 mx-auto text-[10.5px]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Account Sign In
                  </button>
                </div>
              </form>
            )}


          </div>

          {/* Secure lock footer */}
          <div className="flex justify-center items-center gap-1.5 text-[10px] text-slate-500 font-sans mt-4 pt-3.5 border-t border-slate-900/50 select-none">
            <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" /> Cryptographic SSL Terminal Protection Act
          </div>
        </div>
      </div>

      {/* RISKS AND CONDITIONS MODAL CONTAINER */}
      {showAgreementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 max-h-[85vh] flex flex-col font-sans select-none shadow-2xl relative">
            <h3 className="text-sm font-extrabold text-white uppercase border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-amber-500" /> NovaQuant Critical Risk Disclosures
            </h3>
            
            <div 
              onScroll={(e) => {
                const target = e.currentTarget;
                if (target.scrollHeight - target.scrollTop <= target.clientHeight + 25) {
                  setScrolledToBottom(true);
                }
              }}
              className="flex-1 overflow-y-auto py-4 text-xs text-slate-350 space-y-3 pr-2 text-left leading-normal font-sans"
            >
              <h4 className="font-bold text-white uppercase">Section 1: Automated Autopilot Signaling Risks</h4>
              <p>NovaQuant publishes metrics generated via quantitative overlays. All executions, crossover filters, and automated actions route through your linked API credentials. Strategic trading is highly speculative, involving severe capital volatile fluctuations under leveraged futures contracts.</p>
              
              <h4 className="font-bold text-white uppercase">Section 2: Complete Liability De-Responsibility</h4>
              <p>You acknowledge that software systems can experience routing latency delays, exchange disconnect disconnects, network anomalies, or system slippage. NovaQuant does not serve as a registered financial advisor or mutual broker. All manual or bot executions are completed strictly at your own financial liability risk.</p>
              
              <h4 className="font-bold text-white uppercase">Section 3: Standard Agreement Guidelines</h4>
              <p>By registering on this terminal, you swear that you understand these leverages parameters, accept all programmatic risk controls, and will use appropriate margin buffers to prevent liquidation cascades.</p>
            </div>

            <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[10px] text-slate-450 uppercase font-mono">
                {scrolledToBottom ? "✓ Document Read Complete" : "⬇ Scroll to bottom to accept terms"}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAgreementModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-md cursor-pointer flex-1 sm:flex-initial"
                >
                  Reject Agreement
                </button>
                <button
                  type="button"
                  disabled={!scrolledToBottom}
                  onClick={() => {
                    setSignUpTerms(true);
                    setFinancialLossAgreed(true);
                    setShowAgreementModal(false);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[#fbbf24] hover:bg-[#f59e0b] disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-md cursor-pointer flex-1 sm:flex-initial"
                >
                  Accept Terms
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
