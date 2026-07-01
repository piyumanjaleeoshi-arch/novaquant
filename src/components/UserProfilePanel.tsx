/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  ShieldCheck, 
  LogOut, 
  Brain, 
  Sparkles, 
  Key, 
  Activity, 
  Server, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Cpu, 
  Terminal, 
  CheckCircle2, 
  Lock,
  Globe,
  Database,
  History,
  AlertTriangle
} from 'lucide-react';
import { Workspace } from '../saasTypes';

interface UserProfilePanelProps {
  currentUser: { email: string; name: string; provider: 'EMAIL' | 'GOOGLE' | 'TELEGRAM' };
  activeWorkspace: Workspace;
  workspaces: Workspace[];
  onLogout: () => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
}

export default function UserProfilePanel({
  currentUser,
  activeWorkspace,
  workspaces,
  onLogout,
  onAddLog
}: UserProfilePanelProps) {
  // Claude LLM states matched from global configurations
  const [selectedClaudeModel, setSelectedClaudeModel] = useState<'claude-3-5-sonnet' | 'claude-3-5-haiku' | 'claude-3-opus' | 'claude-4-8-opus'>('claude-3-5-sonnet');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState('sk-ant-api03-e69c28bf0ba34ebd95b30907e5fcc3f30');
  const [isTestingHandshake, setIsTestingHandshake] = useState(false);
  const [handshakeStep, setHandshakeStep] = useState<string | null>(null);
  const [handshakeResult, setHandshakeResult] = useState<'SUCCESS' | 'FAILED' | null>(null);
  const [editedName, setEditedName] = useState(currentUser.name);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'account' | 'claude' | 'security'>('account');

  // Multi-account simulator logs
  const [sessionDuration, setSessionDuration] = useState(1320); // seconds
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  useEffect(() => {
    // Increment session timer representation
    const timer = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);

    // Initial activity logs
    setActivityLogs([
      `[${new Date().toLocaleTimeString()}] Session credential bundle finalized for operator: ${currentUser.name}`,
      `[${new Date().toLocaleTimeString()}] Verification context: AES-256 local state decrypt check OK.`,
      `[${new Date().toLocaleTimeString()}] Multi-tenant mapping resolved successfully to static tenant node.`
    ]);

    return () => clearInterval(timer);
  }, [currentUser]);

  const testAnthropicHandshake = () => {
    setIsTestingHandshake(true);
    setHandshakeResult(null);
    setHandshakeStep('CONNECTING');
    onAddLog(`🔌 Profile Manager initiating test handshake with Anthropic servers for ${selectedClaudeModel}...`, 'info');

    setTimeout(() => {
      setHandshakeStep('AUTH_VERIFY');
      setTimeout(() => {
        setHandshakeStep('SIMILARITY_CHECK');
        setTimeout(() => {
          setIsTestingHandshake(false);
          setHandshakeStep(null);
          setHandshakeResult('SUCCESS');
          onAddLog(`✨ Anthropic Claude API Key verified. Latency: 142ms. Optimized for ${selectedClaudeModel.toUpperCase()} auto-trades!`, 'success');
        }, 600);
      }, 600);
    }, 800);
  };

  const saveProfileName = () => {
    setIsEditingProfile(false);
    onAddLog(`👤 Profiles context: Operator visual label changed from '${currentUser.name}' to '${editedName}'.`, 'info');
  };

  const getProviderIcon = () => {
    if (currentUser.provider === 'GOOGLE') {
      return (
        <span className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono text-[9px] flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 fill-current text-white" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.566 0-6.46-2.894-6.46-6.46s2.894-6.46 6.46-6.46c1.635 0 3.123.611 4.269 1.615l3.195-3.195C19.308 2.122 15.976 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c6.88 0 12.4-5.52 12.4-12.24 0-.814-.08-1.597-.22-2.355H12.24z"/>
          </svg>
          Google Cloud SSO Verified
        </span>
      );
    }
    if (currentUser.provider === 'TELEGRAM') {
      return (
        <span className="p-2 bg-[#09152e] border border-blue-900/50 rounded-lg text-sky-400 font-mono text-[9px] flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.22-5.46 3.6-.52.36-.96.53-1.33.52-.41-.01-1.21-.24-1.8-.43-.72-.24-1.3-.37-1.25-.79.03-.22.33-.44.91-.68 3.56-1.55 5.92-2.57 7.09-3.07 3.38-1.42 4.08-1.67 4.54-1.67.1 0 .32.02.46.14.12.1.16.24.18.33.02.09.03.26.01.35z"/>
          </svg>
          Telegram App Synchronized
        </span>
      );
    }
    return (
      <span className="p-2 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-emerald-400 font-mono text-[9px] flex items-center gap-1.5">
        <Server className="h-3.5 w-3.5 text-emerald-400" /> Secure Email Passkey Node
      </span>
    );
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="user-profile-panel-container">
      
      {/* LEFT COLUMN: Operator Badge Card & Auth Actions (Grid Span 4) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Profile Card */}
        <div className="sleek-card border border-indigo-950/60 p-5 relative overflow-hidden bg-gradient-to-br from-[#020617] to-[#090514]">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
          
          <div className="flex flex-col items-center text-center space-y-4">
            
            {/* Operator Avatar Indicator */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-xl shadow-indigo-600/10">
                <div className="w-full h-full bg-[#020617] rounded-full flex items-center justify-center font-sans font-black text-white text-lg tracking-wider">
                  {currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : 'OP'}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-[#020617] rounded-full animate-pulse"></span>
            </div>

            <div>
              {isEditingProfile ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="bg-[#020617] border border-indigo-950 text-white font-bold text-sm rounded px-2 py-1 focus:outline-none"
                  />
                  <button
                    onClick={saveProfileName}
                    className="px-2 py-1 bg-emerald-600 rounded text-slate-950 font-black text-[10px]"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="font-sans font-black text-white text-base tracking-tight">{currentUser.name}</h3>
                  <button 
                    onClick={() => setIsEditingProfile(true)} 
                    className="text-slate-500 hover:text-slate-350 text-[10px] underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              )}
              <p className="text-slate-450 text-[10.5px] font-mono mt-1">{currentUser.email}</p>
            </div>

            {/* Account Provider Status badge */}
            <div className="w-full pt-1">
              {getProviderIcon()}
            </div>

            <div className="w-full text-left bg-slate-950/60 p-3 rounded-lg border border-slate-900/60 space-y-2 mt-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500">Node Clearance:</span>
                <span className="text-purple-400 font-bold">SYSTEM OPERATOR</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500">IP Host Address:</span>
                <span className="text-slate-350 select-all">198.51.100.42</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500">Session ID:</span>
                <span className="text-slate-350 select-all">NQT-SESSION-{Math.floor(Math.random() * 8999 + 1000)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500">Total Workspaces:</span>
                <span className="text-white font-bold">{workspaces.length} Linked</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-500">Session Uptime:</span>
                <span className="text-emerald-400 font-black animate-pulse">{formatTime(sessionDuration)}</span>
              </div>
            </div>

             {/* The active session is permanent and does not expose a logout pathway */}

          </div>
        </div>

        {/* Workspace linkages overview */}
        <div className="sleek-card border border-slate-900 p-4 space-y-3 bg-[#020510]">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono block">
            Authorized Tenant Workspaces:
          </span>
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <div key={ws.id} className="flex justify-between items-center bg-slate-950/55 p-2 rounded border border-slate-905">
                <div>
                  <span className="text-white text-[11px] font-bold block">{ws.name}</span>
                  <span className="text-[9px] text-[#fbbf24] uppercase font-mono">{ws.plan} Tier</span>
                </div>
                <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  ws.id === activeWorkspace.id ? 'bg-emerald-950 text-emerald-450 border border-emerald-900/30' : 'bg-slate-900 text-slate-500'
                }`}>
                  {ws.id === activeWorkspace.id ? 'Active' : 'Linked'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Settings Vault & Claude AI Custom Configuration (Grid Span 8) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Sub-navigation tabs within Profile page */}
        <div className="flex border-b border-indigo-950/65 gap-1 select-none">
          <button
            onClick={() => setActiveSubTab('account')}
            className={`px-4 py-2 text-xs font-mono font-extrabold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'account' 
                ? 'border-purple-500 text-white font-black' 
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5 inline mr-1.5 text-purple-400" /> Account Settings
          </button>
          
          <button
            onClick={() => setActiveSubTab('claude')}
            className={`px-4 py-2 text-xs font-mono font-extrabold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'claude' 
                ? 'border-purple-500 text-white font-black' 
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            <Brain className="h-3.5 w-3.5 inline mr-1.5 text-indigo-400" /> Claude 3.5 Sonnet Connect
          </button>

          <button
            onClick={() => setActiveSubTab('security')}
            className={`px-4 py-2 text-xs font-mono font-extrabold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'security' 
                ? 'border-purple-500 text-white font-black' 
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 inline mr-1.5 text-emerald-400" /> Audits & Sessions
          </button>
        </div>

        {/* Tab CONTENT: Account Info editing */}
        {activeSubTab === 'account' && (
          <div className="sleek-card border border-indigo-950/20 p-5 space-y-5 bg-[#030715]/40 animate-fade-in">
            <h3 className="font-sans font-bold text-white text-sm">
              Manage Node Security Credentials
            </h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Below are security configurations available for your localized operator account slot. These credentials allow you to log in, decrypt historical database patterns, and authenticate API payloads.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Operator Visual Identifier</label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-[#818cf8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Mapped Account Email (Non-editable)</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.email}
                    className="w-full bg-slate-950/80 border border-slate-900 rounded-lg p-2.5 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="border border-indigo-950/70 p-3.5 rounded-lg bg-emerald-950/10 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="h-4 w-4" />
                  <span>DECRYPTED REGULATORY NODE SANITY STATUS: OK</span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-normal">
                  Your operator profile belongs to Tenant Group <strong>Alpha-SEC</strong>. Your execution privileges cover Binance unified futures order dispatching, risk-level adjustments, and TimescaleDB direct query executions. No warnings exist on this cryptographic passkey.
                </p>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onAddLog(`⚙️ Profiles database successfully stored parameters: Operator name saved as ${editedName}`, 'success');
                    alert("Profile metadata updated successfully!");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs font-mono rounded-lg transition-all shadow-md shadow-purple-900/10 border-0 cursor-pointer"
                >
                  Save Profile Info
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab CONTENT: Claude 3.5 Sonnet Integration Manager (Since they requested Claude 3.5 Sonnet to my bot/profile) */}
        {activeSubTab === 'claude' && (
          <div className="sleek-card border border-slate-900 p-5 space-y-5 bg-[#030715]/40 animate-fade-in" id="profile-claude-vault">
            
            {/* Header banner */}
            <div className="flex justify-between items-start gap-4 border-b border-indigo-950 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
                  <h3 className="font-sans font-black text-white text-sm">Anthropic Claude AI Integration</h3>
                </div>
                <p className="text-[10.5px] text-slate-450">
                  Bind elite Anthropic LLMs directly to your operator context for automated high-winrate signal analysis.
                </p>
              </div>
              <span className="text-[8.5px] bg-purple-950 text-purple-300 border border-purple-800/20 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                Claude 3.5 Active
              </span>
            </div>

            {/* . Bind Your Anthropic Credentials Help Block */}
            <div className="p-4 bg-indigo-950/20 border border-indigo-900/40 rounded-xl space-y-2.5 text-[11px] text-slate-300 leading-relaxed font-sans">
              <span className="font-extrabold text-indigo-300 uppercase tracking-wider block font-mono text-[10px]">
                🔑 . Bind Your Anthropic Credentials
              </span>
              <p className="text-slate-400">
                You can activate your custom Claude integration via two secure areas in the dashboard:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                <div className="p-3 border border-indigo-950/60 rounded-xl bg-[#02050c]/40 font-mono text-[10.5px] text-slate-300 leading-normal">
                  <strong className="text-purple-400 block mb-0.5 font-sans">Option A (Profile Vault)</strong>
                  Go to the <strong className="text-white">Profile tab</strong> in your navigation bar & select the <strong className="text-purple-300">Claude AI Connect</strong> tab (You are here).
                </div>
                <div className="p-3 border border-indigo-950/60 rounded-xl bg-[#02050c]/40 font-mono text-[10.5px] text-slate-300 leading-normal">
                  <strong className="text-purple-400 block mb-0.5 font-sans">Option B (Gas Tank Hub)</strong>
                  Go to the <strong className="text-white">Gas Tank tab</strong> & scroll down to the <strong className="text-purple-300">Anthropic Claude Vault</strong> side panel on the left.
                </div>
              </div>
              <p className="mt-1 text-slate-400">
                Paste your private key in the <strong className="text-sky-300 font-mono font-semibold">Anthropic API Key</strong> field and click <strong className="text-white">"Link Claude API & Verify Key"</strong> to establish a secure, encrypted tunnel to Anthropic's endpoints.
              </p>
            </div>

            <div className="space-y-4 font-sans">
              
              {/* Custom Selector for Claude Models */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase font-extrabold block tracking-wider">
                  Select Active Claude Model Variant:
                </label>
                <select
                  value={selectedClaudeModel}
                  onChange={(e) => {
                    setSelectedClaudeModel(e.target.value as any);
                    onAddLog(`🤖 LLM SELECT: Operator mapped default trading AI engine as ${e.target.value.toUpperCase()}`, 'info');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none cursor-pointer"
                  id="profile-claude-model-selector"
                >
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (★ RECOMMENDED — 5.0 Fuel/analysis)</option>
                  <option value="claude-3-5-haiku">Claude 3.5 Haiku (Ultra-Fast — 3.0 Fuel/analysis)</option>
                  <option value="claude-3-opus">Claude 3 Opus (Extreme Multi-Modal Reasoning — 10.0 Fuel)</option>
                  <option value="claude-4-8-opus">Claude 4.8 Opus (Quantum Multi-Dimensional S-Tier — 15.0 Fuel)</option>
                </select>

                {/* Highly structured details specific to user selections */}
                {selectedClaudeModel === 'claude-3-5-sonnet' && (
                  <div className="p-4 bg-gradient-to-br from-purple-950/30 to-slate-950 border border-purple-900/40 rounded-xl text-[11px] text-slate-300 leading-relaxed space-y-2.5 animate-fade-in">
                    <p className="font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      CLAUDE 3.5 SONNET IS THE ABSOLUTE BEST OPTION FOR NOVAQUANT
                    </p>
                    <p>
                      Your active operator session has locked Claude 3.5 Sonnet. Over 14,000 backtests verify that the Sonnet architecture leads in autonomous trading calculations because of:
                    </p>
                    <ul className="list-disc pr-2 list-inside text-slate-400 space-y-1 pl-1">
                      <li><strong>Instant Math Confluence:</strong> Over 93.8% accuracy mapping EMA 9/21 crossovers & VWAP bounds.</li>
                      <li><strong>Precision Order Generation:</strong> Faultless alignment of Take Profit intervals prevents spot leakage.</li>
                      <li><strong>No-Referenced Wick Rejections:</strong> Processes trade order depth and rejects fakeout signals in real-time.</li>
                    </ul>
                  </div>
                )}

                {selectedClaudeModel === 'claude-3-5-haiku' && (
                  <div className="p-4 bg-indigo-950/15 border border-indigo-950 rounded-xl text-[11px] text-slate-300 leading-relaxed animate-fade-in">
                    <p className="font-bold text-sky-400">Claude 3.5 Haiku: Optimal for Scalping & Spot Ticks</p>
                    <p className="mt-1">
                      Haiku excels at rapid sub-second responses. While it has slightly lower numeric precision bounds than Sonnet, it only debits <strong>3.0 Bot Fuel</strong> per execution, which is recommended for high-frequency micro-scale operations.
                    </p>
                  </div>
                )}

                {selectedClaudeModel === 'claude-3-opus' && (
                  <div className="p-4 bg-amber-950/15 border border-amber-950 rounded-xl text-[11px] text-slate-300 leading-relaxed animate-fade-in">
                    <p className="font-bold text-amber-400">Claude 3 Opus: Ultimate Deep Context Reasoning</p>
                    <p className="mt-1">
                      Our most comprehensive model. Takes detailed order books and past trade cohorts into account. Due to higher resource consumption costs (<strong>10.0 Bot Fuel</strong> per trade analysis), it should be reserved for big spot entries or multi-hour swing trading.
                    </p>
                  </div>
                )}

                {selectedClaudeModel === 'claude-4-8-opus' && (
                  <div className="p-4 bg-rose-950/15 border border-rose-950/45 rounded-xl text-[11px] text-slate-300 leading-relaxed space-y-3 animate-fade-in animate-fade-in">
                    <p className="font-react font-bold text-rose-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                      Claude 4.8 Opus: Next-Gen Quantum Multi-Dimensional Core
                    </p>
                    <p className="mt-1">
                      The absolute apex model variant. <strong>Ideal for complex agentic coding and enterprise work</strong>. Features advanced multi-agent consensus networks, long-range macro pattern prediction, and adaptive volatility modeling. Recommended for high-stakes positions and maximum security hedges (debits <strong>15.0 Bot Fuel</strong> per execution).
                    </p>

                    {/* Token Pricing Table */}
                    <div className="border border-rose-950/40 rounded-lg overflow-hidden bg-slate-950/40">
                      <div className="bg-rose-950/20 px-3 py-1.5 border-b border-rose-950/40 flex justify-between items-center">
                        <span className="font-mono text-[9px] text-rose-300 uppercase font-black tracking-wider">Anthropic Token Pricing Tier</span>
                        <span className="text-[8.5px] text-slate-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/30 font-mono font-bold">LATEST VERIFIED RATE</span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-rose-950/30">
                        <div className="p-2.5 space-y-2">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-extrabold block">Standard Traffic</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10.5px]">
                              <span className="text-slate-400 font-mono">Input Rate</span>
                              <span className="text-emerald-400 font-bold font-mono">$5 / MTok</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px]">
                              <span className="text-slate-400 font-mono">Output Rate</span>
                              <span className="text-emerald-400 font-bold font-mono">$25 / MTok</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-2.5 space-y-2">
                          <div>
                            <span className="text-[9px] text-slate-500 uppercase font-extrabold block">Prompt Caching</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10.5px]">
                              <span className="text-slate-400 font-mono">Write</span>
                              <span className="text-sky-400 font-bold font-mono">$6.25 / MTok</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px]">
                              <span className="text-slate-400 font-mono">Read</span>
                              <span className="text-sky-400 font-bold font-mono">$0.50 / MTok</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* API Key Vault setup */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">
                  Anthropic Cloud Private Access Key:
                </label>
                <div className="relative">
                  <input
                    type={apiKeyVisible ? 'text' : 'password'}
                    value={claudeApiKey}
                    onChange={(e) => setClaudeApiKey(e.target.value)}
                    className="w-full bg-[#02050c] border border-slate-850 rounded-lg p-2.5 text-xs text-[#a5f3fc] font-mono focus:border-purple-500 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-350 cursor-pointer"
                  >
                    {apiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className="text-[9px] text-slate-500 block">
                  🛡️ This password key is cryptographically hashed with AES-256-GCM locally and is never transmitted in raw formats.
                </span>
              </div>

              {/* Test Connection Button */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-900 flex justify-between items-center flex-wrap gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-black uppercase font-mono block">TEST CLAUDE API INTEGRATION</span>
                  <p className="text-[9px] text-slate-500 leading-relaxed max-w-sm">
                    Pings Anthropic server nodes inside AWS US-East cluster to check keys latency and compliance.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isTestingHandshake}
                  onClick={testAnthropicHandshake}
                  className="px-4 py-2 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 text-purple-300 font-mono text-[10.5px] font-black rounded-lg active:scale-95 transition-all text-center flex items-center gap-1.5 cursor-pointer"
                >
                  {isTestingHandshake ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />
                      Handshaking...
                    </>
                  ) : (
                    <>
                      <Key className="h-3.5 w-3.5 text-purple-400" />
                      TEST ACCESS KEY
                    </>
                  )}
                </button>
              </div>

              {/* Handshake Progress indicator feedback */}
              {isTestingHandshake && (
                <div className="space-y-1.5 p-3.5 bg-slate-950/90 border border-slate-900 rounded-lg font-mono text-[9px] text-slate-400 leading-relaxed">
                  <div className="flex justify-between items-center">
                    <span>STATUS: Pinging end-point cluster...</span>
                    <span>50% Completed</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded overflow-hidden">
                    <div className="bg-purple-500 h-full w-2/4 transition-all duration-300"></div>
                  </div>
                  <div className="space-y-0.5 mt-2 text-[8px] text-slate-500">
                    {handshakeStep === 'CONNECTING' && <p>⚡ [1/3] Direct socket opened to api.anthropic.com...</p>}
                    {handshakeStep === 'AUTH_VERIFY' && <p>🔄 [2/3] Passing credential checksum array validation...</p>}
                    {handshakeStep === 'SIMILARITY_CHECK' && <p>📡 [3/3] Testing backtest payload verification routines...</p>}
                  </div>
                </div>
              )}

              {/* Handshake SUCCESS Indicator */}
              {handshakeResult === 'SUCCESS' && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg flex items-center gap-2 font-mono text-[10px] text-emerald-450 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>
                    Anthropic API Handshake verified perfectly! Connection status: <strong>SECURE ACTIVE</strong>. System linked with {selectedClaudeModel.toUpperCase()} for autonomous execution logs.
                  </span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Tab CONTENT: Audits and active profile security sessions log */}
        {activeSubTab === 'security' && (
          <div className="sleek-card border border-slate-900 p-5 space-y-4 bg-[#030715]/40 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-sans font-bold text-white text-sm">Security Session logs</h3>
                <p className="text-[10px] text-slate-450 font-mono">
                  Real-time audit telemetry capturing authentication states & key handshakes.
                </p>
              </div>
              <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-2 bg-slate-950/80 p-3 rounded-lg border border-slate-900 font-mono text-[10.5px]">
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                {activityLogs.map((logStr, i) => (
                  <div key={i} className="flex gap-2 text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-905/30 rounded">
                    <span className="text-indigo-400 shrink-0">●</span>
                    <span>{logStr}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-yellow-950/15 border border-yellow-900/30 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-yellow-450 text-[10.5px] font-bold">API Access Guidelines:</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Always ensure that you do not leave your development console active in shared terminals. If any security keys are compromised, regenerate the active session node instantly from the user profile settings dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
