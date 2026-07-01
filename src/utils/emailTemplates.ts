export function getVerificationEmailHtml(name: string, otp: string): string {
  return `
    <div style="font-family: 'JetBrains Mono', monospace, Arial, sans-serif; background-color: #030712; color: #f1f5f9; padding: 40px 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fbbf24; margin: 0; font-size: 24px; letter-spacing: 2px;">NOVAQUANT AI</h1>
        <p style="color: #64748b; font-size: 11px; margin-top: 5px; text-transform: uppercase;">Secure Algorithmic Gateway</p>
      </div>
      <div style="background-color: #0b0f19; border: 1px solid #1e293b; padding: 30px; border-radius: 8px;">
        <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">Greeting, <strong style="color: #f8fafc;">${name}</strong>.</p>
        <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">A request was received to verify your email coordinates. Use the temporary cryptographic passcode below to authorize your registration clearance:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background-color: #1e1b4b; border: 2px dashed #fbbf24; color: #fbbf24; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 15px 30px; border-radius: 8px; font-family: 'JetBrains Mono', monospace;">
            ${otp}
          </div>
          <p style="color: #ef4444; font-size: 11px; margin-top: 10px; text-transform: uppercase; font-weight: bold;">⚠️ Security Expiry: 10 Minutes</p>
        </div>
        
        <p style="font-size: 12px; line-height: 1.6; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 20px;">
          If you did not initiate this activation request, please disregard this email. All logs are monitored cryptographically.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #64748b;">
        <p>© 2026 NovaQuant Autopilot. Sent via EmailJS from <a href="mailto:novaquant2026@gmail.com" style="color: #fbbf24; text-decoration: none;">novaquant2026@gmail.com</a></p>
      </div>
    </div>
  `;
}

export function getPasswordResetEmailHtml(name: string, email: string, token: string, resetUrl: string): string {
  return `
    <div style="font-family: 'JetBrains Mono', monospace, Arial, sans-serif; background-color: #030712; color: #f1f5f9; padding: 40px 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #fbbf24; margin: 0; font-size: 24px; letter-spacing: 2px;">NOVAQUANT AI</h1>
        <p style="color: #64748b; font-size: 11px; margin-top: 5px; text-transform: uppercase;">Secure Credentials Reset</p>
      </div>
      <div style="background-color: #0b0f19; border: 1px solid #1e293b; padding: 30px; border-radius: 8px;">
        <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">Attention: <strong style="color: #f8fafc;">${name}</strong> (${email}).</p>
        <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">A security credentials reset token has been dispatched to your address. Click the link below or enter the secure token manually in the terminal UI to re-establish your passkey:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #fbbf24; color: #030712; font-size: 13px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px;">
            Reset Your Password
          </a>
          <div style="margin-top: 25px;">
            <p style="font-size: 11px; color: #64748b; margin: 0; text-transform: uppercase;">Manual Reset Code:</p>
            <strong style="color: #fbbf24; font-size: 20px; letter-spacing: 3px; font-family: 'JetBrains Mono', monospace;">${token}</strong>
          </div>
          <p style="color: #ef4444; font-size: 11px; margin-top: 15px; text-transform: uppercase; font-weight: bold;">⚠️ Link expires in 30 minutes • Limit 5 attempts</p>
        </div>
        
        <p style="font-size: 11px; word-break: break-all; color: #64748b; background-color: #030712; padding: 10px; border-radius: 4px; border: 1px solid #1e293b; line-height: 1.4;">
          Direct Link: <a href="${resetUrl}" style="color: #fbbf24; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #64748b;">
        <p>© 2026 NovaQuant Autopilot. Sent via EmailJS from <a href="mailto:novaquant2026@gmail.com" style="color: #fbbf24; text-decoration: none;">novaquant2026@gmail.com</a></p>
      </div>
    </div>
  `;
}

export function getWelcomeEmailHtml(name: string): string {
  return `
    <div style="font-family: 'JetBrains Mono', monospace, Arial, sans-serif; background-color: #030712; color: #f1f5f9; padding: 40px 20px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0; font-size: 24px; letter-spacing: 2px;">NOVAQUANT AI</h1>
        <p style="color: #64748b; font-size: 11px; margin-top: 5px; text-transform: uppercase;">Activation Confirmed</p>
      </div>
      <div style="background-color: #0b0f19; border: 1px solid #1e293b; padding: 30px; border-radius: 8px;">
        <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Welcome aboard, ${name}!</h2>
        <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">Your profile email coordinates have been cryptographically verified and fully activated.</p>
        <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">Your modern, state-of-the-art sandbox algorithmic trading engine is now fully provisioned and prepared for trading signal executions or automated backtesting.</p>
        
        <div style="text-align: center; margin: 30px 0; border: 1px solid #10b981; background-color: #064e3b; padding: 15px; border-radius: 8px;">
          <p style="color: #34d399; font-size: 12px; margin: 0; text-transform: uppercase; font-weight: bold; letter-spacing: 1.5px;">✔️ Account Clearance Levels: OPERATOR</p>
        </div>
        
        <p style="font-size: 12px; line-height: 1.6; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 20px;">
          You can now start trading or backtesting on the dashboard interface. Ensure you configure your personal API Keys securely inside the settings menu.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #64748b;">
        <p>© 2026 NovaQuant Autopilot. Sent via EmailJS from <a href="mailto:novaquant2026@gmail.com" style="color: #fbbf24; text-decoration: none;">novaquant2026@gmail.com</a></p>
      </div>
    </div>
  `;
}
