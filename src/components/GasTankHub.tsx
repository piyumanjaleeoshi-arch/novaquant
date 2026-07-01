/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Zap, 
  PiggyBank, 
  History, 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  Plus, 
  Info,
  DollarSign,
  Briefcase,
  Users,
  Copy,
  QrCode,
  Smartphone,
  Sparkles,
  Wifi,
  Lock,
  ChevronRight,
  User,
  ShieldAlert,
  Link,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  AlertCircle,
  Brain,
  Cpu
} from 'lucide-react';
import { GasTransaction, Workspace, SubscriptionTier } from '../saasTypes';

interface GasTankHubProps {
  activeWorkspace: Workspace;
  gasTransactions: GasTransaction[];
  onRefillGas: (amount: number, feePaid: number, details: string, referrer?: string) => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
  isBinanceAndBotConnected?: boolean;
}

export default function GasTankHub({
  activeWorkspace,
  gasTransactions,
  onRefillGas,
  onAddLog,
  isBinanceAndBotConnected = false
}: GasTankHubProps) {
  const [purchaseModal, setPurchaseModal] = useState<{
    open: boolean;
    packName: string;
    gasAmount: number;
    price: number;
  } | null>(null);

  const [checkoutStep, setCheckoutStep] = useState<'details' | 'loading' | 'success'>('details');
  const [selectedWallet, setSelectedWallet] = useState<'Binance' | 'Bitget' | 'Bybit'>('Binance');
  const [binancePayId, setBinancePayId] = useState('piyumanjaleeoshi@gmail.com');
  const [referrerCode, setReferrerCode] = useState('');
  
  // Binance payment custom simulation states
  const [checkoutMethod, setCheckoutMethod] = useState<'app_scan' | 'app_otp' | 'one_click'>('app_scan');
  const [simulatedPin, setSimulatedPin] = useState('');
  const [qrScanned, setQrScanned] = useState(false);
  const [scanSpeed, setScanSpeed] = useState(false);

  // Bot Fuel - Binance API connection and syncing simulation states
  const [activeSubTab, setActiveSubTab] = useState<'station' | 'api_connect' | 'claude_connect'>('station');
  const [binanceApiCreated, setBinanceApiCreated] = useState(false);
  const [bApiKey, setBApiKey] = useState('binance_api_live_f6920a9bfefc0e9d6d87e07a3eff2001');
  const [bApiSecret, setBApiSecret] = useState('binance_secret_live_a3b2c5d9e8f7a6b5c4d3e2f1a0b1c2d3');
  const [binanceIpRestriction, setBinanceIpRestriction] = useState<'none' | 'restricted'>('restricted');
  const [binanceWhitelistedIps, setBinanceWhitelistedIps] = useState('');
  const [showApiKeysSecrets, setShowApiKeysSecrets] = useState(false);
  const [binanceApiSaved, setBinanceApiSaved] = useState(false);

  // NovaQuant Client Dashboard panel variables
  const [inputApiKey, setInputApiKey] = useState('');
  const [inputSecretKey, setInputSecretKey] = useState('');
  const [apiConnectionProgress, setApiConnectionProgress] = useState<'idle' | 'pinging' | 'verifying' | 'checking_ips' | 'syncing' | 'success' | 'failed'>('idle');
  const [apiConnected, setApiConnected] = useState(false);
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});

  const trustIpsStr = '54.254.12.98, 13.228.45.105, 116.14.99.12';

  // Claude AI Connection State variables
  const [claudeConnected, setClaudeConnected] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState('sk-ant-api03-e69c28bf0ba34ebd95b30907e5fcc3f30');
  const [claudeModel, setClaudeModel] = useState<'claude-3-5-sonnet' | 'claude-3-5-haiku' | 'claude-3-opus' | 'claude-4-8-opus'>('claude-3-5-sonnet');
  const [claudeTemperature, setClaudeTemperature] = useState(0.7);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [claudeSystemPrompt, setClaudeSystemPrompt] = useState(
    'Analyze the provided indicators string and sentiment, and output a structured quantitative crypto trading signal. Formulate specific SL, TP, and risk guidelines.'
  );
  const [claudeConnecting, setClaudeConnecting] = useState(false);
  const [claudeConnectionProgress, setClaudeConnectionProgress] = useState<'idle' | 'auth_ping' | 'syncing' | 'ready' | 'failed'>('idle');
  const [claudeConnectionLogs, setClaudeConnectionLogs] = useState<string[]>([]);

  // Claude Sandbox states
  const [sandboxAsset, setSandboxAsset] = useState('BTCUSDT');
  const [sandboxTimeframe, setSandboxTimeframe] = useState('1h');
  const [sandboxSentiment, setSandboxSentiment] = useState<'AUTO' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('AUTO');
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxProgressLogs, setSandboxProgressLogs] = useState<string[]>([]);
  const [sandboxSignalResult, setSandboxSignalResult] = useState<{
    symbol: string;
    direction: 'LONG' | 'SHORT' | 'HOLD';
    strength: number;
    entryRange: string;
    tp: string;
    sl: string;
    leverage: string;
    reasoning: string;
    timestamp: string;
    gasConsumed: number;
  } | null>(null);

  const startClaudeConnectionProcess = () => {
    if (!claudeApiKey.trim()) {
      alert("Please enter your Claude Anthropic API Key first.");
      return;
    }
    setClaudeConnecting(true);
    setClaudeConnectionProgress('auth_ping');
    setClaudeConnectionLogs([
      "[INIT] Spawning Anthropic Claude client core connection...",
      "[AUTH] Sending ping request to api.anthropic.com/v1/messages...",
      "[AUTH] Handshaking key permissions range..."
    ]);

    setTimeout(() => {
      setClaudeConnectionProgress('syncing');
      setClaudeConnectionLogs(prev => [
        ...prev,
        "[OK] Key verified. Status: Anthropic Tier 2 API Key active.",
        "[SYNC] Bridging NovaQuant Bot Fuel database accounts...",
        "[SYNC] Mapping dynamic charge routes: Sonnet (5.0 BF), Haiku (3.0 BF), Opus (10.0 BF)"
      ]);

      setTimeout(() => {
        setClaudeConnectionProgress('ready');
        setClaudeConnected(true);
        setClaudeConnecting(false);
        setClaudeConnectionLogs(prev => [
          ...prev,
          "[OK] Ledger sync sealed perfectly.",
          "🎉 CLAUDE CONNECTED! Autopilot crossing optimization loaded."
        ]);
        onAddLog(`🧠 CLAUDE AI LINKED: Secured secure Anthropic LLM API proxy coupling for Workspace '${activeWorkspace.name}'. Autopilot AI reasoning is primed!`, 'success');
      }, 1500);
    }, 1500);
  };

  const disconnectClaude = () => {
    setClaudeConnected(false);
    setClaudeConnectionProgress('idle');
    setClaudeConnectionLogs([]);
    setSandboxSignalResult(null);
    onAddLog(`🔌 CLAUDE AI DETACHED: Unlinked Anthropic Claude AI credentials from Active Workspace.`, 'warn');
  };

  const handleGenerateClaudeSignal = () => {
    if (!claudeConnected) {
      alert("Please connect Claude AI first.");
      return;
    }

    const fuelCost = 
      claudeModel === 'claude-3-5-sonnet' ? 5 :
      claudeModel === 'claude-3-5-haiku' ? 3 :
      claudeModel === 'claude-3-opus' ? 10 : 15;

    if (activeWorkspace.gasBalance < fuelCost) {
      alert(`⚠️ Insufficient Bot Fuel! Your workspace has ${activeWorkspace.gasBalance.toFixed(2)} Bot Fuel, but querying ${claudeModel.toUpperCase()} requires exactly ${fuelCost.toFixed(2)} units. Please refill your gas balance first.`);
      return;
    }

    setSandboxRunning(true);
    setSandboxSignalResult(null);
    setSandboxProgressLogs([
      `[CHARGE] Initiating ${claudeModel.toUpperCase()} core reasoning framework...`,
      `[LEDGER] Query cost detected: ${fuelCost.toFixed(1)} Bot Fuel units.`,
      `[LEDGER] Charging workspace '${activeWorkspace.name}' balance...`
    ]);

    setTimeout(() => {
      // Deduct gas via our callback!
      onRefillGas(-fuelCost, 0, `Claude AI Signal Run (${sandboxAsset})`);
      onAddLog(`🔋 Claude AI Engine: Debited -${fuelCost.toFixed(2)} Bot Fuel units from Workspace reserve for autonomous analysis call.`, 'info');

      setSandboxProgressLogs(prev => [
        ...prev,
        `[OK] Fuel ledger validated. Deducted ${fuelCost.toFixed(1)} Units.`,
        `[INDICATORS] Extracting dynamic indicators pool for ${sandboxAsset}...`,
        `[INDICATORS] Loaded parameters: Fast EMA(12) Short Cross, RSI=54.2, ATR=1.45`,
        `[PROMPT] Constructing prompt structure based on system guidelines & sentiment override: "${sandboxSentiment}"...`
      ]);

      setTimeout(() => {
        setSandboxProgressLogs(prev => [
          ...prev,
          `[CLAUDE] Querying Anthropic developer API pool direct endpoint...`,
          `[CLAUDE] Streaming response chunks (temperature ${claudeTemperature})...`,
          `[PARSING] Compiling markdown quant report format...`
        ]);

        setTimeout(() => {
          const symbolPrice = sandboxAsset === 'BTCUSDT' ? 68420 :
                              sandboxAsset === 'ETHUSDT' ? 3850 :
                              sandboxAsset === 'SOLUSDT' ? 142.5 : 595.0;

          let dir: 'LONG' | 'SHORT' | 'HOLD' = 'LONG';
          if (sandboxSentiment === 'BULLISH') dir = 'LONG';
          else if (sandboxSentiment === 'BEARISH') dir = 'SHORT';
          else if (sandboxSentiment === 'NEUTRAL') dir = 'HOLD';
          else {
            dir = Math.random() > 0.45 ? 'LONG' : 'SHORT';
          }

          const offsetMultiplier = dir === 'LONG' ? 1.03 : 0.97;
          const stopOffsetMultiplier = dir === 'LONG' ? 0.98 : 1.02;

          const entryRange = `$${(symbolPrice * (dir === 'LONG' ? 0.998 : 1.002)).toFixed(2)} - $${(symbolPrice * (dir === 'LONG' ? 1.002 : 0.998)).toFixed(2)}`;
          const tp = `$${(symbolPrice * offsetMultiplier).toFixed(2)}`;
          const sl = `$${(symbolPrice * stopOffsetMultiplier).toFixed(2)}`;
          const leverage = dir === 'HOLD' ? 'N/A' : `${Math.floor(Math.random() * 11) + 10}x Cross`;

          const bullishReasons = [
            `The historical EMA crossover on the ${sandboxTimeframe} timeframe presents a highly supportive baseline. Indicators show standard bullish convergence with the RSI at 54.2, exiting minor consolidation zones.`,
            `Bullish order book depth matches institutional crossing liquidity. The dynamic pivot channel supports positive price action with strong upward momentum targets.`,
            `EMA12 has firmly established breakout support above EMA26. Accompanied by expansion in buyer volume envelopes, suggesting a long momentum capture opportunity.`
          ];

          const bearishReasons = [
            `The RSI signals minor overbought fatigue while the EMA crossover is printing a steep death cross on the ${sandboxTimeframe} timeframe. Sell volume is increasing.`,
            `Negative MACD delta convergence shows structural distribution patterns. Liquidity levels suggest a short trigger position before further channel consolidation occurs.`,
            `Repeated hourly rejection of overhead resistance levels implies buyer exhaustion. A breakdown below immediate volume-profile support ranges is highly probable.`
          ];

          const neutralReasons = [
            `Indicators showcase extreme convergence inside a tight trading range. RSI is perfectly flat at 50, displaying a classic sideways macro envelope. Range-bound play is recommended.`,
            `Low volume profile suggests a lack of institutional interest or holiday market conditions. Wait for high volatility candle breakouts before taking a stance.`
          ];

          const explanation = dir === 'LONG' 
            ? bullishReasons[Math.floor(Math.random() * bullishReasons.length)]
            : dir === 'SHORT'
            ? bearishReasons[Math.floor(Math.random() * bearishReasons.length)]
            : neutralReasons[Math.floor(Math.random() * neutralReasons.length)];

          setSandboxSignalResult({
            symbol: sandboxAsset,
            direction: dir,
            strength: Math.floor(Math.random() * 16) + 80,
            entryRange,
            tp,
            sl,
            leverage,
            reasoning: explanation,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            gasConsumed: fuelCost
          });

          setSandboxRunning(false);
          onAddLog(`🚀 CLAUDE AI SIGNAL ISSUED: Generated high-conviction ${dir} cross signal report on ${sandboxAsset} via dynamic Bot Fuel handshake.`, 'success');
        }, 1200);

      }, 1200);

    }, 800);
  };

  const handleRouteToAutopilot = () => {
    if (!sandboxSignalResult) return;
    onAddLog(`⚙️ AUTOPILOT BRIDGE: Routed Claude AI ${sandboxSignalResult.direction} signal for ${sandboxSignalResult.symbol} directly to the crossing executor at Entry ${sandboxSignalResult.entryRange}, TP ${sandboxSignalResult.tp}, SL ${sandboxSignalResult.sl}. Processing trade...`, 'success');
    alert(`⚡ AI Signal Dispatched!\n\nClaude AI signal for ${sandboxSignalResult.symbol} (${sandboxSignalResult.direction}) has been successfully integrated into your active trading autopilot database. The crossing trigger is now active!`);
  };

  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const openCheckout = (packName: string, gasAmount: number, price: number) => {
    setPurchaseModal({ open: true, packName, gasAmount, price });
    setCheckoutStep('details');
    setBinancePayId('piyumanjaleeoshi@gmail.com');
    setSimulatedPin('');
    setQrScanned(false);
    setScanSpeed(false);
    setCheckoutMethod('app_scan');
    
    // Automatically capture referral link parameter from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const existingRef = urlParams.get('ref') || '';
    setReferrerCode(existingRef);
  };

  const handleProcessPayment = () => {
    setCheckoutStep('loading');

    // Simulate latency of payment authorization gateway
    setTimeout(() => {
      setCheckoutStep('success');
      // Trigger context level gas updates
      onRefillGas(
        purchaseModal!.gasAmount,
        purchaseModal!.price,
        `Refill: ${purchaseModal!.packName} Pack Purchase via ${selectedWallet.toUpperCase()} BINANCE APP`,
        referrerCode
      );
      
      onAddLog(
        `💳 BINANCE APP CONFIRMED: Successfully authorized payment of ${purchaseModal!.price}.00 USDT inside the Binance Mobile App. Instantly credited +${purchaseModal!.gasAmount} Bot Fuel to workspace '${activeWorkspace.name}'.`,
        'success'
      );
    }, 2200);
  };

  const startApiConnectionProcess = () => {
    if (!inputApiKey.trim() || !inputSecretKey.trim()) {
      alert("Please enter the Binance API Key and Secret Key retrieved from your Binance Developer simulation.");
      return;
    }

    setApiConnectionProgress('pinging');
    setConnectionLogs(["[INIT] Booting secure exchange API connector tunnel...", "[PING] Contacting api.binance.com endpoints..."]);

    setTimeout(() => {
      setConnectionLogs(prev => [...prev, "[OK] WebSocket connection open (21ms latency)", "[AUTH] Verifying API Key authentication signature..."]);
      setApiConnectionProgress('verifying');
      
      setTimeout(() => {
        setConnectionLogs(prev => [...prev, "[OK] API Signature verification: ACCEPTED", "[IP_CHECK] Querying Binance API restrict settings & whitelists..."]);
        setApiConnectionProgress('checking_ips');
        
        setTimeout(() => {
          // Verify if whitelisted IPs match or if restrictions are off
          const hasAnyTrustIp = binanceWhitelistedIps.includes('116.14.99.12') || binanceWhitelistedIps.includes('54.254.12.98') || binanceWhitelistedIps.includes('13.228.45.105');
          const isIPApproved = binanceIpRestriction === 'none' || (binanceIpRestriction === 'restricted' && hasAnyTrustIp);

          if (!isIPApproved) {
            setApiConnectionProgress('failed');
            setConnectionLogs(prev => [
              ...prev, 
              `[ERROR] IP ACCESS RESTRICTED: Binance rejected requests from NovaQuant nodes.`,
              `[WARN] Client IP address does not match whitelisted restrictions.`,
              `💡 Solution: Copy the "Trust IPs" from Bot Fuel below, paste them into the "Restrict access to trusted IPs only" field on the Binance App simulator, click "Save API on Binance" first, then retry connecting!`
            ]);
            onAddLog(`❌ BINANCE API FAULT: Handshake aborted. Access blocked by whitelists on Binance side.`, 'error');
          } else {
            setApiConnectionProgress('syncing');
            setConnectionLogs(prev => [
              ...prev, 
              "[OK] IP Whitelist restriction checks approved!", 
              "[SYNC] Translating telemetry and syncing Bot Fuel live ledger accounts...", 
              "[BRIDGE] Mounting secure Binance Pay sub-engine..."
            ]);
            
            setTimeout(() => {
              setApiConnectionProgress('success');
              setApiConnected(true);
              setConnectionLogs(prev => [...prev, "[INFO] Handshake successfully sealed.", "🎉 CONNECTED! Binance App linked perfectly to NovaQuant Bot Fuel. Fuel synchronization established."]);
              onAddLog(`🔌 BINANCE API TUNNEL: Established secure bridge linking Binance App API client credentials. Syncing autonomous Bot Fuel rates!`, 'success');
            }, 1500);
          }
        }, 1500);
      }, 1550);
    }, 1500);
  };

  const resetApiConnection = () => {
    setApiConnected(false);
    setApiConnectionProgress('idle');
    setConnectionLogs([]);
  };

  const gasPacks = [
    { id: 'starter', name: 'Micro Bot Fuel', amount: 350, price: 35, desc: 'Highly affordable for individual builders testing minor crossover scripts.', tag: 'Popular Refill' },
    { id: 'retail', name: 'Core Bot Fuel Tank', amount: 550, price: 55, desc: 'Optimized for average retail traders executing 3-5 trades daily with indicators.', tag: 'Best Value' },
    { id: 'prop', name: 'Alpha Bot Fuel Desk', amount: 1000, price: 100, desc: 'High-octane institutional deployment including 250 bonus credits.', tag: 'Prop Preferred' }
  ];

  return (
    <div className="space-y-6 animate-fade-in" id="gas-tank-hub-interface">
      
      {/* Bot Fuel Station Title Header */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 select-none">
        <Zap className="h-4.5 w-4.5 text-sky-400" />
        <div>
          <h2 className="font-sans font-black text-white text-xs uppercase tracking-wider">Bot Fuel Station</h2>
          <p className="text-[9.5px] text-slate-500 font-mono">Workspace automated fuel replenishment and ledger station</p>
        </div>
      </div>

      {activeSubTab === 'station' && (
        <>
          {/* Top Banner - Fuel Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Workspace current Fuel Display */}
            <div className="sleek-card p-5 shadow-xl flex flex-col justify-between md:col-span-2 relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Zap className="h-44 w-44 text-sky-400 stroke-[1]" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="sleek-label block">Active Bot Fuel Reserve</span>
                  <span className="text-[10px] bg-sky-950/80 text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    {activeWorkspace.plan} Workspace active
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <h1 className="text-4xl md:text-5xl font-extrabold font-mono text-white tracking-tight">
                    {activeWorkspace.gasBalance.toFixed(4)}{' '}
                    <span className="text-sky-400 font-sans text-xl font-normal">BOT FUEL</span>
                  </h1>
                </div>
                
                {/* Dynamic visual progress gauge */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
                    <span>0.00 Bot Fuel (Empty)</span>
                    <span>Workspace: {activeWorkspace.name}</span>
                    <span>500.00 Max Gauge</span>
                  </div>
                  <div className="h-3 bg-[#020617] rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-500 via-[#38bdf8] to-[#818cf8] rounded-full transition-all duration-1000 animate-pulse relative"
                      style={{ width: `${Math.min(100, (activeWorkspace.gasBalance / 500) * 100)}%` }}
                    >
                      <div className="absolute top-0 bottom-0 left-0 right-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed flex items-start gap-1.5">
                <Info className="h-4 w-4 text-[#38bdf8] shrink-0 mt-0.5" />
                <span>
                  Every trade processed under our **Autonomous Signal Crossing Gateway** dynamically consumes **Bot Fuel** equivalent to **20% of the Position Size** (i.e., `Size * 0.20`). For example, an entry position size of **600** will consume exactly **120 Bot Fuel units**.
                </span>
              </p>
            </div>

            {/* Cost Matrix Guide */}
            <div className="sleek-card p-5 shadow-xl flex flex-col justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2 flex items-center gap-1.5 font-mono">
                <PiggyBank className="h-4 w-4 text-[#818cf8]" /> Bot Fuel Metrics
              </h3>
              <div className="space-y-3 py-3 font-mono text-[11px]">
                <div className="flex justify-between items-center border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Dynamic Fuel Charge</span>
                  <span className="text-amber-400 font-bold">Size × 0.20 (20%)</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Example Fee (Size 600)</span>
                  <span className="text-emerald-400">120.00 Bot Fuel</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400">Binance Pay Settlement Fee</span>
                  <span className="text-slate-350">0% on Refills</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Workspace Status</span>
                  <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded text-[9px] font-bold">
                    Online
                  </span>
                </div>
              </div>
              <button 
                onClick={() => openCheckout('Core Refill Special', 250, 20)}
                className="w-full bg-[#38bdf8] hover:bg-[#32b2e8] text-slate-950 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer border-0 shadow-lg shadow-sky-500/15"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Purchase Refills Pack
              </button>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Refills Shop Items List (2 columns) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono">
                NovaQuant Bot Fuel Tank shop packs
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="gas-packs-shop">
                {gasPacks.map(pack => (
                  <div 
                    key={pack.id} 
                    className="sleek-card p-4 flex flex-col justify-between hover:border-[#38bdf8]/40 transition-all shadow-md group border border-slate-800/80 relative"
                  >
                    {/* Special Tag badge */}
                    <div className="absolute top-2.5 right-2.5 text-[9px] bg-[#020617] border border-slate-800 font-mono text-[#38bdf8] px-1.5 py-0.5 rounded uppercase font-semibold">
                      {pack.tag}
                    </div>
     
                    <div className="space-y-1 mt-1 block">
                      <span className="text-[11px] text-[#818cf8] font-bold uppercase block tracking-wider font-mono">{pack.name}</span>
                      <div className="flex items-baseline gap-1.5 py-1.5">
                        <span className="text-3xl font-extrabold font-mono text-white">{pack.amount}</span>
                        <span className="text-[11px] text-slate-400">Units</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed min-h-[55px] pt-1">
                        {pack.desc}
                      </p>
                    </div>

                    <div className="border-t border-slate-800/60 pt-3 mt-3 flex justify-between items-center">
                      <div className="font-mono text-xs font-bold text-emerald-400">
                        {pack.price}.00 USDT
                      </div>
                      <button
                        onClick={() => openCheckout(pack.name, pack.amount, pack.price)}
                        className="bg-slate-900 border border-slate-800 group-hover:border-[#38bdf8]/60 group-hover:bg-slate-850 text-slate-330 group-hover:text-white px-2.5 py-1.5 rounded text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        SELECT
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom USDT conversion refueler */}
              <div className="sleek-card p-5 border border-amber-900/40 bg-gradient-to-r from-slate-950/90 to-amber-950/20 rounded-xl space-y-4" id="custom-gas-refueler">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-3">
                  <div>
                    <h4 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-amber-400 fill-current animate-pulse" />
                      Custom USDT Conversion Refueler
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Enter any custom USDT amount to instantly exchange for Bot Fuel units (1 USDT = 10 units)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-amber-955/80 border border-amber-800/50 text-amber-400 font-bold self-start sm:self-center">
                    Refuel Settle rate: 1 USDT = 10 Bot Fuel
                  </span>
                </div>

                {/* Custom Interactive Calculator Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Left quick settlement button & input */}
                  <div className="md:col-span-5 space-y-2">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase text-left">Custom Deposit Amount (USDT)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        placeholder="Enter USDT Amount"
                        id="custom-usdt-amount-input"
                        className="w-full bg-[#020617] border border-slate-800 rounded-lg px-3.5 py-2 text-white font-mono text-xs focus:border-amber-400 outline-none transition-all pr-12 focus:outline-none"
                        defaultValue="45"
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          const outputEl = document.getElementById('custom-fuel-preview-val');
                          const bonusEl = document.getElementById('custom-bonus-preview-val');
                          if (outputEl) {
                            let baseFuel = amount * 10;
                            if (amount === 45) {
                              // Special 45 USDT -> 500 Fuel conversion (includes +50 bonus)
                              outputEl.innerText = '500';
                              if (bonusEl) bonusEl.innerText = '+50 Units Custom Bonus Applied!';
                            } else {
                              outputEl.innerText = baseFuel.toFixed(0);
                              if (bonusEl) bonusEl.innerText = '';
                            }
                          }
                        }}
                      />
                      <span className="absolute right-3.5 top-2 text-xs font-mono font-bold text-slate-500">USDT</span>
                    </div>
                  </div>

                  {/* Conversion visual arrow */}
                  <div className="md:col-span-2 text-center text-slate-500 font-bold text-lg leading-none py-1 block">
                    ➡
                  </div>

                  {/* Right preview display */}
                  <div className="md:col-span-5 bg-[#020617]/50 border border-slate-850 p-3 rounded-lg flex justify-between items-center relative overflow-hidden select-none">
                    <div>
                      <span className="block text-[8px] text-slate-500 font-mono uppercase text-left">CREDITED BOT FUEL</span>
                      <div className="text-xl font-mono font-bold text-amber-400 mt-0.5">
                        <span id="custom-fuel-preview-val">500</span> Units
                      </div>
                      <span className="text-[9px] text-emerald-400 font-mono block mt-1 text-left" id="custom-bonus-preview-val">
                        +50 Units Custom Bonus Applied!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const inputVal = (document.getElementById('custom-usdt-amount-input') as HTMLInputElement)?.value;
                        const usdtAmount = parseFloat(inputVal) || 45;
                        let targetFuel = usdtAmount * 10;
                        let packLabel = `Custom $${usdtAmount} USDT Refuel`;
                        if (usdtAmount === 45) {
                          targetFuel = 500;
                          packLabel = 'Binance Special 45 USDT Pack';
                        }
                        openCheckout(packLabel, targetFuel, usdtAmount);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 hover:scale-105 active:scale-95 text-slate-950 px-3.5 py-2 font-black text-[10px] uppercase rounded-md transition-all border-0 cursor-pointer shadow-lg shadow-amber-500/10"
                    >
                      CONVERT NOW
                    </button>
                  </div>
                </div>

                {/* Quick buttons */}
                <div className="flex flex-wrap gap-2 text-[10px] font-mono pt-1 text-left justify-start items-center">
                  <span className="text-slate-500">Quick conversions:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('custom-usdt-amount-input') as HTMLInputElement;
                      if (input) {
                        input.value = '45';
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                    className="bg-amber-950/40 border border-amber-800/40 text-amber-300 hover:bg-amber-900/60 transition-all font-bold px-2.5 py-1 rounded cursor-pointer"
                  >
                    🔥 Special: 45 USDT for 500 Bot Fuel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('custom-usdt-amount-input') as HTMLInputElement;
                      if (input) {
                        input.value = '100';
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                    className="bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-350 transition-all font-bold px-2.5 py-1 rounded cursor-pointer"
                  >
                    100 USDT (1,000 Fuel)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('custom-usdt-amount-input') as HTMLInputElement;
                      if (input) {
                        input.value = '250';
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                    className="bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-350 transition-all font-bold px-2.5 py-1 rounded cursor-pointer"
                  >
                    250 USDT (2,500 Fuel)
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3 containing Ledger + Referral Box */}
            <div className="space-y-4 flex flex-col justify-between">
              {/* Ledger Transaction Audit view */}
              <div className="sleek-card p-4 space-y-3 flex flex-col h-[180px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2 flex items-center gap-1.5 font-mono">
                  <History className="h-4 w-4 text-emerald-400" /> Workspace Bot Fuel Ledger
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 mt-1 pr-1" id="ledger-history-list">
                  {gasTransactions.filter(tx => tx.workspaceName === activeWorkspace.name).length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs font-mono">
                      No Bot Fuel ledger logs populated for '{activeWorkspace.name}' yet.
                    </div>
                  ) : (
                    gasTransactions
                      .filter(tx => tx.workspaceName === activeWorkspace.name)
                      .map(tx => (
                        <div 
                          key={tx.id} 
                          className="p-2 rounded bg-[#020617]/50 border border-slate-800/60 flex justify-between items-start font-mono text-[10px]"
                        >
                          <div className="space-y-0.5 text-left">
                            <div className="text-[10px] text-slate-200 font-semibold uppercase">{tx.details}</div>
                            <div className="text-slate-500 font-normal">{tx.timestamp}</div>
                          </div>
                          <div className={`font-bold shrink-0 ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} Bot Fuel
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Referral & Introducer Box */}
              <div className="sleek-card p-4 space-y-3 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-indigo-950/20 border-indigo-900/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#818cf8] border-b border-slate-800 pb-2 flex items-center gap-1.5 font-mono">
                  <Users className="h-4 w-4 text-[#818cf8]" /> Affiliates & Introducer Hub
                </h3>
                <p className="text-[10px] text-slate-350 leading-relaxed font-sans text-left">
                  Earn <span className="text-emerald-400 font-bold">10% commission</span> on any workspace refills or subscription payments settled by clients you introduce to NovaQuant!
                </p>
                <div className="bg-[#020617] border border-slate-850 p-2 rounded-lg font-mono text-[9px] text-left space-y-1">
                  <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">Your Dynamic Referral Link:</span>
                  <div className="flex gap-1.5 items-center justify-between text-slate-300">
                    <span className="truncate select-all select-none">{window.location.origin}?ref={activeWorkspace.emailAddress || 'piyumanjaleeoshi@gmail.com'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?ref=${activeWorkspace.emailAddress || 'piyumanjaleeoshi@gmail.com'}`);
                        alert("Affiliate Referral Link copied to your clipboard!");
                      }}
                      className="p-1 px-2 text-[9px] bg-slate-800 rounded hover:bg-slate-700 text-sky-400 shrink-0 cursor-pointer border-0"
                    >
                      COPY
                    </button>
                  </div>
                </div>
                <div className="text-[9px] text-slate-400 text-left leading-normal flex items-center justify-between font-mono bg-indigo-955/30 p-1.5 rounded border border-indigo-900/25">
                  <span>Introducer Tier Level:</span>
                  <span className="text-amber-400 font-bold">STANDARD AFFILIATE (10%)</span>
                </div>
              </div>
            </div>
          </div>

        </>
      )}

      {activeSubTab === 'api_connect' && (
        /* Render secure Binance API whitelister coupling dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" id="binance-api-connect-dashboard">
          
          {/* LEFT PANEL: Simulated Binance Mobile/Desktop App API settings console */}
          <div className="sleek-card border border-slate-800 p-5 space-y-4 bg-slate-950/40 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-amber-400 text-slate-950 font-sans font-black rounded flex items-center justify-center text-[10px] tracking-tighter">B</span>
                <div>
                  <h3 className="font-sans font-black text-white text-xs uppercase tracking-wide">Binance App API Manager</h3>
                  <p className="text-[8.5px] text-slate-550 font-mono">Simulated Developer Credentials Console</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase ${
                binanceApiCreated ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' : 'bg-slate-900 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${binanceApiCreated ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                {binanceApiCreated ? 'API Operational' : 'Ready'}
              </span>
            </div>

            {!binanceApiCreated ? (
              <div className="py-12 text-center space-y-4 font-mono">
                <div className="max-w-xs mx-auto text-slate-400 text-[11px] leading-relaxed">
                  🔐 Generate a secure key pair inside your Binance Developer console to synchronize Bot Fuel autopilot and connect link interfaces.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBinanceApiCreated(true);
                    setBinanceApiSaved(false);
                    onAddLog("🔑 Binance simulated developer API initialized! Copy the API Key and Secret Key.", "info");
                  }}
                  className="bg-amber-400 hover:bg-amber-550 hover:scale-[1.01] active:scale-95 text-slate-950 text-xs font-sans font-black py-2.5 px-5 rounded-lg uppercase tracking-wider transition-all cursor-pointer border-0 shadow-lg shadow-amber-400/5"
                >
                  ➕ Create API Key & Secret
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in text-left">
                
                {/* Simulated Generated Binance API displaying */}
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-400">
                    <span className="flex items-center gap-1 text-slate-350">
                      <Lock className="h-3 w-3 text-amber-400" /> 1. Simulated API Key:
                    </span>
                    <span className="text-slate-500 font-bold font-mono">REST API Standard</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={bApiKey}
                      className="w-full bg-[#020617] border border-slate-800 text-slate-200 text-xs font-mono px-3 py-2 rounded-lg outline-none select-all focus:border-slate-750"
                    />
                    <button
                      type="button"
                      onClick={() => triggerCopy(bApiKey, 'b_apiKey')}
                      className={`px-3 py-2 text-[10.5px] font-mono font-bold rounded-lg transition-all border shrink-0 ${
                        copyStatus['b_apiKey'] 
                          ? 'bg-emerald-950 border-emerald-800 text-emerald-400 font-bold' 
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-850 text-slate-400 hover:text-slate-200 cursor-pointer'
                      }`}
                    >
                      {copyStatus['b_apiKey'] ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Simulated Generated Secret Key displaying */}
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-400">
                    <span className="flex items-center gap-1 text-slate-350">
                      <Lock className="h-3 w-3 text-amber-400" /> 2. Simulated Secret API Key:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowApiKeysSecrets(!showApiKeysSecrets)}
                      className="text-[9.5px] text-sky-400 hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      {showApiKeysSecrets ? 'Hide Secret' : 'Reveal Secret'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type={showApiKeysSecrets ? 'text' : 'password'}
                      readOnly
                      value={bApiSecret}
                      className="w-full bg-[#020617] border border-slate-800 text-slate-200 text-xs font-mono px-3 py-2 rounded-lg outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => triggerCopy(bApiSecret, 'b_apiSecret')}
                      className={`px-3 py-2 text-[10.5px] font-mono font-bold rounded-lg transition-all border shrink-0 ${
                        copyStatus['b_apiSecret'] 
                          ? 'bg-emerald-950 border-emerald-850 text-emerald-400 font-bold' 
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-850 text-slate-400 hover:text-slate-200 cursor-pointer'
                      }`}
                    >
                      {copyStatus['b_apiSecret'] ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* IP Access Restrictionwhitelisting segment */}
                <div className="border-t border-slate-900 pt-3.5 space-y-3 font-mono">
                  <div className="space-y-1">
                    <label className="text-[9.5px] text-slate-400 uppercase font-black block text-left">3. IP Access Restriction Setup:</label>
                    <p className="text-[9px] text-slate-500 leading-tight block text-left">Control whether the API key permits operations from any network or locks exclusively to trusted bot engines.</p>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="flex items-start gap-2.5 text-[11px] text-slate-300 bg-slate-950/40 p-2.5 border border-slate-900 rounded-lg cursor-pointer hover:border-slate-800">
                      <input
                        type="radio"
                        name="ip_restrict_mode"
                        checked={binanceIpRestriction === 'none'}
                        onChange={() => {
                          setBinanceIpRestriction('none');
                          setBinanceApiSaved(false);
                        }}
                        className="text-amber-400 bg-slate-950 border-slate-800 cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="font-bold block text-[10.5px]">Unrestricted Access (Highly Unsafe)</span>
                        <span className="text-[9px] text-rose-400/80 block font-normal leading-tight mt-0.5">🚨 Allows remote triggers from any wild untracked external client, bypassing safety gateways.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 text-[11px] text-slate-300 bg-slate-950/40 p-2.5 border border-amber-500/20 rounded-lg cursor-pointer hover:border-amber-500/35">
                      <input
                        type="radio"
                        name="ip_restrict_mode"
                        checked={binanceIpRestriction === 'restricted'}
                        onChange={() => {
                          setBinanceIpRestriction('restricted');
                          setBinanceApiSaved(false);
                        }}
                        className="text-amber-400 bg-slate-950 border-slate-800 cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="font-bold block text-[10.5px] text-amber-300">Restrict access to trusted IPs only (Recommended)</span>
                        <span className="text-[9px] text-slate-400 block font-normal leading-tight mt-0.5">Locks key operations strictly to NovaQuant server clusters. Secure and whitelisted.</span>
                      </div>
                    </label>
                  </div>

                  {binanceIpRestriction === 'restricted' && (
                    <div className="space-y-1.5 animate-fade-in text-left">
                      <label className="text-[9px] text-slate-450 uppercase block font-bold">Paste Copied "Trust IPs" from Bot Fuel:</label>
                      <input
                        type="text"
                        value={binanceWhitelistedIps}
                        onChange={(e) => {
                          setBinanceWhitelistedIps(e.target.value);
                          setBinanceApiSaved(false);
                        }}
                        placeholder="Paste Bot Fuel trusted IPs list here..."
                        className="w-full bg-[#020617] border border-slate-850 focus:border-amber-400 text-xs font-mono text-white px-3 py-2 rounded-lg outline-none"
                      />
                      
                      {/* Whitelist feedback criteria */}
                      <div className="mt-1 text-[9.5px]">
                        {binanceWhitelistedIps.trim() === '' ? (
                          <span className="text-[#f59e0b] animate-pulse flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Awaiting copy of Bot Fuel IPs...
                          </span>
                        ) : (binanceWhitelistedIps.includes('116.14.99.12') || binanceWhitelistedIps.includes('54.254.12.98') || binanceWhitelistedIps.includes('13.228.45.105')) ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 shrink-0 stroke-[3]" /> Whitelist matches Secure NovaQuant Cluster! Save settings.
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Input doesn't contain secure NovaQuant trust ranges.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Save Settings inside Binance */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBinanceApiSaved(true);
                        onAddLog("💾 Simulated Binance API server keys whitelist & rules configuration committed!", "success");
                      }}
                      className="w-full bg-slate-900 border border-amber-400/40 hover:bg-slate-850 hover:border-amber-400 text-amber-400 font-sans font-black tracking-wider uppercase py-2 rounded-lg text-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      {binanceApiSaved ? '✓ Whitelist Status Locked & Saved' : '💾 Save API on Binance App'}
                    </button>
                  </div>

                  <div className="pt-2 text-center text-[9px] text-slate-400 bg-slate-900/30 p-2 border border-slate-900 rounded select-none leading-relaxed">
                    💡 <strong>Simulation workflow:</strong> After whitelisting and saving on the Binance app side (here), copy the API Key / Secret Key and paste them into the Connect panel on the right.
                  </div>

                </div>

              </div>
            )}
          </div>

          {/* RIGHT PANEL: NovaQuant Secure Bot Fuel API Portal */}
          <div className="sleek-card border border-slate-800 p-5 space-y-4 bg-[#090e1b]/40 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center border border-sky-500/25">
                  <Zap className="h-3 w-3 text-sky-400 fill-current animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-white text-xs uppercase tracking-wide">NovaQuant Bridge Gateway</h3>
                  <p className="text-[8.5px] text-slate-550 font-mono">Dynamic Payload Synchronization</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                apiConnected ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' : 'bg-slate-900 text-slate-500'
              }`}>
                {apiConnected ? 'Active' : 'Offline'}
              </span>
            </div>

            {/* Dynamic display of Trust IPs */}
            <div className="bg-[#020617] border border-slate-850 p-3 rounded-lg font-mono text-[10.5px] space-y-2 text-left">
              <span className="text-sky-400 block uppercase font-bold text-[8.5px] tracking-wider">🔑 Core Component: NovaQuant "Trust IPs"</span>
              <p className="text-[9.5px] text-slate-400 leading-relaxed font-sans">
                NovaQuant secure servers route trade loops through these whitelists. Copy these and paste them into the Binance app restriction settings first.
              </p>
              
              <div className="flex gap-2 items-center justify-between text-slate-200 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-850">
                <span className="font-bold text-slate-300 font-mono select-all truncate shrink pr-2">{trustIpsStr}</span>
                <button
                  type="button"
                  onClick={() => triggerCopy(trustIpsStr, 'trust_ips')}
                  className={`p-1 px-3.5 text-[9px] rounded font-mono font-bold shrink-0 transition-all border ${
                    copyStatus['trust_ips'] 
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-400 font-black' 
                      : 'bg-slate-800 border-slate-750 text-sky-400 hover:bg-slate-700 cursor-pointer'
                  }`}
                >
                  {copyStatus['trust_ips'] ? 'Copied' : 'Copy IPs'}
                </button>
              </div>
            </div>

            {/* Pasting Credentials box */}
            <div className="space-y-3.5 text-left font-mono">
              <span className="text-sky-400 block uppercase font-bold text-[8.5px] tracking-wider">🔑 STEP B: API Input Credentials</span>
              
              {/* API input field */}
              <div className="space-y-1">
                <label className="text-[9.5px] text-slate-400 block font-bold">1. Paste Binance Developer API Key:</label>
                <input
                  type="text"
                  value={inputApiKey}
                  disabled={apiConnected || apiConnectionProgress !== 'idle' && apiConnectionProgress !== 'failed'}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder="Paste binance_api_live_..."
                  className="w-full bg-[#020617] disabled:opacity-50 border border-slate-850 focus:border-sky-500 text-xs text-white px-3 py-2 rounded-lg outline-none font-mono placeholder-slate-600"
                />
              </div>

              {/* Secret Key input field */}
              <div className="space-y-1">
                <label className="text-[9.5px] text-slate-400 block font-bold font-mono">2. Paste Binance Developer Secret Key:</label>
                <input
                  type="password"
                  value={inputSecretKey}
                  disabled={apiConnected || apiConnectionProgress !== 'idle' && apiConnectionProgress !== 'failed'}
                  onChange={(e) => setInputSecretKey(e.target.value)}
                  placeholder="Paste binance_secret_live_..."
                  className="w-full bg-[#020617] disabled:opacity-50 border border-slate-850 focus:border-sky-500 text-xs text-white px-3 py-2 rounded-lg outline-none font-mono placeholder-slate-600"
                />
              </div>

              {/* Demo autofill short-cut */}
              {!apiConnected && apiConnectionProgress === 'idle' && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (!binanceApiCreated) {
                        setBinanceApiCreated(true);
                      }
                      setInputApiKey(bApiKey);
                      setInputSecretKey(bApiSecret);
                      if (binanceWhitelistedIps.trim() === '') {
                        setBinanceWhitelistedIps(trustIpsStr);
                      }
                      onAddLog("🛠️ Autofilled Binance Developer keys and simulatedwhitelisting for instant testing!", "info");
                    }}
                    className="text-[9.5px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3 animate-pulse text-amber-400" /> Auto-Fill keys & Whitelist (Instant Setup Shortcut)
                  </button>
                </div>
              )}
            </div>

            {/* Socket linking status panel and terminal */}
            <div className="border-t border-slate-900 pt-4 space-y-3">
              {apiConnected ? (
                <div className="bg-emerald-950/20 border border-emerald-500/35 rounded-xl p-4 text-center space-y-3 animate-fade-in font-sans">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto shadow-md">
                    <Check className="h-4.5 w-4.5 text-emerald-400 stroke-[3.5]" />
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-sans font-black tracking-wider uppercase">Secure Binance Link Engaged</h4>
                    <p className="text-[9.5px] text-slate-450 font-mono mt-1 leading-normal">
                      Credentials validated. NovaQuant is successfully connected via the secure webhook IP restrictions range.
                    </p>
                  </div>
                  <div className="flex gap-1.5 justify-center pt-0.5 font-mono text-[8.5px]">
                    <span className="bg-[#020617] text-slate-400 px-2 py-0.5 rounded border border-slate-800">SYNC INTERVAL: 1S</span>
                    <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-bold">TUNNEL SECURE</span>
                  </div>
                  <button
                    type="button"
                    onClick={resetApiConnection}
                    className="text-[10px] uppercase font-mono font-bold bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 text-rose-400 py-1.5 px-4 rounded-lg transition-all cursor-pointer active:scale-95"
                  >
                    🔌 Cut API Connection Link
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  
                  {/* Action Link Button */}
                  {apiConnectionProgress === 'idle' || apiConnectionProgress === 'failed' ? (
                    <button
                      type="button"
                      onClick={startApiConnectionProcess}
                      className="w-full bg-[#1e40af] border-0 hover:bg-[#2563eb] text-white hover:scale-[1.01] active:scale-95 font-sans font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/15"
                    >
                      <Link className="h-3.5 w-3.5 stroke-[2.5]" />
                      🔌 CONNECT LINK WITH BINANCE
                    </button>
                  ) : (
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg text-center space-y-2 font-mono">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-sky-400 animate-spin" />
                        <span className="text-[10.5px] text-slate-200 uppercase font-black animate-pulse">
                          {apiConnectionProgress === 'pinging' && '🔌 Pinging Binance Gateway...'}
                          {apiConnectionProgress === 'verifying' && '🔑 Verifying Signature Handshake...'}
                          {apiConnectionProgress === 'checking_ips' && '🛡️ Checking Host IP Whitelists...'}
                          {apiConnectionProgress === 'syncing' && '🔄 Establishing ledger sync loops...'}
                        </span>
                      </div>
                      <div className="h-2 bg-[#020617] rounded-full p-0.5 overflow-hidden">
                        <div className={`h-full bg-sky-400 rounded-full transition-all duration-300 ${
                          apiConnectionProgress === 'pinging' ? 'w-1/4' :
                          apiConnectionProgress === 'verifying' ? 'w-2/4' :
                          apiConnectionProgress === 'checking_ips' ? 'w-3/4' : 'w-[95%]'
                        }`} />
                      </div>
                    </div>
                  )}

                  {/* Terminal console print streams */}
                  {connectionLogs.length > 0 && (
                    <div className="bg-[#020617]/95 border border-slate-850 rounded-lg p-3 text-left font-mono space-y-1 shadow-inner h-[115px] overflow-y-auto">
                      <div className="text-[8px] text-slate-500 font-sans border-b border-slate-900/80 pb-1 mb-1.5 flex justify-between items-center select-none">
                        <span>CONNECTION CONSOLE LOGS:</span>
                        <span className="text-sky-400 animate-pulse">● FEED FEED</span>
                      </div>
                      {connectionLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          className={`text-[9.5px]/1.4 ${
                            log.startsWith('[ERROR]') ? 'text-rose-450 font-bold' : 
                            log.startsWith('[WARN]') || log.startsWith('💡') ? 'text-amber-400' :
                            log.startsWith('🎉') || log.startsWith('[OK]') ? 'text-emerald-400 font-semibold' :
                            'text-slate-400'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'claude_connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in" id="claude-connect-dashboard">
          
          {/* LEFT PANEL: Claude AI API configurations vault */}
          <div className="sleek-card border border-slate-800 p-5 space-y-4 bg-slate-950/40 relative overflow-hidden shadow-2xl1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <div>
                    <h3 className="font-sans font-black text-white text-xs uppercase tracking-wide">Anthropic Claude Vault</h3>
                    <p className="text-[8.5px] text-slate-500 font-mono">Workspace API Credential Lockbox</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase ${
                  claudeConnected ? 'bg-purple-950/60 text-purple-400 border border-purple-900/50' : 'bg-slate-900 text-slate-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${claudeConnected ? 'bg-purple-500 animate-pulse' : 'bg-slate-600'}`}></span>
                  {claudeConnected ? 'Claude Connected' : 'Disconnected'}
                </span>
              </div>

              <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/40 rounded-xl space-y-2 text-[10.5px] text-slate-350 leading-relaxed font-sans mt-3">
                <span className="font-extrabold text-indigo-300 uppercase tracking-wider block font-mono text-[9.5px]">
                  🔑 . Bind Your Anthropic Credentials
                </span>
                <p className="text-slate-400">
                  You can activate your custom Claude integration via two secure areas in the dashboard:
                </p>
                <div className="space-y-1.5 mt-1">
                  <div className="p-2 border border-indigo-950/60 rounded bg-[#02050c]/40 font-mono text-[10px]">
                    <strong className="text-purple-300">Option A (Profile Vault):</strong> Go to the <strong className="text-white">Profile tab</strong> in your navigation bar & select the <strong className="text-purple-300">Claude AI Connect</strong> tab.
                  </div>
                  <div className="p-2 border border-indigo-950/60 rounded bg-[#02050c]/40 font-mono text-[10px]">
                    <strong className="text-purple-300">Option B (Gas Tank Hub):</strong> Go to the <strong className="text-white">Gas Tank tab</strong> & scroll down to the <strong className="text-purple-300">Anthropic Claude Vault</strong> side panel on the left (You are here).
                  </div>
                </div>
                <p className="mt-1 text-slate-400">
                  Paste your private key in the <strong className="text-[#a5f3fc]">Anthropic API Key</strong> field below and click <strong className="text-white">"Link Claude API & Verify Key"</strong> to establish a secure, encrypted tunnel to Anthropic's endpoints.
                </p>
              </div>

              <div className="space-y-4 text-left font-mono mt-4">
                {/* Anthropic API Key Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-slate-400">
                    <span className="flex items-center gap-1 text-slate-350">
                      <Lock className="h-3 w-3 text-purple-400" /> 1. Anthropic API Key (Secret):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowClaudeKey(!showClaudeKey)}
                      className="text-[9.5px] text-purple-400 hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      {showClaudeKey ? 'Hide Key' : 'Reveal Key'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type={showClaudeKey ? 'text' : 'password'}
                      placeholder="sk-ant-api03-xxxx..."
                      value={claudeApiKey}
                      disabled={claudeConnected}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 text-slate-250 text-xs font-mono px-3 py-2 rounded-lg outline-none select-all"
                    />
                    {!claudeConnected && (
                      <button
                        type="button"
                        onClick={() => {
                          setClaudeApiKey('sk-ant-api03-e69c28bf0ba34ebd95b30907e5fcc3f30');
                          onAddLog("🛠️ Autofilled Claude developer sandbox credentials!", "info");
                        }}
                        className="px-2.5 py-1.5 text-[9px] bg-purple-950/20 border border-purple-800/20 hover:border-purple-600 font-sans font-bold text-purple-400 hover:text-purple-300 rounded cursor-pointer transition-all shrink-0"
                      >
                        Demo Fill
                      </button>
                    )}
                  </div>
                </div>

                {/* Model selection */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-slate-450 uppercase font-black block">2. Claude LLM Engine Selection:</label>
                  <select
                    value={claudeModel}
                    disabled={claudeConnected}
                    onChange={(e) => setClaudeModel(e.target.value as any)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-lg p-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none cursor-pointer"
                  >
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (★ RECOMMENDED — Best for Auto-Trading)</option>
                    <option value="claude-3-5-haiku">Claude 3.5 Haiku (Fast & Light — 3.0 Bot Fuel / analysis)</option>
                    <option value="claude-3-opus">Claude 3 Opus (Extreme Reasoning — 10.0 Bot Fuel / analysis)</option>
                    <option value="claude-4-8-opus">Claude 4.8 Opus (Quantum Core — 15.0 Bot Fuel / analysis)</option>
                  </select>

                  {claudeModel === 'claude-3-5-sonnet' && (
                    <div className="p-3.5 bg-gradient-to-br from-purple-950/40 to-indigo-950/20 border border-purple-800/35 rounded-xl text-[10.5px] space-y-2 mt-2 leading-relaxed animate-fade-in" id="sonnet-features-card">
                      <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                        <span>PREMIUM CHOICE FOR AUTOMATION: CLAUDE 3.5 SONNET</span>
                      </div>
                      <p className="text-slate-300">
                        Claude 3.5 Sonnet is recognized worldwide as the absolute state-of-the-art engine for autonomous quantitative trading bots. It outperforms other variants with:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                        <li><strong className="text-purple-300 font-medium">Ultra-Low Latency:</strong> Executes rapid strategy inferences in split seconds.</li>
                        <li><strong className="text-purple-300 font-medium">Exact Numeric Adherence:</strong> Flawless SL, TP, and dynamic price risk calculations.</li>
                        <li><strong className="text-purple-300 font-medium">Strategic Superiority:</strong> Advanced pattern recognition and volume flow convergence parsing.</li>
                      </ul>
                      <div className="text-[9px] text-purple-400/80 italic font-medium font-sans">
                        💡 Active choice cost: 5.0 Bot Fuel per automated analysis cycle.
                      </div>
                    </div>
                  )}

                  {claudeModel === 'claude-4-8-opus' && (
                    <div className="p-3.5 bg-gradient-to-br from-rose-950/30 to-slate-950 border border-rose-900/40 rounded-xl text-[10.5px] space-y-3 mt-2 leading-relaxed animate-fade-in" id="opus-next-features-card">
                      <div className="flex items-center gap-1.5 text-rose-350 font-bold">
                        <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                        <span>NEXT-GEN QUANTUM HEURISTIC ENGINE: CLAUDE 4.8 OPUS</span>
                      </div>
                      <p className="text-slate-300">
                        Claude 4.8 Opus is our ultimate S-tier variant, delivering unparalleled multi-dimensional reasoning, market risk hedges, and predictive volatility projections. <strong>Ideal for complex agentic coding and enterprise work</strong>.
                      </p>
                      
                      {/* Token Pricing Table */}
                      <div className="border border-rose-950/40 rounded-lg overflow-hidden bg-slate-950/40">
                        <div className="bg-rose-950/20 px-3 py-1.5 border-b border-rose-950/40 flex justify-between items-center text-[10px]">
                          <span className="font-mono text-[9px] text-rose-300 uppercase font-black tracking-wider">Anthropic Token Pricing Tier</span>
                          <span className="text-[8px] text-slate-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/30 font-mono font-bold">LATEST VERIFIED RATE</span>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-rose-950/30">
                          <div className="p-2.5 space-y-2">
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase font-extrabold block">Standard Traffic</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[10.5px]">
                                <span className="text-slate-400 font-mono font-sans">Input Rate</span>
                                <span className="text-emerald-400 font-bold font-mono">$5 / MTok</span>
                              </div>
                              <div className="flex justify-between items-center text-[10.5px]">
                                <span className="text-slate-400 font-mono font-sans">Output Rate</span>
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
                                <span className="text-slate-400 font-mono font-sans">Write Code</span>
                                <span className="text-sky-400 font-bold font-mono">$6.25 / MTok</span>
                              </div>
                              <div className="flex justify-between items-center text-[10.5px]">
                                <span className="text-slate-400 font-mono font-sans">Read Code</span>
                                <span className="text-sky-400 font-bold font-mono">$0.50 / MTok</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                        <li><strong className="text-rose-300 font-medium font-sans">Multi-Agent Consensus:</strong> Implements comprehensive internal cross-examination before printing signals.</li>
                        <li><strong className="text-rose-350 font-medium font-sans">Advanced Volatility Predictor:</strong> Calculates exact probability envelopes around market wick thresholds.</li>
                        <li><strong className="text-rose-300 font-medium font-sans">Extreme S-Tier Guardrails:</strong> Optimizes hedging directions to prevent catastrophic system slips.</li>
                      </ul>
                      <div className="text-[9px] text-rose-400/80 italic font-medium font-sans mt-1">
                        💡 Active choice cost: 15.0 Bot Fuel per automated analysis cycle.
                      </div>
                    </div>
                  )}
                </div>

                {/* Slider for temperature */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9.5px] text-slate-450 uppercase font-black">
                    <span>3. Model Temperature (Creativity):</span>
                    <span className="text-purple-400 font-bold">{claudeTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={claudeTemperature}
                    disabled={claudeConnected}
                    onChange={(e) => setClaudeTemperature(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 bg-slate-900 cursor-pointer h-1 rounded-lg"
                  />
                  <div className="flex justify-between text-[8px] text-slate-500 font-sans">
                    <span>Precise / Strict Indicators</span>
                    <span>Balanced</span>
                    <span>Creative Sentiments</span>
                  </div>
                </div>

                {/* System prompt override */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-slate-450 uppercase font-black block">4. System Prompt Override Guidelines:</label>
                  <textarea
                    value={claudeSystemPrompt}
                    disabled={claudeConnected}
                    onChange={(e) => setClaudeSystemPrompt(e.target.value)}
                    rows={2}
                    className="w-full bg-[#020617] border border-slate-800 text-slate-350 text-[10.5px] font-mono p-2.5 rounded-lg focus:border-purple-500 outline-none resize-none leading-normal"
                  />
                </div>
              </div>
            </div>

            {/* Trigger Link Button */}
            <div className="pt-4 border-t border-slate-900/60 mt-4">
              {claudeConnected ? (
                <div className="bg-purple-950/20 border border-purple-500/35 rounded-xl p-4 text-center space-y-3 animate-fade-in font-sans">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center mx-auto shadow-md">
                    <Check className="h-4.5 w-4.5 text-purple-400 stroke-[3.5]" />
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-semibold tracking-wider uppercase">Claude Bridge Active</h4>
                    <p className="text-[9.5px] text-slate-400 font-mono mt-1 leading-normal">
                      Webhook established from `api.anthropic.com` routing signals back directly into active auto-crossers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={disconnectClaude}
                    className="text-[10px] uppercase font-mono font-bold bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 text-rose-450 py-1.5 px-4 rounded-lg transition-all cursor-pointer active:scale-95"
                  >
                    Disconnect Claude API Link
                  </button>
                </div>
              ) : (
                <div className="space-y-3 font-mono">
                  {!claudeConnecting ? (
                    <button
                      type="button"
                      onClick={startClaudeConnectionProcess}
                      className="w-full bg-gradient-to-r from-purple-650 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-sans font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/15"
                    >
                      <Brain className="h-3.5 w-3.5 text-purple-200" /> Link Claude API & Verify Key
                    </button>
                  ) : (
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg text-center space-y-2 font-mono">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                        <span className="text-[10.5px] text-slate-200 uppercase font-black animate-pulse">
                          {claudeConnectionProgress === 'auth_ping' && '🔌 Pinging Anthropic servers...'}
                          {claudeConnectionProgress === 'syncing' && '🔄 Establishing secure API bridges...'}
                        </span>
                      </div>
                      <div className="h-2 bg-[#020617] rounded-full p-0.5 overflow-hidden">
                        <div className={`h-full bg-purple-500 rounded-full transition-all duration-300 ${
                          claudeConnectionProgress === 'auth_ping' ? 'w-2/4' : 'w-[95%]'
                        }`} />
                      </div>
                    </div>
                  )}

                  {claudeConnectionLogs.length > 0 && (
                    <div className="bg-[#020617]/95 border border-slate-850 rounded-lg p-3 text-left font-mono space-y-1 shadow-inner h-[115px] overflow-y-auto">
                      <div className="text-[8px] text-purple-450 font-sans border-b border-slate-900/80 pb-1 mb-1.5 flex justify-between items-center select-none">
                        <span>ANTHROPIC CONNECT CONSOLE:</span>
                        <span className="text-purple-400 animate-pulse">● API LINKED</span>
                      </div>
                      {claudeConnectionLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          className={`text-[9.5px]/1.4 ${
                            log.startsWith('[ERROR]') ? 'text-rose-450 font-bold' : 
                            log.startsWith('[WARN]') ? 'text-amber-400' :
                            log.startsWith('🎉') || log.startsWith('[OK]') ? 'text-emerald-400 font-semibold' :
                            'text-slate-400'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Autonomous Claude AI Signal Suite (Interactive Sandbox) */}
          <div className="sleek-card border border-slate-800 p-5 space-y-4 bg-[#090e1b]/40 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="font-sans font-black text-white text-xs uppercase tracking-wide">Autopilot Crossing Optimizer</h3>
                  <p className="text-[8.5px] text-slate-500 font-mono">Simulated Signal Inference Desk</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-800/30 px-2 py-0.5 rounded">
                SIMULATION PLATFORM
              </span>
            </div>

            {!claudeConnected ? (
              <div className="py-20 text-center space-y-4 font-mono">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto border border-purple-800/30 animate-pulse">
                  <Lock className="h-5 w-5 text-purple-400" />
                </div>
                <div className="max-w-xs mx-auto text-slate-400 text-[11px] leading-relaxed">
                  🔒 <strong>Claude Interface Locked:</strong> Establish the Anthropic API connection in the left vault panel first to bind your active Bot Fuel and execute simulated trade crossings.
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in text-left">
                
                {/* Inputs grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  {/* Asset */}
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Asset Pairing</label>
                    <select
                      value={sandboxAsset}
                      onChange={(e) => setSandboxAsset(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 rounded p-1.5 text-[11px] text-white focus:outline-none cursor-pointer"
                    >
                      <option value="BTCUSDT">BTC/USDT</option>
                      <option value="ETHUSDT">ETH/USDT</option>
                      <option value="SOLUSDT">SOL/USDT</option>
                      <option value="BNBUSDT">BNB/USDT</option>
                    </select>
                  </div>

                  {/* Timeframe */}
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Timeframe</label>
                    <select
                      value={sandboxTimeframe}
                      onChange={(e) => setSandboxTimeframe(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 rounded p-1.5 text-[11px] text-white focus:outline-none cursor-pointer"
                    >
                      <option value="1m">1 Candle (1m)</option>
                      <option value="5m">5 Candles (5m)</option>
                      <option value="15m">15 Candles (15m)</option>
                      <option value="1h">1 Hour (1h)</option>
                      <option value="4h">4 Hours (4h)</option>
                      <option value="1d">1 Day (1d)</option>
                    </select>
                  </div>

                  {/* Indicators Sentiment */}
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Sentiment Override</label>
                    <select
                      value={sandboxSentiment}
                      onChange={(e) => setSandboxSentiment(e.target.value as any)}
                      className="w-full bg-[#020617] border border-slate-800 rounded p-1.5 text-[11px] text-white focus:outline-none cursor-pointer"
                    >
                      <option value="AUTO">🤖 Auto-Detect (Dynamic)</option>
                      <option value="BULLISH">🟢 Bullish Crossing Bias</option>
                      <option value="BEARISH">🔴 Bearish Crossing Bias</option>
                      <option value="NEUTRAL">🟡 Neutral Consensus</option>
                    </select>
                  </div>
                </div>

                {/* Costs matrix line */}
                <div className="bg-[#020617] p-2.5 rounded-lg border border-slate-850 flex justify-between items-center text-[10.5px] font-mono leading-none">
                  <span className="text-slate-500 uppercase font-bold text-[9px]">Model Query Cost:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sky-450 font-extrabold">
                      {claudeModel === 'claude-3-5-sonnet' ? '5.0' : claudeModel === 'claude-3-5-haiku' ? '3.0' : claudeModel === 'claude-3-opus' ? '10.0' : '15.0'} BF units
                    </span>
                    <span className="text-[9px] text-slate-500">({claudeModel.toUpperCase()})</span>
                  </div>
                </div>

                {/* Prompt Button */}
                {!sandboxRunning ? (
                  <button
                    type="button"
                    onClick={handleGenerateClaudeSignal}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-550 text-slate-950 font-sans font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer border-0 shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4 text-[#4f46e5]" /> RUN AUTONOMOUS CLAUDE STRATEGY INFERENCE
                  </button>
                ) : (
                  <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-lg text-center space-y-2.5 font-mono">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                      <span className="text-[10px] text-white uppercase font-black animate-pulse">
                        Claude compiling quantitative weights...
                      </span>
                    </div>
                    {/* Log tracks */}
                    <div className="bg-[#020617] text-left p-2.5 rounded border border-slate-850/80 max-h-[85px] overflow-y-auto space-y-1 scrollbar-thin">
                      {sandboxProgressLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          className={`text-[9px]/1.3 ${
                            log.startsWith('[LEDGER]') ? 'text-amber-550 font-semibold' :
                            log.startsWith('[OK]') ? 'text-emerald-400 font-semibold' : 'text-slate-450'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results Screen CARD */}
                {sandboxSignalResult && (
                  <div className="bg-gradient-to-br from-[#0c122b] to-[#120f26] border-2 border-purple-800/40 rounded-xl p-4 space-y-3.5 animate-fade-in font-mono relative overflow-hidden shadow-2xl">
                    {/* Watermark APPROVED STAMP */}
                    <div className="absolute -top-3 -right-3 w-28 h-28 border-4 border-dashed border-purple-500/15 rounded-full flex items-center justify-center rotate-12 pointer-events-none">
                      <span className="text-[10px] tracking-widest font-black text-purple-400/25 uppercase text-center leading-none">CLAUDE<br/>APPROVED</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-purple-900/50 pb-2.5">
                      <div className="text-left font-sans">
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Signal Result ({sandboxSignalResult.timestamp})</span>
                        <h4 className="text-white text-xs font-black uppercase mt-0.5">{sandboxSignalResult.symbol} Quantitative Cross</h4>
                      </div>
                      <div className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1.5 ${
                        sandboxSignalResult.direction === 'LONG' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 
                        sandboxSignalResult.direction === 'SHORT' ? 'bg-rose-950/80 text-rose-450 border border-rose-900/50' : 
                        'bg-amber-950/80 text-amber-400 border border-amber-905/50'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sandboxSignalResult.direction === 'LONG' ? 'bg-emerald-400 animate-pulse' : sandboxSignalResult.direction === 'SHORT' ? 'bg-rose-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        {sandboxSignalResult.direction === 'LONG' ? 'BUY / LONG' : sandboxSignalResult.direction === 'SHORT' ? 'SELL / SHORT' : 'HOLD / NEUTRAL'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="bg-[#020617]/55 p-2 rounded border border-slate-850/50">
                        <span className="text-[8px] text-slate-500 uppercase block">TARGET ENTRY RANGE</span>
                        <span className="text-[11.5px] font-bold text-slate-200">{sandboxSignalResult.entryRange}</span>
                      </div>
                      <div className="bg-[#020617]/55 p-2 rounded border border-slate-850/50">
                        <span className="text-[8px] text-slate-500 uppercase block">RECOMMENDED MARGIN</span>
                        <span className="text-[11.5px] font-bold text-purple-300">{sandboxSignalResult.leverage}</span>
                      </div>
                      <div className="bg-[#020617]/55 p-2 rounded border border-slate-850/50">
                        <span className="text-[8px] text-slate-500 uppercase block">SUGGESTED TAKE-PROFIT (TP)</span>
                        <span className="text-[11.5px] font-extrabold text-emerald-400">{sandboxSignalResult.tp}</span>
                      </div>
                      <div className="bg-[#020617]/55 p-2 rounded border border-slate-850/50">
                        <span className="text-[8px] text-slate-500 uppercase block">SUGGESTED STOP-LOSS (SL)</span>
                        <span className="text-[11.5px] font-extrabold text-rose-400">{sandboxSignalResult.sl}</span>
                      </div>
                    </div>

                    {/* Reasoning explanation summary */}
                    <div className="bg-slate-950/80 border border-purple-900/20 p-2.5 rounded-lg space-y-1">
                      <span className="text-[8px] text-indigo-400 uppercase font-black block text-left">🧠 Quantitative Reasoning Inference:</span>
                      <p className="text-[10px] text-[#cbd5e1] leading-relaxed font-sans text-left">
                        {sandboxSignalResult.reasoning}
                      </p>
                    </div>

                    {/* Submit Autopilot Trigger button */}
                    <button
                      type="button"
                      onClick={handleRouteToAutopilot}
                      className="w-full bg-[#1e1b4b] border border-purple-500/25 hover:bg-[#31105e] hover:border-purple-400 text-purple-300 text-xs font-sans font-bold py-2 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      ⚡ TRANSFER SIGNAL TO AUTOPILOT CROSSING GATEWAY
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Elegant checkout modal popup */}
      {purchaseModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none animate-fade-in" id="checkout-gateway-modal">
          <div className="max-w-md w-full sleek-card p-5 md:p-6 space-y-4 relative shadow-2xl overflow-hidden border border-amber-900/40 bg-slate-950 text-slate-100">
            
            {/* Header controls */}
            <div className="flex justify-between items-start border-b border-slate-850 pb-3">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
                  Binance Pay Application Gateway
                </div>
                <h3 className="font-sans font-black text-white text-base mt-0.5">Binance Secure Refueler</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Exchanging {purchaseModal.price} USDT ➔ +{purchaseModal.gasAmount} Fuel units</p>
              </div>
              <button
                onClick={() => setPurchaseModal(null)}
                className="text-slate-400 hover:text-white text-[11px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded cursor-pointer transition-all"
              >
                CLOSE [×]
              </button>
            </div>

            {checkoutStep === 'details' && (
              <div className="space-y-4">
                
                {/* Method selector tabs */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => setCheckoutMethod('app_scan')}
                    className={`p-2.5 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      checkoutMethod === 'app_scan'
                        ? 'bg-amber-400/10 text-amber-400 border-amber-400/40'
                        : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <QrCode className="h-3.5 w-3.5 text-amber-400" />
                    Scan QR via App
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutMethod('app_otp')}
                    className={`p-2.5 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      checkoutMethod === 'app_otp'
                        ? 'bg-amber-400/10 text-amber-400 border-amber-400/40'
                        : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                    Interactive App Simulation
                  </button>
                </div>

                {/* Option A: Scan QR on Binance App */}
                {checkoutMethod === 'app_scan' && (
                  <div className="space-y-4 animate-fade-in text-center">
                    <div className="text-[11px] text-slate-300 font-mono leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 text-left">
                      💡 <strong>How to Refuel:</strong> Open your real <strong>Binance Mobile App</strong>, touch the scan icon in the top right, and aim at this simulated QR code below to connect the bot fuel payload.
                    </div>

                    {/* Highly polished mock QR Code container */}
                    <div className="relative mx-auto w-44 h-44 bg-slate-950 border-2 border-amber-400 p-2 rounded-xl flex items-center justify-center overflow-hidden shadow-xl shadow-amber-400/5 group">
                      
                      {/* Laser scanning visual line */}
                      <div className="absolute left-0 right-0 h-[2px] bg-amber-400 opacity-60 top-1 animate-[bounce_2.5s_infinite] shadow-lg shadow-amber-400"></div>

                      <div className={`w-full h-full relative flex flex-col items-center justify-center transition-all duration-500 bg-slate-900 border border-slate-800 rounded-lg ${qrScanned ? 'bg-emerald-950/20' : ''}`}>
                        {qrScanned ? (
                          <div className="space-y-1 z-10 text-emerald-400 font-mono text-[10px] uppercase font-black">
                            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto animate-bounce stroke-[1.5]" />
                            <span>App Connected!</span>
                            <span className="text-[8px] text-slate-400 block font-normal">Authenticating...</span>
                          </div>
                        ) : (
                          <div className="p-1 text-amber-400 flex flex-col items-center">
                            {/* Hand-drawn vector monospace pixel QR art */}
                            <pre className="text-[6.5px] leading-tight font-bold font-mono opacity-80 tracking-normal text-amber-400 select-none">
                              {`█▀▀▀▀▀█ ▄ ▄▄  ▄ █▀▀▀▀▀█
█ ███ █ █ ▄▀█ ▄ █ ███ █
█ ▀▀▀ █ █ █▄█   █ ▀▀▀ █
▀▀▀▀▀▀▀ ▀▄█ ▀ ▀ ▀▀▀▀▀▀▀
▄▀███▄▀  ▄▄█ ▀█▀█▀▄ ▀ █
▀ █ ▀ ▄▀▀▄▀ ▀▄▄  █ ▄█▀█
 ▀█▀▀██ ███▄ ██ ▄▀▀██  
▀▀   ▀▀  █▄ ███▄▀▀▄█▄ ▀
█▀▀▀▀▀█ ▄█▄  ███▀█▀ ██▀
█ ███ █  ▀▄█▄▀█  ▄ █▄█▄
█ ▀▀▀ █ ▀█ ▄▀█  ██ ▀ ▄█
▀▀▀▀▀▀▀ ▀   ▀ ▀▀▀▀▀▀▀▀▀`}
                            </pre>
                            {/* Inner Binance Pay Badge */}
                            <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 border border-amber-400/50 rounded flex items-center justify-center">
                              <span className="text-[8.5px] font-sans font-black text-amber-400 tracking-tighter">PAY</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 font-mono">
                      <div className="text-[10px] text-slate-400">
                        {qrScanned ? (
                          <span className="text-emerald-400 font-bold">✓ Camera scan detected! Payment pending approval on phone...</span>
                        ) : (
                          <span className="animate-pulse text-amber-405 flex items-center justify-center gap-1.5 text-[9.5px]">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                            Awaiting scan from your Binance App...
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 justify-center pt-1.5">
                        <button
                          type="button"
                          disabled={qrScanned}
                          onClick={() => {
                            setQrScanned(true);
                            onAddLog(`📸 Binance scanner read successfully! Initiating phone app approval loop...`, 'info');
                            setTimeout(() => {
                              handleProcessPayment();
                            }, 1500);
                          }}
                          className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-[10px] px-3.5 py-2 uppercase rounded-md transition-all border-0 cursor-pointer shadow-md"
                        >
                          ⚡ Simulate Binance Scan
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Option B: Interactive App Screen Submission */}
                {checkoutMethod === 'app_otp' && (
                  <div className="space-y-3 animate-fade-in text-left">
                    
                    {/* Simulated phone screen container */}
                    <div className="border border-slate-800 rounded-xl bg-slate-950/90 overflow-hidden relative shadow-inner">
                      
                      {/* Phone status bar */}
                      <div className="bg-[#020617] px-3 py-1 flex justify-between items-center text-[8px] font-mono text-slate-500 border-b border-slate-900">
                        <span className="font-bold flex items-center gap-1">
                          <Wifi className="h-2 w-2 text-amber-400 fill-current" /> LTE (Secure)
                        </span>
                        <span className="text-slate-400 text-center uppercase tracking-widest font-black">Binance App Secure Link</span>
                        <span>100% 🔋</span>
                      </div>

                      {/* Phone content screen */}
                      <div className="p-3.5 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <div className="flex items-center gap-1.5 text-slate-350">
                            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-sans font-black flex items-center justify-center text-[8px]">
                              O
                            </span>
                            <span>oshi_vip1@binance.com</span>
                          </div>
                          <span className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-900/60 px-1 py-0.2 rounded text-[8px]">
                            PAY VERIFIED
                          </span>
                        </div>

                        {/* Order Summary box inside App */}
                        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-850 text-xs font-mono space-y-1.5 relative overflow-hidden">
                          <label className="text-[7.5px] text-slate-500 uppercase tracking-wider block">Merchant Order Payload</label>
                          <div className="flex justify-between">
                            <span className="text-slate-350">NovaQuant AI Fuel:</span>
                            <span className="text-white font-extrabold">{purchaseModal.packName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-350">Conversion yield:</span>
                            <span className="text-amber-400 font-bold">+{purchaseModal.gasAmount} Fuel units</span>
                          </div>
                          <div className="border-t border-slate-850 pt-1 flex justify-between font-bold">
                            <span className="text-slate-400">Total charge:</span>
                            <span className="text-emerald-400">{purchaseModal.price}.00 USDT</span>
                          </div>
                        </div>

                        {/* PIN entry and input field */}
                        <div className="space-y-2">
                          <label className="text-[9px] text-slate-400 font-mono ml-0.5 text-left block flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5 text-amber-400" /> Enter 6-digit Binance App Security PIN:
                          </label>
                          <div className="flex justify-center gap-2">
                            {Array.from({ length: 6 }).map((_, idx) => {
                              const char = simulatedPin[idx];
                              return (
                                <div 
                                  key={idx}
                                  className={`w-8 h-9 border-2 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                                    simulatedPin.length === idx 
                                      ? 'border-amber-400 bg-amber-950/10 text-amber-400 scale-105' 
                                      : char 
                                      ? 'border-emerald-500/50 bg-slate-900 text-slate-200' 
                                      : 'border-slate-800 bg-[#020617] text-slate-600'
                                  } transition-all`}
                                >
                                  {char ? '●' : ''}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Interactive App Screen Numeric Keyboard */}
                        <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto pt-2">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                if (simulatedPin.length < 6) {
                                  setSimulatedPin(prev => prev + num);
                                }
                              }}
                              className="py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-mono rounded text-[11px] border border-slate-800 cursor-pointer transition-all"
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setSimulatedPin('')}
                            className="py-1 bg-slate-900/60 hover:bg-rose-950 text-rose-450 font-mono rounded text-[8.5px] uppercase font-bold border border-slate-800 cursor-pointer"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (simulatedPin.length < 6) {
                                setSimulatedPin(prev => prev + '0');
                              }
                            }}
                            className="py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-mono rounded text-[11px] border border-slate-800 cursor-pointer transition-all"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSimulatedPin(prev => prev.slice(0, -1));
                            }}
                            className="py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 font-mono rounded text-[10px] font-bold border border-slate-800 cursor-pointer"
                          >
                            ⌫
                          </button>
                        </div>

                        {/* Simulated Direct Pay Trigger */}
                        <div className="pt-2">
                          <button
                            type="button"
                            disabled={simulatedPin.length < 6}
                            onClick={handleProcessPayment}
                            className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-850 border border-transparent hover:scale-[1.01] text-slate-950 font-mono font-black py-2 rounded-lg text-[10.5px] uppercase active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            {simulatedPin.length < 6 ? `Enter 6-digit Secure PIN` : `🔓 CONFIRM PAYMENT OF ${purchaseModal.price} USDT`}
                          </button>
                        </div>

                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono italic text-center text-slate-500 leading-tight">
                      *Security keys are simulated end-to-end inside the secure NovaQuant client container sandbox framework.
                    </div>
                  </div>
                )}

                {/* Referrers config display */}
                <div className="border-t border-slate-850 pt-3">
                  <div className="space-y-1 bg-[#020617] p-2.5 rounded-lg border border-slate-900 font-mono text-[9px] text-left">
                    <span className="text-slate-500 block uppercase font-bold text-[8px]">ACTIVE INTRODUCER PARTNER CODES</span>
                    <input
                      type="text"
                      placeholder="Enter Referrer ID Email (Ex: piyumanjaleeoshi@gmail.com)"
                      value={referrerCode}
                      onChange={e => setReferrerCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 px-2 py-1 text-sky-400 rounded focus:border-amber-400 outline-none mt-1 select-all font-semibold"
                    />
                    <p className="text-slate-500 text-[8px] leading-tight pt-1">
                      The introduced address will immediately earn simulated 10% cash cashback, registered on NovaQuant.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {checkoutStep === 'loading' && (
              <div className="py-16 flex flex-col items-center justify-center space-y-4 select-none animate-fade-in text-center">
                <div className="relative">
                  {/* Outer circle animation */}
                  <div className="absolute inset-0 m-auto h-16 w-16 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin"></div>
                  <Loader2 className="h-16 w-16 text-amber-400 animate-pulse stroke-[1]" />
                </div>
                <div className="space-y-1 text-center">
                  <span className="text-xs font-mono text-slate-200 uppercase tracking-widest block font-extrabold">
                    DECRYPTING TRANSACTION BUNDLE...
                  </span>
                  <span className="text-[9.5px] font-mono text-slate-500 block">
                    Binance API secure websocket verifying transaction signature...
                  </span>
                </div>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="py-10 flex flex-col items-center justify-center space-y-4 select-none text-center animate-fade-in">
                <div className="h-16 w-16 rounded-full bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle className="h-10 w-10 text-emerald-400 animate-bounce stroke-[1.5]" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-black text-white uppercase tracking-wider">BINANCE APP APPROVED PAYMENT</h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Your converted amount of <span className="text-emerald-400 font-bold">+{purchaseModal.gasAmount} Units</span> has been added to the Active Bot Fuel Gauger!
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg font-mono text-[9.5px] text-left max-w-xs w-full space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Workspace:</span>
                    <strong className="text-slate-200 truncate pr-2">{activeWorkspace.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Settle Amount:</span>
                    <strong className="text-amber-400">{purchaseModal.price}.00 USDT</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction Status:</span>
                    <strong className="text-emerald-400">Settle Confirmed</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPurchaseModal(null)}
                  className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white font-mono font-bold py-2 px-6 rounded-lg text-[10px] uppercase active:scale-95 transition-all cursor-pointer"
                >
                  DISMISS AND CLOSE GATEWAY
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

