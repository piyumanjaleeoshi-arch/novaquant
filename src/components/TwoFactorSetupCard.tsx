import React, { useState, useEffect } from 'react';
import { 
  Shield, Key, Check, Loader2, Lock, Unlock, 
  Copy, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  generateTOTPSecret, 
  getOTPAuthUrl, 
  verifyTOTP 
} from '../utils/totp';

interface TwoFactorSetupCardProps {
  currentUser: { email: string; name: string; provider: string; role?: string; email_verified?: boolean } | null;
  onUpdateUser: (updatedFields: { twoFactorEnabled: boolean }) => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
}

export default function TwoFactorSetupCard({ 
  currentUser, 
  onUpdateUser, 
  onAddLog 
}: TwoFactorSetupCardProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 2FA Setup Flow State
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 2FA Disable State
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    async function load2FAStatus() {
      if (!currentUser) return;
      try {
        const cached = localStorage.getItem('novaquant_user');
        if (cached) {
          const parsedObj = JSON.parse(cached);
          if (parsedObj && typeof parsedObj.twoFactorEnabled === 'boolean') {
            setEnabled(parsedObj.twoFactorEnabled);
          }
        }
        
        // Always double scan live status from database
        const userId = (currentUser as any).uid || '';
        if (!userId) {
          console.warn("[2FA Setup Loader] No active operator UID registered. Skipping live db scan.");
          setLoading(false);
          return;
        }
        if (!auth.currentUser || auth.currentUser.uid !== userId) {
          console.warn("[2FA Setup Loader] Firebase Auth currentUser is not yet available or mismatch. Skipping live db scan until authenticated.");
          setLoading(false);
          return;
        }
        const userRef = doc(db, 'users', userId);
        let snap;
        try {
          snap = await getDoc(userRef);
        } catch (dbErr: any) {
          handleFirestoreError(dbErr, OperationType.GET, `users/${userId}`);
        }
        if (snap && snap.exists()) {
          const data = snap.data();
          setEnabled(!!data.twoFactorEnabled);
        }
      } catch (err: any) {
        console.error("[2FA Setup Loader] Failed querying Firestore:", err);
      } finally {
        setLoading(false);
      }
    }
    load2FAStatus();
  }, [currentUser]);

  const handleStartSetup = () => {
    if (!currentUser) return;
    setError('');
    setSuccess('');
    
    // Generate secure Base32 2FA secret
    const newSecret = generateTOTPSecret();
    setSecret(newSecret);

    // Build standard authenticator URL
    const authUrl = getOTPAuthUrl(currentUser.email, newSecret);
    setQrCodeUrl(authUrl);

    setIsSettingUp(true);
    setIsDisabling(false);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !verificationCode) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      // Verify TOTP token matching secret
      const isValid = await verifyTOTP(verificationCode, secret);
      if (!isValid) {
        setError("Invalid security verification code. Please synchronize your authenticator app's clock and try again.");
        setActionLoading(false);
        return;
      }

      // Save encrypted/standard secret parameter to Firestore users record
      const userId = (currentUser as any).uid || '';
      if (!userId) {
        throw new Error("Local operator session is missing an active user UID identifier.");
      }

      try {
        await updateDoc(doc(db, 'users', userId), {
          twoFactorEnabled: true,
          twoFactorSecret: secret
        });
      } catch (dbErr: any) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `users/${userId}`);
      }

      setEnabled(true);
      setIsSettingUp(false);
      setVerificationCode('');
      setSuccess("❇️ Google Authenticator 2FA enabled successfully!");
      onUpdateUser({ twoFactorEnabled: true });
      onAddLog("🛡️ Security Node: Multi-Factor Authentication (2FA) successfully enforced on this account.", 'success');
    } catch (err: any) {
      console.error("[2FA Update Failed]", err);
      setError(err.message || 'Error enforcing multi-factor variables.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !disableCode) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const userId = (currentUser as any).uid || '';
      const userRef = doc(db, 'users', userId);
      let snap;
      try {
        snap = await getDoc(userRef);
      } catch (dbErr: any) {
        handleFirestoreError(dbErr, OperationType.GET, `users/${userId}`);
      }

      if (!snap || !snap.exists()) {
        throw new Error("Unable to fetch active user secret records.");
      }

      const activeSecret = snap.data().twoFactorSecret;
      if (!activeSecret) {
        throw new Error("No active Secret found for this profile.");
      }

      const isValid = await verifyTOTP(disableCode, activeSecret);
      if (!isValid) {
        setError("Invalid security code. De-authorization aborted.");
        setActionLoading(false);
        return;
      }

      // De-authenticate
      try {
        await updateDoc(userRef, {
          twoFactorEnabled: false,
          twoFactorSecret: null
        });
      } catch (dbErr: any) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `users/${userId}`);
      }

      setEnabled(false);
      setIsDisabling(false);
      setDisableCode('');
      setSuccess("⚠️ Two-Factor authentication disabled.");
      onUpdateUser({ twoFactorEnabled: false });
      onAddLog("⚠️ Security Risk Warning: Two-Factor Authentication (2FA) deactivated for this profile.", 'warn');
    } catch (err: any) {
      console.error("[Disable 2FA Aborted]", err);
      setError(err.message || "De-authorization process failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sleek-card p-4 flex items-center justify-center min-h-[140px]" id="two-factor-loading-tile">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="sleek-card p-4 space-y-4 shadow-xl" id="google-auth-2fa-setup-section">
      <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-slate-805 pb-2.5 flex items-center gap-1.5 font-mono select-none">
        <Shield className="h-4 w-4 text-[#a855f7]" /> Two-Factor Authentication (2FA)
      </h3>

      {error && (
        <div className="p-3 bg-rose-950/45 border border-rose-900/35 rounded-lg text-[10px] text-rose-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-450 mt-0.5" />
          <span className="font-sans text-left leading-relaxed">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-990/30 rounded-lg text-[10px] text-emerald-400 flex items-start gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-450 mt-0.5" />
          <span className="font-sans text-left leading-relaxed">{success}</span>
        </div>
      )}

      {!enabled && !isSettingUp && (
        <div className="space-y-3 font-mono text-xs text-left" id="2fa-disabled-promo">
          <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
            Protect your algorithmic trading panels, secret API credentials, and financial configurations from unauthorized access by requiring a dynamic 6-digit verification code generated by the Google Authenticator app on your smartphone during each login session.
          </p>
          <div className="p-3 rounded-lg bg-[#020617] border border-slate-850 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold text-rose-450 uppercase flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> status: unprotected
            </span>
            <button
              type="button"
              onClick={handleStartSetup}
              className="bg-purple-900/40 hover:bg-purple-900/65 border border-purple-800/45 text-purple-200 hover:text-white font-sans text-[10.5px] font-bold py-1.5 px-4 rounded-md transition-all active:scale-95 cursor-pointer"
            >
              Enable 2FA Protection
            </button>
          </div>
        </div>
      )}

      {enabled && !isDisabling && (
        <div className="space-y-3 font-mono text-xs text-left" id="2fa-enabled-badge">
          <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
            Your login verification is fortified against credentials hijack. A 6-digit TOTP key check from your synced authenticator app will be demanded prior to authorizing any terminal dashboard access.
          </p>
          <div className="p-3 rounded-lg bg-emerald-954/10 border border-emerald-900/40 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
              <Check className="h-4 w-4" /> status: standard enforced
            </span>
            <button
              type="button"
              onClick={() => {
                setIsDisabling(true);
                setIsSettingUp(false);
                setDisableCode('');
                setError('');
                setSuccess('');
              }}
              className="bg-rose-955/30 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:text-rose-300 font-sans text-[10px] font-bold py-1.5 px-3.5 rounded-md transition-all active:scale-95 cursor-pointer"
            >
              Deactivate 2FA
            </button>
          </div>
        </div>
      )}

      {/* STEP-BY-STEP SETUP ENABLER INTERFACE */}
      {isSettingUp && (
        <div className="border border-slate-850 p-4 rounded-lg bg-[#020617]/50 text-left space-y-4" id="totp-scanning-workbench">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2">
            <span className="text-[10.5px] text-purple-400 font-extrabold uppercase font-mono flex items-center gap-1.5">
              <Key className="h-4 w-4" /> Syncing Google Authenticator
            </span>
            <button
              type="button"
              onClick={() => setIsSettingUp(false)}
              className="text-[9.5px] uppercase font-bold text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3 font-sans text-slate-300 text-[10.5px] leading-relaxed">
            <div className="space-y-1">
              <span className="font-mono text-purple-400 font-black uppercase">Step 1: Scan QR Code</span>
              <p className="text-slate-400 text-[10px]">Open your <b>Google Authenticator</b> or <b>Microsoft Authenticator</b> app, click "+" to add a new account, and scan the QR frame below.</p>
            </div>

            <div className="flex justify-center py-2.5 bg-white/5 rounded-lg border border-slate-850 max-w-[210px] mx-auto shadow-inner">
              <img 
                src={`https://chart.googleapis.com/chart?chs=180x180&chld=M|0&cht=qr&chl=${encodeURIComponent(qrCodeUrl)}`} 
                alt="Scan-to-Authorize-TOTP"
                referrerPolicy="no-referrer"
                className="w-44 h-44 rounded"
              />
            </div>

            <div className="space-y-1 mt-2">
              <span className="font-mono text-purple-400 font-black uppercase">Step 2: Backup manual Key</span>
              <p className="text-slate-400 text-[10px]">If you cannot scan, you can manually type this secure secret string inside the configuration screen of your authenticator app:</p>
              
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex-1 p-1 px-3 bg-slate-950 border border-slate-850 rounded font-mono text-[10.5px] font-black text-purple-300 select-all tracking-wider text-center">
                  {secret}
                </span>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="py-1 px-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded text-[9px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedSecret ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-2.5 w-2.5 text-slate-400" />}
                  {copiedSecret ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-900 pt-3 mt-2">
              <div className="space-y-1">
                <span className="font-mono text-purple-400 font-black uppercase block">Step 3: Verify Secure Scanned Token</span>
                <p className="text-slate-400 text-[10px]">Verify your smartphone device link is active by inputting the active 6-digit TOTP code currently shown on your telephone screen:</p>
              </div>

              <form onSubmit={handleVerifyAndEnable} className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="EX: 835201"
                  className="bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-purple-500 font-mono tracking-widest text-center w-28 shrink-0 placeholder:opacity-50"
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-purple-900/60 hover:bg-purple-900 border border-purple-700/60 text-white font-sans text-[10px] font-bold py-1.5 px-3 rounded cursor-pointer flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify & Enable"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DISABLERS DRAWER IF INACTIVE/DE-AUTHORIZING */}
      {isDisabling && (
        <form onSubmit={handleDisable2FA} className="border border-rose-900/30 p-4 rounded-lg bg-rose-950/5 text-left space-y-3" id="disable-2fa-drawer">
          <div className="flex justify-between items-center border-b border-rose-950 pb-2">
            <span className="text-[10px] text-rose-450 font-extrabold uppercase font-mono flex items-center gap-1.5 shadow-sm">
              <Unlock className="h-3.5 w-3.5 animate-bounce" /> De-Authorizing 2FA Guard
            </span>
            <button
              type="button"
              onClick={() => setIsDisabling(false)}
              className="text-[9.5px] uppercase font-bold text-slate-500 hover:text-slate-350 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <p className="text-slate-400 text-[10px] leading-relaxed">
            Please enter your smartphone's active 6-digit Google Authenticator code below to authorize deactivating account security variables:
          </p>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              maxLength={6}
              required
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              placeholder="EX: 412586"
              className="bg-slate-950 border border-slate-850 text-slate-205 text-xs rounded px-3 py-1.5 focus:outline-none focus:border-rose-500 font-mono tracking-widest text-center w-28 shrink-0"
            />
            <button
              type="submit"
              disabled={actionLoading}
              className="flex-1 bg-rose-955/35 hover:bg-rose-950 border border-rose-900/40 text-rose-300 font-mono font-bold text-[9.5px] py-1.5 px-3 rounded cursor-pointer flex items-center justify-center gap-1 transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Deactivation"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
