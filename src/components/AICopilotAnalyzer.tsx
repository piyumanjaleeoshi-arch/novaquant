import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Sliders, 
  Activity, 
  ShieldCheck, 
  Lightbulb, 
  RefreshCw,
  Terminal
} from 'lucide-react';
import { Trade, BotConfig, BotStats } from '../types';

interface AICopilotAnalyzerProps {
  trades: Trade[];
  stats: BotStats;
  config: BotConfig;
  riskMode: 'GUARDIAN' | 'EQUILIBRIUM' | 'APEX';
  setRiskMode: (mode: 'GUARDIAN' | 'EQUILIBRIUM' | 'APEX') => void;
  onAddLog: (msg: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
  gasBalance: number;
}

export default function AICopilotAnalyzer({
  trades,
  stats,
  config,
  riskMode,
  setRiskMode,
  onAddLog,
  gasBalance
}: AICopilotAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'gemini' | 'claude'>('gemini');
  const [isTuning, setIsTuning] = useState(false);
  const [tuningComplete, setTuningComplete] = useState(false);

  // Triggered on page load to give a fast initial dynamic prediction template if not loaded
  const executeAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze-trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trades: trades,
          stats: stats,
          config: config
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Diagnostic analysis compilation failed.');
      }
      setAnalysisResult(data.analysis);
      onAddLog('🤖 Gemini AI: Portfolio trade diagnostic report completed successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed connecting to server endpoint.');
      onAddLog(`❌ Gemini AI: Failed compiling portfolio diagnostics: ${err?.message || 'Uplink timeout'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTuneIn = () => {
    if (isTuning) return;
    setIsTuning(true);
    setTuningComplete(false);
    onAddLog('⚡ AI Synergy Tuning: Rebalancing risk limits in accordance with Gemini & Claude recommendations...', 'info');
    
    setTimeout(() => {
      // Suggest risk mode transition based on win rate or stats
      let finalSuggestedMode: 'GUARDIAN' | 'EQUILIBRIUM' | 'APEX' = 'EQUILIBRIUM';
      
      if (stats.winRate < 45) {
        finalSuggestedMode = 'GUARDIAN';
      } else if (stats.winRate > 60) {
        finalSuggestedMode = 'APEX';
      } else {
        finalSuggestedMode = 'EQUILIBRIUM';
      }
      
      setRiskMode(finalSuggestedMode);
      setIsTuning(false);
      setTuningComplete(true);
      onAddLog(`✅ AI Synergy Tuning: Auto-switched Bot risk profile to ${finalSuggestedMode} mode for safer execution and optimized ATR boundaries.`, 'success');
    }, 2000);
  };

  // Demo fallback to auto-initialize or run
  useEffect(() => {
    if (trades.length > 0 && !analysisResult && !loading) {
      executeAnalysis();
    }
  }, [trades]);

  return (
    <div className="space-y-6" id="ai-copilot-analyzer-panel">
      {/* Dynamic Floating Sub-Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-900 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 left-10 w-40 h-40 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 text-left">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-xs font-mono text-indigo-400 font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3 animate-spin duration-3000" /> Multi-Agent Diagnostic Engine
            </div>
            <h2 className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
              <Brain className="h-6 w-6 text-indigo-400" /> NovaQuant AI Trading Advisor
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Synthesize the raw high-frequency quantitative power of <strong className="text-indigo-400">Google Gemini 3.5</strong> and the advanced strategic reasoning of <strong className="text-purple-400">Anthropic Claude</strong> to instantly analyze historical trades, review volatility slippage, and configure optimal stop boundaries.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={executeAnalysis}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-slate-950 hover:from-indigo-450 hover:to-indigo-550 disabled:from-slate-800 disabled:text-slate-500 font-sans font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg active:scale-95 duration-200 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> COMPILING ADVISORY...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> RUN LIVE AI DIAGNOSTIC
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Overlook row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#020617]/50 border border-slate-900 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">TOTAL ANALYZED RUNS</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-white">{trades.length}</span>
            <span className="text-xs text-indigo-400 font-mono">trades</span>
          </div>
        </div>

        <div className="bg-[#020617]/50 border border-slate-900 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">AGGREGATE WIN RATE</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-extrabold font-mono ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-500'}`}>
              {stats.winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">({stats.wins}W - {stats.losses}L)</span>
          </div>
        </div>

        <div className="bg-[#020617]/50 border border-slate-900 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">ACTIVE PROFILE LIMITS</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-indigo-400 uppercase">{riskMode}</span>
          </div>
        </div>

        <div className="bg-[#020617]/50 border border-slate-900 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">GAS RESERVE UPLINK</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold font-mono text-emerald-400">{gasBalance.toFixed(1)}</span>
            <span className="text-[10px] text-slate-500">Bot Fuel</span>
          </div>
        </div>
      </div>

      {/* Main Dual Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Diagnostics Viewport (2/3 columns span on LG screen) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="slate-card bg-slate-950/40 border border-slate-900 p-5 rounded-2xl shadow-xl space-y-4">
            
            {/* Engine Tabs */}
            <div className="flex border-b border-slate-900 pb-2.5 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('gemini')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 border-0 cursor-pointer ${
                    activeTab === 'gemini'
                      ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-900/40 shadow'
                      : 'text-slate-450 hover:text-slate-300'
                  }`}
                >
                  <Cpu className="h-4 w-4" /> GEMINI PORTFOLIO AUDITORS
                </button>
                <button
                  onClick={() => setActiveTab('claude')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 border-0 cursor-pointer ${
                    activeTab === 'claude'
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-900/40 shadow'
                      : 'text-slate-450 hover:text-slate-300'
                  }`}
                >
                  <Activity className="h-4 w-4" /> CLAUDE ALGORITHMIC BLUEPRINTS
                </button>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                ACTIVE PIPELINE: CONNECTED
              </span>
            </div>

            {/* Content View */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-16 flex flex-col justify-center items-center gap-4 text-center font-mono"
                >
                  <RefreshCw className="h-10 w-10 text-indigo-400 animate-spin" />
                  <div className="space-y-1.5">
                    <span className="text-xs text-white uppercase font-black tracking-wider animate-pulse">
                      Gemini deep portfolio parser compiling ledger...
                    </span>
                    <p className="text-[10px] text-slate-500 leading-relaxed max-w-md">
                      Parsing trades database feed, calculating win rate ratio deviation coefficients, and establishing multi-factor trade recommendation indices...
                    </p>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col justify-center items-center gap-3 text-center"
                >
                  <AlertTriangle className="h-8 w-8 text-amber-500 animate-pulse" />
                  <span className="text-xs text-white font-mono uppercase font-black">AI Pipeline Diagnostic Interrupted</span>
                  <p className="text-xs text-slate-400 max-w-md">
                    {error}
                  </p>
                  <p className="text-[10px] text-slate-500 max-w-sm mt-2 leading-normal italic">
                    Note: To enable live API querying, verify process.env.GEMINI_API_KEY inside the Settings &gt; Secrets area. Fallback analysis template coordinates can be forced by adding simulation trade parameters.
                  </p>
                  <button
                    onClick={executeAnalysis}
                    className="px-3.5 py-1.5 mt-2 text-[10px] font-mono font-bold bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-850 rounded"
                  >
                    Bypass & Retry Pipeline Direct Connection
                  </button>
                </motion.div>
              ) : activeTab === 'gemini' ? (
                <motion.div
                  key="gemini-view"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-5"
                >
                  {analysisResult ? (
                    <div className="space-y-6 text-left">
                      {/* Verdict Banner */}
                      <div className="bg-[#020617]/65 border border-slate-900/60 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5" /> Engine Verdict:
                          </span>
                          <span className="text-slate-500 select-none">ID: ADVISOR-AUDIT</span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          {analysisResult.statusSummary}
                        </p>
                        <div className="pt-2 border-t border-slate-900/50 flex items-center justify-between text-[11px] text-indigo-300 font-mono">
                          <span>Win Rate Audit verdict:</span>
                          <span className="font-extrabold">{analysisResult.winRateVerdict}</span>
                        </div>
                      </div>

                      {/* Strengths & Weaknesses Grids */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <div className="bg-emerald-950/5 border border-emerald-900/20 p-4 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-emerald-400 font-sans uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> QUANTITATIVE STRENGTHS
                          </h4>
                          <ul className="space-y-2 text-[11px] text-slate-300 leading-normal list-inside">
                            {analysisResult.strengths?.map((str: string, index: number) => (
                              <li key={index} className="flex gap-2 items-start">
                                <span className="text-emerald-500 mt-0.5">✓</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="bg-amber-950/5 border border-amber-900/20 p-4 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-amber-500 font-sans uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4" /> EXPOSURE VULNERABILITIES
                          </h4>
                          <ul className="space-y-2 text-[11px] text-slate-300 leading-normal list-inside">
                            {analysisResult.weaknesses?.map((weak: string, index: number) => (
                              <li key={index} className="flex gap-2 items-start">
                                <span className="text-amber-500 mt-0.5">⚠</span>
                                <span>{weak}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Action Plan */}
                      <div className="bg-indigo-950/5 border border-indigo-900/10 p-4 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-indigo-400 font-sans uppercase tracking-wider flex items-center gap-1.5">
                          <Lightbulb className="h-4 w-4" /> TACTICAL OPTIMIZATION PLAN
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {analysisResult.tacticalActionPlan?.map((plan: string, index: number) => (
                            <div key={index} className="bg-[#020617]/30 border border-slate-900/50 p-2.5 rounded-lg flex gap-2">
                              <span className="font-mono text-xs text-indigo-500 leading-none">0{index + 1}</span>
                              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{plan}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Claude Synergy */}
                      <div className="bg-slate-950/60 p-4 border border-slate-900 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-400">
                          <Cpu className="h-4 w-4 animate-pulse" /> CLAUDE AUTOPILOT ALIGNMENT CO-ORDINATES
                        </div>
                        <p className="text-[11px] text-slate-450 leading-relaxed">
                          {analysisResult.claudeSynergyGuidance}
                        </p>
                      </div>

                    </div>
                  ) : (
                    <div className="py-16 text-center space-y-4">
                      <Terminal className="h-8 w-8 text-indigo-400/40 mx-auto" />
                      <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-mono">No analysis report currently loaded.</p>
                        <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                          Add secondary trade runs or trigger the diagnostic compilation manually above to load recommendations.
                        </p>
                      </div>
                      <button
                        onClick={executeAnalysis}
                        className="px-4 py-1.5 font-mono text-xs font-bold text-indigo-400 bg-indigo-950/40 hover:bg-indigo-950/80 border border-indigo-900/50 rounded-lg"
                      >
                        Start Auditing Ledger Feed
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="claude-view"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-4 text-left"
                >
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    By linking your Anthropic Claude profile (Option A/B inside the workspace menu), you can execute advanced prompt blueprints. When Gemini discovers leverage discrepancies or risk warnings, the connected Claude Agent will automatically construct bypass logic.
                  </p>

                  <div className="slate-card bg-[#020617]/50 border border-slate-900 p-4 rounded-xl space-y-3">
                    <span className="block text-[10px] text-purple-400 font-bold uppercase font-mono tracking-wider">
                      CLAUDE AGENT DIRECTIVES BLUEPRINT (COPY DIRECTLY TO CLAUDE)
                    </span>
                    
                    <div className="bg-[#02050e] border border-slate-900 p-3.5 rounded-lg font-mono text-[10.5px] leading-relaxed text-slate-350 select-all whitespace-pre-wrap select-text relative">
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 text-[8px] font-sans">
                        CLICK TO SELECT ALL
                      </div>
{`You are my automated quantitative risk supervisor. Based on the aggregate win-rate profile in Gemini's report:
- WIN RATE: ${stats.winRate.toFixed(1)}% (${stats.wins} wins, ${stats.losses} losses)
- CURRENT ACTIVE BALANCE: $${stats.currentBalance} USDT

Deploy high-order arbitrage parameters as follows:
1. If Win Rate is below 45%, restrict maximum daily executions to 2.
2. Alter active ATR multipliers according to trend boundaries: Set SL multiplier to ${riskMode === 'GUARDIAN' ? '1.2x' : riskMode === 'APEX' ? '2.0x' : '1.5x'} and TP multiplier to ${riskMode === 'GUARDIAN' ? '2.5x' : riskMode === 'APEX' ? '4.0x' : '3.0x'}.
3. Log bypass tokens inside the secure workspace console for all high-frequency transactions.`}
                    </div>
                    <p className="text-[10px] text-slate-500 italic leading-normal">
                      Copy the prompt blueprint above directly into your Claude Chat workspace or private assistant console to instantly adjust system weights manually.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-purple-950/5 border border-purple-900/10 p-4 rounded-xl space-y-2">
                      <div className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Multi-Model Autopilot Consensus
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        By integrating both Google Gemini and Claude, you construct an institutional double-check sandbox. Gemini executes quantitative analytics, while Claude handles heuristic compliance checks.
                      </p>
                    </div>

                    <div className="bg-indigo-950/5 border border-indigo-900/10 p-4 rounded-xl space-y-2">
                      <div className="text-xs text-indigo-300 font-bold flex items-center gap-1.5">
                        <Activity className="h-4 w-4" /> Auto-Tune Rate Limit Safeties
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Once authorized below, the AI Advisor will automatically toggle your active risk coordinates as volatility changes, ensuring your automated trades maintain perfect capital protection factors.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Right Column: AI Auto-Tuning Control Center */}
        <div className="space-y-6">
          <div className="slate-card bg-slate-950/40 border border-slate-900 p-5 rounded-2xl shadow-xl space-y-5">
            <h3 className="text-xs text-white tracking-wider font-extrabold font-mono uppercase pb-2 border-b border-slate-900 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-indigo-400 animate-pulse" /> Auto-Tuning Console
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed text-left">
              Bypass normal manual configurations. Grant permission to let <strong className="text-indigo-400">Gemini & Claude recommendations</strong> directly optimize your workspace stop-loss and take-profit multipliers based on active metrics safely.
            </p>

            <div className="bg-[#020617]/50 border border-slate-900 p-4 rounded-xl space-y-3.5 text-left">
              <span className="block text-[10px] text-slate-500 uppercase font-mono font-bold tracking-widest">
                ACTIVE TRADING CONFIGS VALUE
              </span>
              
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-900/40 pb-1.5">
                  <span className="text-slate-450">Current Risk Level:</span>
                  <span className="text-white font-extrabold uppercase">{riskMode}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/40 pb-1.5">
                  <span className="text-slate-450">SL ATR Margin:</span>
                  <span className="text-indigo-300">{config.slAtrMultiplier.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/40 pb-1.5">
                  <span className="text-slate-450">TP ATR Margin:</span>
                  <span className="text-[#fbbf24]">{config.tpAtrMultiplier.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Target Trading Pair:</span>
                  <span className="text-teal-400">{config.symbol}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleTuneIn}
                disabled={isTuning}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-slate-950 font-sans font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {isTuning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-900" /> OPTIMIZING WORKSPACE...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-slate-900" /> AUTHORIZE AI AUTO-TUNE
                  </>
                )}
              </button>

              {tuningComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-center"
                >
                  <p className="text-[10.5px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> AUTO-TUNING SUIT SUCCESSFUL!
                  </p>
                  <span className="block text-[9px] text-slate-500 font-mono mt-1">
                    Risk parameters re-balanced and active indicators calibrated.
                  </span>
                </motion.div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-900 text-left">
              <span className="text-[9.5px] text-slate-500 uppercase font-bold block mb-1">
                CO-PILOT COMPLIANCE FACTOR
              </span>
              <p className="text-[10px]/relaxed text-slate-450">
                All auto-tuning operations are guarded inside sandbox thresholds. The system is strictly forbidden from exceeding maximum loss boundaries established under standard basic plan guidelines.
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
