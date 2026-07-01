/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import {
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Zap,
  TrendingUp,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Info,
  Compass,
} from 'lucide-react';
import { BotConfig } from '../types';

export const EXCHANGE_LEVERAGE_LIMITS = {
  Binance: 125,
  Bybit: 100,
  Bitget: 125,
  OKX: 100,
  dYdX: 20,
  Coinbase: 10
} as const;

interface RiskShieldControllerProps {
  config: BotConfig;
  dailyRealizedPnl: number;
  onUpdateRiskSettings: (settings: Partial<Pick<BotConfig, 'mode' | 'maxDailyLossLimit' | 'enableTrailingStop' | 'trailingActivationMult' | 'leverageCeiling'>>) => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
  onChangeExchange?: (newExchange: 'Binance' | 'Bybit' | 'Bitget' | 'OKX' | 'dYdX' | 'Coinbase') => void;
  isLive?: boolean;
  binanceWalletBalance?: number;
}

export default function RiskShieldController({
  config,
  dailyRealizedPnl,
  onUpdateRiskSettings,
  onAddLog,
  onChangeExchange,
  isLive = false,
  binanceWalletBalance = 0,
}: RiskShieldControllerProps) {
  
  const activeExchange = config.exchange || 'Binance';
  const maxLeverageForExchange = EXCHANGE_LEVERAGE_LIMITS[activeExchange] || 125;

  // Quick profile changer helper
  const selectMode = (mode: 'GUARDIAN' | 'EQUILIBRIUM' | 'APEX') => {
    let updates: Partial<BotConfig> = { mode };
    
    if (mode === 'GUARDIAN') {
      updates = {
        ...updates,
        maxDailyLossLimit: 2.0,
        enableTrailingStop: true,
        trailingActivationMult: 1.2,
        leverageCeiling: Math.min(5, maxLeverageForExchange),
        riskPerTrade: 1.0,
        slAtrMultiplier: 1.0,
        tpAtrMultiplier: 2.5,
        rsiBuyThreshold: 58,
        rsiSellThreshold: 42,
      };
      onAddLog(`🛡️ RISK POLICY ACTIVE: Guardian mode activated. Trade risk set to 1.0% per trade with strict 1.0x ATR Stop-Loss. Leverage capped at ${updates.leverageCeiling}x.`, 'success');
    } else if (mode === 'EQUILIBRIUM') {
      updates = {
        ...updates,
        maxDailyLossLimit: 4.5,
        enableTrailingStop: true,
        trailingActivationMult: 1.5,
        leverageCeiling: Math.min(10, maxLeverageForExchange),
        riskPerTrade: 3.0,
        slAtrMultiplier: 1.5,
        tpAtrMultiplier: 3.0,
        rsiBuyThreshold: 55,
        rsiSellThreshold: 45,
      };
      onAddLog(`⚖️ RISK POLICY ACTIVE: Equilibrium balanced core activated. Trades configured to standard 3.0% position risk. Leverage capped at ${updates.leverageCeiling}x.`, 'info');
    } else if (mode === 'APEX') {
      updates = {
        ...updates,
        maxDailyLossLimit: 8.0,
        enableTrailingStop: false,
        trailingActivationMult: 2.0,
        leverageCeiling: Math.min(20, maxLeverageForExchange),
        riskPerTrade: 5.0,
        slAtrMultiplier: 2.5,
        tpAtrMultiplier: 4.5,
        rsiBuyThreshold: 52,
        rsiSellThreshold: 48,
      };
      onAddLog(`🔥 RISK POLICY ACTIVE: Apex dynamic yield mode activated with 5.0% risk per entry! Leverage headroom expanded. Capped at ${updates.leverageCeiling}x based on regulatory bounds.`, 'warn');
    }

    onUpdateRiskSettings(updates);
  };

  const referenceBalance = (isLive && binanceWalletBalance > 0) ? binanceWalletBalance : config.paperBalance;
  const isDailyLimitBreached = dailyRealizedPnl < 0 && Math.abs(dailyRealizedPnl) >= (referenceBalance * (config.maxDailyLossLimit / 100));
  const dailyDrawdownPercent = referenceBalance > 0 ? (Math.abs(Math.min(0, dailyRealizedPnl)) / referenceBalance) * 100 : 0;
  const drawdownSafetyMargin = Math.max(0, config.maxDailyLossLimit - dailyDrawdownPercent);

  return (
    <div className="sleek-card p-5 space-y-5 shadow-2xl relative overflow-hidden" id="risk-shield-controller-widget">
      
      {/* Visual Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-cyan-400 to-indigo-500 rounded-xl">
            <Shield className="h-5 w-5 text-slate-950 stroke-[2.5]" id="shield-head-icon" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm md:text-base tracking-tight uppercase">Capital Protection & Yield Shields</h3>
            <p className="text-[10px] text-slate-400 font-mono">SAFEGUARD PRO™ ALGORITHMIC CAP CLUSTERS</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] bg-slate-950 border border-slate-900 px-2.5 py-1 rounded">
          <span className="text-slate-500">Reset:</span>
          <span className="text-cyan-450 font-bold animate-pulse">00:00 UTC</span>
        </div>
      </div>

      {/* Three Risk Protection Policies Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="shield-mode-selectors">
        {/* Policy Mode A: GUARDIAN */}
        <div
          onClick={() => selectMode('GUARDIAN')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
            config.mode === 'GUARDIAN'
              ? 'border-emerald-500/80 bg-emerald-950/20 shadow-lg shadow-emerald-500/5'
              : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/30'
          }`}
          id="mode-guardian-card"
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded ${
                config.mode === 'GUARDIAN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-slate-900 text-slate-400'
              }`}>
                GUARDIAN
              </span>
              <Shield className={`h-4 w-4 ${config.mode === 'GUARDIAN' ? 'text-emerald-400 animate-pulse' : 'text-slate-600 group-hover:text-slate-455'}`} />
            </div>
            <h4 className="text-xs font-bold text-white leading-tight">Conservative Shield</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
              Limits trade-risk to **1.0%** and restricts entry whenever minor volatility or upcoming news blocks occur. Strict capital defense.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-900 flex justify-between items-center text-[9px] font-mono text-slate-500">
            <span>Risk per Entry:</span>
            <span className="text-emerald-400 font-bold">1.00%</span>
          </div>
        </div>

        {/* Policy Mode B: EQUILIBRIUM */}
        <div
          onClick={() => selectMode('EQUILIBRIUM')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
            config.mode === 'EQUILIBRIUM'
              ? 'border-cyan-500/80 bg-cyan-950/20 shadow-lg shadow-cyan-500/5'
              : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/30'
          }`}
          id="mode-equilibrium-card"
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded ${
                config.mode === 'EQUILIBRIUM' ? 'bg-cyan-950 text-cyan-400 border border-cyan-900' : 'bg-slate-900 text-slate-400'
              }`}>
                EQUILIBRIUM
              </span>
              <Compass className={`h-4 w-4 ${config.mode === 'EQUILIBRIUM' ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-450'}`} />
            </div>
            <h4 className="text-xs font-bold text-white leading-tight">Balanced Yield</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
              Maintains standard risk ratios of **3.0%** with standard indicators and restricts entries strictly during high impact CPI/ECB events.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-900 flex justify-between items-center text-[9px] font-mono text-slate-500">
            <span>Risk per Entry:</span>
            <span className="text-cyan-455 font-bold">3.00%</span>
          </div>
        </div>

        {/* Policy Mode C: APEX */}
        <div
          onClick={() => selectMode('APEX')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
            config.mode === 'APEX'
              ? 'border-pink-500/80 bg-pink-950/20 shadow-lg shadow-pink-500/5'
              : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/30'
          }`}
          id="mode-apex-card"
        >
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded ${
                config.mode === 'APEX' ? 'bg-pink-950 text-pink-400 border border-pink-900' : 'bg-slate-900 text-slate-400'
              }`}>
                APEX SURGE
              </span>
              <Flame className={`h-4 w-4 ${config.mode === 'APEX' ? 'text-pink-400' : 'text-slate-600 group-hover:text-slate-450'}`} />
            </div>
            <h4 className="text-xs font-bold text-white leading-tight">Aggressive Breakout</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
              Leverage risk limits raised to **5.0%** and continues tracking volatility spikes through events. Recommended for expert operators.
            </p>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-900 flex justify-between items-center text-[9px] font-mono text-slate-500">
            <span>Risk per Entry:</span>
            <span className="text-pink-400 font-bold">5.00%</span>
          </div>
        </div>

      </div>

      {/* Real-time Safeguards Status indicators */}
      <div className="bg-[#020617] border border-slate-900 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4" id="protection-indicators-panel">
        
        {/* Left Side: Drawdown Breaker Indicator */}
        <div className="space-y-2 text-left select-none">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-sans">
              <ShieldAlert className="h-4 w-4 text-pink-400 animate-pulse" /> Drawdown Circuit Breaker
            </span>
            <span className="font-mono text-[10px] text-slate-500">Threshold: {config.maxDailyLossLimit.toFixed(1)}% limit</span>
          </div>

          <p className="text-[10px] text-slate-400 leading-normal">
            Closes position and blocks remaining trade entries if today's net losses exceeds the set cap limit.
          </p>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-500">Current Realized:</span>
              <span className={`font-bold ${dailyRealizedPnl >= 0 ? 'text-emerald-450' : 'text-red-400'}`}>
                {dailyRealizedPnl >= 0 ? '+' : ''}${dailyRealizedPnl.toFixed(2)} ({dailyRealizedPnl >= 0 ? '0.0' : dailyDrawdownPercent.toFixed(2)}%)
              </span>
            </div>
            {/* Visual Progress bar */}
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isDailyLimitBreached ? 'bg-pink-500' : 'bg-cyan-500'}`}
                style={{ width: `${Math.min(100, Math.max(2, (dailyDrawdownPercent / config.maxDailyLossLimit) * 100))}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
              <span>{isDailyLimitBreached ? '🚨 CAP BREACHED: BOT TERMINATED' : '🟢 Circuit Breaker Arm safe'}</span>
              <span>Margin Headroom: {drawdownSafetyMargin.toFixed(2)}% left</span>
            </div>
          </div>
        </div>

        {/* Right Side: Dynamic Trailing Stop Summary */}
        <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-900 pt-4 md:pt-0 md:pl-4 text-left select-none">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase font-sans">
              <Zap className="h-4 w-4 text-yellow-400" /> Trailing Stop safeguards
            </span>
            <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
              config.enableTrailingStop ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-slate-950 text-slate-500'
            }`}>
              {config.enableTrailingStop ? 'ACTIVE' : 'OFF'}
            </span>
          </div>

          <p className="text-[10px] text-slate-400 leading-normal">
            Failsafe trailing mode automatically locks in profits once price advances by <b>{config.trailingActivationMult}x ATR</b>. It trails the asset high, shielding your client portfolio against sudden market flash crashes.
          </p>

          <div className="p-2.5 bg-slate-950 rounded-lg text-[9px] font-mono leading-relaxed text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Failsafe Trigger:</span>
              <span className="text-slate-300">ATR value x {config.trailingActivationMult}</span>
            </div>
            <div className="flex justify-between">
              <span>Trailing Lock distance:</span>
              <span className="text-slate-300">1.0x ATR</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={config.enableTrailingStop ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {config.enableTrailingStop ? '🛡️ Guarding open portfolio profit' : 'Fixed stop-loss active'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Manual Fine-Tuning sliders section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-1.5">
          <Sliders className="h-4 w-4 text-slate-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Fine-Tune Policy Thresholds</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          
          {/* Sliders 1: Daily loss breaker limit */}
          <div className="p-3 bg-slate-950 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span className="text-slate-400 font-mono">Daily Loss Breaker</span>
              <span className="text-pink-400 font-mono font-bold">{config.maxDailyLossLimit.toFixed(1)}% balance</span>
            </div>
            <div className="h-11 flex items-center">
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={config.maxDailyLossLimit}
                onChange={(e) => onUpdateRiskSettings({ maxDailyLossLimit: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                id="drawdraw-limit-slider"
              />
            </div>
            <p className="text-[9px] text-slate-500 font-mono leading-relaxed">
              Instantly limits the drawdown budget allowed per commercial account.
            </p>
          </div>

          {/* Sliders 2: Trailing ATR Activation multiplier */}
          <div className="p-3 bg-slate-950 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span className="text-slate-400 font-mono">Trailing Activate</span>
              <span className="text-yellow-400 font-mono font-bold">{config.trailingActivationMult.toFixed(1)}x ATR</span>
            </div>
            <div className="h-11 flex items-center">
              <input
                type="range"
                min="0.8"
                max="4"
                step="0.1"
                value={config.trailingActivationMult}
                onChange={(e) => onUpdateRiskSettings({ trailingActivationMult: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                id="trailing-mult-slider"
              />
            </div>
            <p className="text-[9px] text-slate-500 font-mono leading-relaxed">
              Lock trades stop loss at break-even + profit once price hits this x true range.
            </p>
          </div>

          {/* Sliders 3: Leverage Cap Ceiling */}
          <div className="p-3 bg-slate-950 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-semibold">
              <span className="text-slate-400 font-mono">Leverage Ceiling</span>
              <span className="text-indigo-400 font-mono font-bold">
                {config.leverageCeiling}x <span className="text-slate-550 text-[9px]">/ {maxLeverageForExchange}x max</span>
              </span>
            </div>
            <div className="h-11 flex items-center flex-col justify-center space-y-1">
              <input
                type="range"
                min="1"
                max={maxLeverageForExchange}
                step="1"
                value={Math.min(config.leverageCeiling, maxLeverageForExchange)}
                onChange={(e) => onUpdateRiskSettings({ leverageCeiling: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                id="leverage-cap-slider"
              />
              <div className="flex justify-between w-full text-[8px] font-mono text-slate-600">
                <span>1x (Spot)</span>
                <span>{Math.round(maxLeverageForExchange / 2)}x</span>
                <span>{maxLeverageForExchange}x</span>
              </div>
            </div>

            <div className="border-t border-slate-900 pt-2 flex items-center justify-between text-[9px] font-mono">
              <span className="text-slate-500">Workspace Exchange:</span>
              <select
                value={activeExchange}
                onChange={(e) => onChangeExchange?.(e.target.value as any)}
                className="bg-slate-900 text-indigo-400 border border-slate-800 text-[9.5px] rounded px-1.5 py-0.5 font-bold focus:outline-none cursor-pointer"
                id="leverage-exchange-selector"
              >
                <option value="Binance">Binance (125x)</option>
                <option value="Bybit">Bybit (100x)</option>
                <option value="Bitget">Bitget (125x)</option>
                <option value="OKX">OKX (100x)</option>
                <option value="dYdX">dYdX (20x)</option>
                <option value="Coinbase">Coinbase (10x)</option>
              </select>
            </div>

            <p className="text-[9px] text-slate-500 font-mono leading-relaxed pt-1">
              Liquidations ceiling is automatically regulatory-capped by your workspace's exchange.
            </p>
          </div>

        </div>
      </div>

      {/* Safety notices footer info */}
      <div className="p-3 bg-cyan-950/10 border border-cyan-500/10 rounded-xl flex items-start gap-2.5 text-left text-[10px] font-mono text-slate-400 leading-normal select-none">
        <Info className="h-4.5 w-4.5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-200">Algorithmic Trade Safety Check:</span> NovaQuant core AI modules analyze these risk protections atomically on every live price tick. Even when network websocket latencies occur, capital protections run client-side in non-blocking WebWorker scopes.
        </div>
      </div>

    </div>
  );
}
