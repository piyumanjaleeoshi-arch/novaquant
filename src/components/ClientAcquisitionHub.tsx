/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Mail,
  Link2,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  FileText,
  Sparkles,
  ShieldCheck,
  Check,
  Copy,
  PlusCircle,
  Server,
  TrendingUp,
  Coins,
  Download,
  AlertCircle,
  Fingerprint,
  Terminal,
  ExternalLink,
  Users,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { SaaSUser, SubscriptionTier, SaaSMetrics } from '../saasTypes';

interface ClientAcquisitionHubProps {
  metrics: SaaSMetrics;
  onAddNewClient: (newClient: SaaSUser, activeFee: number, actionLogStr: string, referrer?: string) => void;
  gcpProjectNumber: string;
}

export default function ClientAcquisitionHub({
  metrics,
  onAddNewClient,
  gcpProjectNumber = '1010310740221',
}: ClientAcquisitionHubProps) {
  // Mode tabs: 'INVITE_LINK_BUILDER' or 'CLIENT_CHECKOUT_SANDBOX'
  const [activeSegment, setActiveSegment] = useState<'INVITE' | 'SANDBOX'>('INVITE');

  // Invitation Form States
  const [prospectName, setProspectName] = useState('Oshi Piyumanjalee');
  const [prospectEmail, setProspectEmail] = useState('piyumanjaleeoshi@gmail.com');
  const [targetTier, setTargetTier] = useState<SubscriptionTier>('BASIC');
  const [gcpProject, setGcpProject] = useState(gcpProjectNumber);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Billing & Stripe Sandbox Form States
  const [selectedExchange, setSelectedExchange] = useState<string>('Binance');
  const [clientBillingName, setClientBillingName] = useState('Oshi Piyumanjalee');
  const [clientBillingEmail, setClientBillingEmail] = useState('piyumanjaleeoshi@gmail.com');
  const [sandboxTier, setSandboxTier] = useState<SubscriptionTier>('BASIC');
  const [clientGcpProject, setClientGcpProject] = useState(gcpProjectNumber);
  const [binanceKey, setBinanceKey] = useState('d1A2v489Xm92p10Ks9Xq39...');
  const [binanceSecret, setBinanceSecret] = useState('secret_api_key_xxxxxxxxxxxxx');
  const [clientReferrer, setClientReferrer] = useState('');
  
  // Card credentials
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('389');
  
  // Simulation actions
  const [sandboxProgress, setSandboxProgress] = useState<'IDLE' | 'AUTHORIZING' | 'DEPLOYING' | 'SUCCESS'>('IDLE');
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Fee computation based on selected plan
  const pricingRates = {
    BASIC: { price: 49, label: 'Basic Plan', workers: '1 node' },
    PRO: { price: 99, label: 'Pro Scalper Plan', workers: '3 nodes' },
    ENTERPRISE: { price: 199, label: 'Enterprise Institutional', workers: 'Unlimited nodes' },
  };

  // 1. Invitation logic
  const handleGenerateLink = () => {
    if (!prospectName.trim() || !prospectEmail.trim()) {
      alert('Please fill in the prospect name and email address first.');
      return;
    }
    const safeName = encodeURIComponent(prospectName);
    const safeEmail = encodeURIComponent(prospectEmail);
    const link = `${window.location.origin}?clientAuth=true&name=${safeName}&email=${safeEmail}&plan=${targetTier}&gcp=${gcpProject}`;
    setGeneratedUrl(link);
    setInviteSent(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleSimulateEmailInvite = () => {
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
    }, 4000);
  };

  // Launch checkout preview
  const handleLaunchCheckoutInSandbox = () => {
    setClientBillingName(prospectName);
    setClientBillingEmail(prospectEmail);
    setSandboxTier(targetTier);
    setClientGcpProject(gcpProject);
    setActiveSegment('SANDBOX');
    setSandboxProgress('IDLE');
    setProgressLog([]);
  };

  // 2. Stripe Checkout Sandbox payment submission
  const handleProcessStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientBillingName.trim() || !clientBillingEmail.trim()) {
      alert('Please fill out Client Name and Email before executing Stripe activation.');
      return;
    }

    setSandboxProgress('AUTHORIZING');
    setProgressLog(['🔒 Connecting to Binance Pay Quick settlement routing engine...']);

    // Step-by-step logging simulation
    setTimeout(() => {
      setProgressLog(prev => [
        ...prev,
        '💳 Authorizing secure Binance Wallet API key handshake... SUCCESS.',
        '📡 Broadcasting Binance Pay transaction signature callback to dynamic webhooks...',
      ]);
    }, 700);

    setTimeout(() => {
      setProgressLog(prev => [
        ...prev,
        `🤖 Binance Wallet settlement approved! Processing registration for Google Cloud runtime instances.`,
        `🌩️ Deploying secure multi-tenant worker containers on GCP Cloud Run (Project ID: ${clientGcpProject})...`,
      ]);
    }, 1500);

    setTimeout(() => {
      setProgressLog(prev => [
        ...prev,
        `🔑 Installing client cryptographic ${selectedExchange} API Credentials lock clusters...`,
        `🔥 Activated active ${sandboxTier} license tier for user successfully!`,
      ]);
      
      setSandboxProgress('SUCCESS');

      // Sync data directly to App state via callback
      const planRate = pricingRates[sandboxTier].price;
      const clientID = `usr-${Date.now().toString().slice(-4)}`;
      const actionLogStr = `🎉 NET PAYMENT COMPLETED: Client '${clientBillingName}' subscribed to ${sandboxTier} tier (${planRate}.00 USDT Paid via Binance Wallet). Orchestrated under GCP Container project ID '${clientGcpProject}'.`;

      const newSaaSUser: SaaSUser = {
        id: clientID,
        email: clientBillingEmail,
        name: clientBillingName,
        authProvider: 'EMAIL',
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        workspacesCount: sandboxTier === 'ENTERPRISE' ? 10 : sandboxTier === 'PRO' ? 3 : 1,
        totalGasSpent: 0,
        plan: sandboxTier,
        status: 'ACTIVE'
      };

      onAddNewClient(newSaaSUser, planRate, actionLogStr, clientReferrer);

      // Create downloadable invoice mock data
      setSelectedInvoice({
        invoiceId: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString(),
        client: clientBillingName,
        email: clientBillingEmail,
        gcpProject: clientGcpProject,
        planName: pricingRates[sandboxTier].label,
        tierKey: sandboxTier,
        amountPaid: planRate,
        exchangeLockCode: `SHA-256-${selectedExchange.toUpperCase()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      });

    }, 2500);
  };

  return (
    <div className="sleek-card p-5 space-y-5 shadow-2xl relative overflow-hidden text-left" id="client-acquisition-hub-widget">
      
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#818cf8] to-indigo-600 rounded-xl">
            <Users className="h-5.5 w-5.5 text-white" id="client-acquisition-icon" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base tracking-tight uppercase">Client Onboarding & Settlement Hub</h3>
            <p className="text-[10px] text-slate-450 font-mono">AUTOMATED BINANCE WALLET PAYMENTS & INSTANT EXCHANGE WEBHOOKS</p>
          </div>
        </div>
        
        {/* Toggle between segments */}
        <div className="flex bg-[#020617] border border-slate-905 p-0.5 rounded-lg text-[10px] font-mono select-none">
          <button
            type="button"
            onClick={() => setActiveSegment('INVITE')}
            className={`px-3 py-1.5 rounded-md font-bold uppercase transition-all whitespace-nowrap ${
              activeSegment === 'INVITE' ? 'bg-[#818cf8]/10 text-white' : 'text-slate-550 hover:text-slate-300'
            }`}
          >
            1. Create Client Invite
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment('SANDBOX')}
            className={`px-3 py-1.5 rounded-md font-bold uppercase transition-all whitespace-nowrap ${
              activeSegment === 'SANDBOX' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'text-slate-550 hover:text-slate-300'
            }`}
          >
            2. Binance Wallet Checkout
          </button>
        </div>
      </div>

      {/* DESCRIPTION BOX & METHOD EXPLANATION */}
      <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl text-xs text-slate-400 space-y-1">
        <span className="text-slate-200 font-bold flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Client Acquisition Strategy
        </span>
        <p className="leading-relaxed text-[11px]">
          How to get clients registered under your active plans? Using this controller, you can instantly assemble targeted checkout codes, or test onboarding clients directly. The sandbox fully supports complete Stripe simulation triggers and container setups.
        </p>
      </div>

      {/* TAB A: LINK GENERATOR & EMAIL PROSPECT INVITATION */}
      {activeSegment === 'INVITE' && (
        <div className="space-y-4 animate-fade-in" id="prospect-link-generator-tab">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Prospect Fields Column */}
            <div className="space-y-3.5">
              <span className="block text-[10px] text-[#818cf8] font-bold uppercase font-mono tracking-wider">Prospect Onboarding Details</span>
              
              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] text-slate-550 uppercase">Client Full Name</label>
                <input
                  type="text"
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-850 text-white text-[11px] rounded px-3 py-2 focus:outline-none focus:border-indigo-500"
                  placeholder="E.g. Oshi Piyumanjalee"
                />
              </div>

              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] text-slate-550 uppercase">Client Email Address</label>
                <input
                  type="email"
                  value={prospectEmail}
                  onChange={(e) => setProspectEmail(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-850 text-white text-[11px] rounded px-3 py-2 focus:outline-none focus:border-indigo-500"
                  placeholder="E.g. piyumanjaleeoshi@gmail.com"
                />
              </div>

              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] text-slate-550 uppercase">Google Cloud Project ID Reference</label>
                <input
                  type="text"
                  value={gcpProject}
                  onChange={(e) => setGcpProject(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-850 text-white text-[11px] rounded px-3 py-2 focus:outline-none focus:border-indigo-500 font-bold"
                  placeholder="GCP Instance project number"
                />
              </div>
            </div>

            {/* Target Subscription Tier Column */}
            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-3.5">
                <span className="block text-[10px] text-[#818cf8] font-bold uppercase font-mono tracking-wider">Select Product Subscription License</span>
                
                <div className="text-center font-mono animate-pulse">
                  {/* Basic */}
                  <div
                    className="p-3.5 border rounded-xl bg-indigo-950/15 border-indigo-500 text-white flex flex-col justify-between items-center"
                  >
                    <span className="text-[10px] font-bold tracking-widest text-indigo-400">ACTIVE LICENSED PLAN: BASIC</span>
                    <span className="text-base font-extrabold mt-1 text-white">$49 USDT / month</span>
                  </div>
                </div>

                <div className="p-3 bg-[#020617]/80 border border-slate-900 rounded-lg text-[10px] text-slate-450 font-mono space-y-1">
                  <div className="flex justify-between">
                    <span>Target Billing:</span>
                    <span className="text-slate-300 font-bold">${pricingRates[targetTier].price}.00 per month recurring</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compute Workers limit:</span>
                    <span className="text-indigo-400 font-bold">{pricingRates[targetTier].workers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Provision project container:</span>
                    <span className="text-yellow-450 font-bold truncate max-w-[150px]">{gcpProject}</span>
                  </div>
                </div>
              </div>

              {/* Action builder button */}
              <button
                onClick={handleGenerateLink}
                className="w-full bg-gradient-to-r from-indigo-500 to-[#818cf8] hover:from-indigo-600 hover:to-[#727ef0] text-slate-950 font-bold uppercase tracking-wide text-xs py-2 rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="h-4.5 w-4.5" /> Assemble Secure Stripe Invite link
              </button>
            </div>

          </div>

          {/* Generated Link section */}
          {generatedUrl && (
            <div className="p-4 bg-[#020617] border border-indigo-900/50 rounded-xl space-y-3 animate-slide-in">
              <div className="flex justify-between items-center border-b border-indigo-950 pb-1.5">
                <span className="text-[10px] text-[#818cf8] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5" /> Generated client self-checkout link
                </span>
                <span className="text-[8px] font-mono text-slate-500 bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-900/35">
                  Secure Callback Enabled
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 bg-[#090d1f] border border-indigo-950 text-[10px] font-mono text-slate-300 rounded px-2.5 py-1.5 outline-none select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded font-mono text-[10px] font-bold cursor-pointer transition-all shrink-0 flex items-center gap-1 ${
                    copiedNotification 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-900' 
                      : 'bg-indigo-950 hover:bg-indigo-900 text-[#818cf8] border border-indigo-900'
                  }`}
                >
                  {copiedNotification ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedNotification ? 'COPIED!' : 'COPY URL'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Method 1: Open sandbox to interact directly */}
                <button
                  onClick={handleLaunchCheckoutInSandbox}
                  className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-900 text-[#818cf8] hover:text-white font-mono font-bold text-[10px] py-2 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 group"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" /> Open Stripe checkout sandbox
                </button>

                {/* Method 2: Simulate Sending email */}
                <button
                  onClick={handleSimulateEmailInvite}
                  disabled={inviteSent}
                  className="bg-slate-950 hover:bg-[#020617] border border-slate-900 disabled:border-slate-850 text-slate-400 disabled:text-slate-600 font-mono font-bold text-[10px] py-2 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" /> 
                  {inviteSent ? '📩 INVITATION DISPATCHED!' : `Send as Email to (${prospectEmail})`}
                </button>
              </div>

              {inviteSent && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-[9px] font-mono text-emerald-400 text-left animate-pulse">
                  📧 SUCCESS: Automated SMTP service has formatted the template and reached {prospectEmail}. The invitation invites them to pay and subscribe to their <b>{targetTier}</b> plan via Google Cloud container nodes cluster {gcpProject}. Once billing finishes, a registered client user node will appear inside the Admin Console statistics.
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* TAB B: STRIPE CUSTOMER CHECKOUT SANDBOX PORTAL */}
      {activeSegment === 'SANDBOX' && (
        <form onSubmit={handleProcessStripePayment} className="space-y-4 animate-fade-in text-left">
          
          <div className="p-3 bg-yellow-950/15 border border-yellow-500/10 rounded-xl flex items-start gap-2.5 text-[10px] font-mono text-slate-400 leading-normal">
            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-200">BINANCE WALLET QUICKPAY SETTLEMENT:</span> Connect and settle SaaS fees using your Binance Wallet. This establishes safe authentication with <b>Binance</b>, <b>Bitget</b>, or <b>Bybit</b> API keys with exact value in USDT.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Left Side: Client Data input form (3 Columns) */}
            <div className="md:col-span-3 space-y-3">
              <span className="block text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Client Billing & Exchange configuration</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 font-mono text-[10px]">
                  <label className="text-slate-500 uppercase">Customer full name</label>
                  <input
                    type="text"
                    required
                    value={clientBillingName}
                    onChange={(e) => setClientBillingName(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-850 text-white text-[10px] rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold"
                    placeholder="Full profile name"
                  />
                </div>
                
                <div className="space-y-1 font-mono text-[10px]">
                  <label className="text-slate-500 uppercase">Customer invoice email</label>
                  <input
                    type="email"
                    required
                    value={clientBillingEmail}
                    onChange={(e) => setClientBillingEmail(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-850 text-white text-[10px] rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    placeholder="Customer email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 font-mono text-[10px]">
                  <label className="text-slate-500 uppercase">Subscription Product Tier</label>
                  <select
                    value={sandboxTier}
                    onChange={(e) => setSandboxTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-[#020617] border border-slate-850 text-indigo-400 text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="BASIC">BASIC TIER - 49 USDT/mo</option>
                  </select>
                </div>

                <div className="space-y-1 font-mono text-[10px]">
                  <label className="text-slate-500 uppercase">GCP Container Project ID</label>
                  <input
                    type="text"
                    required
                    value={clientGcpProject}
                    onChange={(e) => setClientGcpProject(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-850 text-yellow-500 text-[10px] rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-bold font-mono"
                    placeholder="Google project number"
                  />
                </div>
              </div>

              {/* Referrer configuration */}
              <div className="space-y-1 font-mono text-[10px] text-left">
                <label className="text-slate-500 uppercase flex items-center gap-1">
                  <span>👥</span> Introducer Email / Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={clientReferrer}
                  onChange={(e) => setClientReferrer(e.target.value)}
                  className="w-full bg-[#020617] border border-slate-850 text-[#38bdf8] text-[10px] rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-bold"
                  placeholder="EX: oshi@binance.com - Referrer receives 10% checkout commission!"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-805">
                <div className="space-y-1 font-mono text-[10px] text-left">
                  <label className="text-slate-500 uppercase">Target Trading Exchange</label>
                  <select
                    value={selectedExchange}
                    onChange={(e) => setSelectedExchange(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-850 text-sky-450 text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="Binance">Binance</option>
                    <option value="Bitget">Bitget</option>
                    <option value="Bybit">Bybit</option>
                  </select>
                </div>
                <div className="space-y-1 font-mono text-[10px] text-left">
                  <label className="text-slate-500 uppercase">Client API Key ({selectedExchange})</label>
                  <input
                    type="text"
                    required
                    value={binanceKey}
                    onChange={(e) => setBinanceKey(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-850 text-slate-300 text-[9px] rounded px-2 py-1.5 outlines-none"
                    placeholder={`${selectedExchange} API Key`}
                  />
                </div>
                <div className="space-y-1 font-mono text-[10px] text-left">
                  <label className="text-slate-500 uppercase">Client Secret ({selectedExchange})</label>
                  <input
                    type="password"
                    required
                    value={binanceSecret}
                    onChange={(e) => setBinanceSecret(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-850 text-slate-300 text-[9px] rounded px-2 py-1.5 outlines-none"
                    placeholder={`${selectedExchange} Secret`}
                  />
                </div>
              </div>

              {/* BINANCE WALLET SETTLEMENT GROUP */}
              <div className="p-3 bg-[#0c101d] border border-yellow-500/15 rounded-xl space-y-2 text-left font-mono">
                <span className="block text-[9px] text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-yellow-500 text-slate-950 font-bold flex items-center justify-center text-[9px]">B</span> Connected Binance Wallet (Settle with Binance Wallet only)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10.5px]">
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase text-[8px]">Binance Pay ID / Wallet Address</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-850 text-white text-[11px] rounded px-2.5 py-1.5 focus:outline-none focus:border-yellow-500 font-mono tracking-wide"
                      placeholder="e.g. piyumanjaleeoshi@gmail.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase text-[8px]">Secure Transaction Passkey</label>
                    <input
                      type="password"
                      required
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      maxLength={8}
                      className="w-full bg-[#020617] border border-slate-850 text-white text-center rounded py-1.5 font-bold focus:outline-none focus:border-yellow-500"
                      placeholder="Wallet Pin Code"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 select-none text-[10px] text-slate-450 font-mono">
                <input
                  type="checkbox"
                  required
                  id="stripe-license-agreement-box"
                  className="rounded bg-[#020617] border-slate-800 text-indigo-505 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                />
                <label htmlFor="stripe-license-agreement-box" className="cursor-pointer">
                  Authorise dynamic Stripe billing intent and deploy multi-platform container tasks.
                </label>
              </div>

              {sandboxProgress !== 'SUCCESS' && (
                <button
                  type="submit"
                  disabled={sandboxProgress === 'AUTHORIZING'}
                  className="w-full bg-yellow-500 hover:bg-yellow-450 disabled:bg-slate-900 disabled:text-slate-650 text-slate-950 font-extrabold uppercase font-mono py-2.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 text-xs flex items-center justify-center gap-1.5 border-0 shadow-lg"
                >
                  {sandboxProgress === 'AUTHORIZING' ? (
                    'Settle via Binance Wallet...'
                  ) : (
                    <>
                      Pay {pricingRates[sandboxTier].price}.00 USDT Settle via Binance Wallet <ArrowRight className="h-4 w-4 text-slate-950" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right Side: High-Contrast Live Invoice Layout (2 Columns) */}
            <div className="md:col-span-2 space-y-3 flex flex-col justify-start">
              <span className="block text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Dynamic Invoice overview</span>
              
              <div className="bg-[#020617] border border-slate-900 rounded-xl p-4 space-y-4 font-mono text-[10.5px]">
                <div className="flex justify-between items-start border-b border-slate-850 pb-2.5">
                  <div>
                    <span className="text-[12px] text-white font-extrabold">NovaQuant SaaS Corp</span>
                    <span className="block text-[8px] text-slate-550">Quantitative Autopilot Systems Inc.</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#818cf8] font-bold">Checkout Pending</span>
                    <span className="block text-[8px] text-slate-550">Due on Activation</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Subscriber Name:</span>
                    <span className="text-slate-200 font-extrabold truncate max-w-[120px]">{clientBillingName || 'Unnamed Client'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Destination Tier:</span>
                    <span className="text-[#38bdf8] font-bold">{sandboxTier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">GCP Resource ID:</span>
                    <span className="text-yellow-450 font-bold truncate max-w-[110px]">{clientGcpProject}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-905 pt-1.5">
                    <span className="text-slate-450">Monthly SaaS Fee:</span>
                    <span className="text-slate-200">{pricingRates[sandboxTier].price}.00 USDT</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#090d1f] border border-indigo-950 rounded-lg text-slate-450 leading-relaxed text-[10px] text-left">
                  🌐 <b>GCP Provisioning Target:</b> Automated Google Cloud tasks stand up serverless websocket channels using projects node directory <b>{clientGcpProject}</b>. Rate limits elevated corresponding to dynamic {sandboxTier} scale level.
                </div>

                <div className="border-t border-slate-850 pt-2.5 flex justify-between items-baseline">
                  <span className="text-slate-450 font-sans text-xs font-bold uppercase">Total Charges</span>
                  <span className="text-xl font-extrabold text-yellow-400">{pricingRates[sandboxTier].price}.00 USDT</span>
                </div>
              </div>

              {/* Progress Tracker list */}
              {progressLog.length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl space-y-2 text-left">
                  <span className="text-[9px] font-mono font-bold text-slate-450 block uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" /> Webhook Gateway Status logs
                  </span>
                  
                  <div className="space-y-1.5 font-mono text-[9px] max-h-[140px] overflow-y-auto pr-1">
                    {progressLog.map((logStr, lIdx) => (
                      <div key={lIdx} className="text-slate-350 flex items-start gap-1">
                        <span className="text-sky-400 font-extrabold select-none">&gt;</span>
                        <p>{logStr}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Complete Success State & Tax Invoice PDF preview */}
          {sandboxProgress === 'SUCCESS' && selectedInvoice && (
            <div className="p-5 bg-emerald-950/10 border border-emerald-500/35 rounded-2xl space-y-4 animate-slide-in text-left">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-900/40 rounded-full border border-emerald-800">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-sans">SaaS Client Subscription Active!</h4>
                  <p className="text-[10px] text-slate-400 font-mono">CLIENT DIRECTORY UPDATED • INTEGRATION RUNTIME REGISTERED</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-3 font-mono text-[10.5px]">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Receipt tax invoice client document</span>
                  <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded text-[8px] font-extrabold font-mono border border-emerald-900/60">PAID</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="block text-[9px] text-slate-550">TAX INVOICE CODE:</span>
                    <span className="text-slate-200">{selectedInvoice.invoiceId}</span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="block text-[9px] text-slate-550">BILLING STAMP DATE:</span>
                    <span className="text-slate-200">{selectedInvoice.date}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[9px] text-slate-550">CLIENT ACCOUNT:</span>
                    <span className="text-slate-200">{selectedInvoice.client} ({selectedInvoice.email})</span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="block text-[9px] text-slate-550">BILLING RATE TIER:</span>
                    <span className="text-sky-400 font-bold">{selectedInvoice.planName} ({selectedInvoice.amountPaid}.00 USDT/mo)</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[9px] text-slate-550">GCP PROVISION CONTAINER:</span>
                    <span className="text-yellow-450 font-bold truncate block">{selectedInvoice.gcpProject}</span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="block text-[9px] text-slate-550">LOCK SECURE AUTHENTICATOR:</span>
                    <span className="text-indigo-405 truncate block text-[9.5px]">{selectedInvoice.exchangeLockCode}</span>
                  </div>
                </div>

                <p className="text-[8.5px] text-zinc-550 leading-relaxed pt-2 border-t border-slate-900">
                  © 2026 NovaQuant Systems Inc. This document certifies an active rental subscription agreement. Payment terms are net-recurring processed via Binance Wallet Instant Pay channels on Project No {selectedInvoice.gcpProject}. All crypto transactions or websocket trades are client-side configured and safe under client key modules.
                </p>
              </div>

              {/* Reset simulator Button */}
              <div className="flex justify-end gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setSandboxProgress('IDLE');
                    setProgressLog([]);
                  }}
                  className="bg-slate-905 hover:bg-slate-850 text-slate-400 font-mono text-[9px] font-bold py-1.5 px-4 rounded-lg cursor-pointer transition-all border border-slate-800"
                >
                  NEW STRIPE SIMULATION
                </button>
              </div>

            </div>
          )}

        </form>
      )}

      {/* FOOTER NOTICE */}
      <div className="p-3 bg-indigo-950/15 border border-indigo-900/20 rounded-xl flex items-start gap-2 text-[10px] font-mono text-slate-450 leading-normal select-none">
        <Server className="h-4.5 w-4.5 text-[#818cf8] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-350">Client Provisioning Status:</span> Generating checkouts utilizes dynamic parameters to secure payment tokens. Subscribed client nodes instantly inherit full enterprise resources and can bypass normal websocket API throttle rate-limits automatically.
        </div>
      </div>

    </div>
  );
}
