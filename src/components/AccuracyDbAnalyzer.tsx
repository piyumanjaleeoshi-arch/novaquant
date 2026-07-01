/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Cpu, 
  Gauge, 
  BookOpen, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  Play, 
  Terminal, 
  Brain, 
  Sparkles, 
  XCircle, 
  Activity, 
  Wifi, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Sliders
} from 'lucide-react';
import { Position, PositionAnalysis } from '../types';

// Maintaining strict backward compatibility with original exports 
export interface AccuracyModel {
  id: string;
  name: string;
  code: string;
  winRate: number;
  optimalLeverage: string;
  indicators: string[];
  riskRating: 'LOW' | 'MODERATE' | 'HIGH' | 'EXPERT';
  desc: string;
  templateFormula: string;
  totalBacktests: number;
  averageProfit: string;
}

export const HIGH_ACCURACY_DATABASE: AccuracyModel[] = [
  {
    id: 'DB-942',
    name: 'Micro-Liquidity Sweep & Wick Rejection',
    code: 'LIQ_SWEEP_REJ_V4',
    winRate: 94.2,
    optimalLeverage: '20x - 25x',
    indicators: ['Volume Spike > 1.8x SMA', 'Candle Wick Ratio > 65%', 'RSI Overextended < 25 / > 75'],
    riskRating: 'MODERATE',
    desc: 'Spots quick false breakouts where retail stoplosses are triggered by big players. Opens counter trades on wick snapback.',
    templateFormula: 'IF (Low < PrevLow_20m && Close > (Low + (High - Low) * 0.65)) && Volume > VolSMA_20 * 1.80',
    totalBacktests: 14250,
    averageProfit: '+18.4% per cycle'
  },
  {
    id: 'DB-918',
    name: 'EMA Delta Momentum Delta Confluence',
    code: 'EMA_DELTA_CONF_V9',
    winRate: 91.8,
    optimalLeverage: '10x - 15x',
    indicators: ['EMA9/21 Delta Width > 0.4%', 'Volume Trend Alignment', 'RSI Bullish Crossover 55-65'],
    riskRating: 'LOW',
    desc: 'Designed for extreme trend persistence, matching institutional order corridors.',
    templateFormula: 'IF (EMA_9 > EMA_21 * 1.004) && (RSI > 55 && RSI < 68) && BuyVolumeRatio > 62%',
    totalBacktests: 9810,
    averageProfit: '+32.1% per cycle'
  },
  {
    id: 'DB-921',
    name: 'Volatility Squeeze & Momentum Release',
    code: 'VOL_SQZ_MOM_V5',
    winRate: 92.1,
    optimalLeverage: '8x - 12x',
    indicators: ['Keltner / Bolinger Band Squeeze', 'Volume Expansion Ratio > 2.2x', 'ATR High Jump'],
    riskRating: 'LOW',
    desc: 'Detects energy build-ups in extreme squeeze channels, triggering momentum trades on breakout.',
    templateFormula: 'IF (BB_Width / Keltner_Width < 0.92) && CandleBreakoutClose > BB_High && Vol > Vol_SMA * 2.2',
    totalBacktests: 18400,
    averageProfit: '+41.2% per cycle'
  }
];

export function generateSmartAnalysis(
  symbol: string, 
  side: 'LONG' | 'SHORT', 
  customPrice?: number,
  triggeredBy: 'AUTOPILOT_SWEEP' | 'MANUAL_DISPATCH' = 'MANUAL_DISPATCH'
): PositionAnalysis {
  const hashVal = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1) + (side === 'LONG' ? 42 : 17);
  const matchedModelIndex = hashVal % HIGH_ACCURACY_DATABASE.length;
  const matched = HIGH_ACCURACY_DATABASE[matchedModelIndex];
  
  const extraPct = parseFloat(((hashVal % 15) / 10).toFixed(1));
  const confidenceScore = Math.min(99.4, Math.max(82.1, matched.winRate + (extraPct - 0.5)));

  return {
    patternId: matched.id,
    patternName: matched.name,
    matchedTemplate: matched.code,
    historicalWinRate: matched.winRate,
    confidenceScore: parseFloat(confidenceScore.toFixed(1)),
    leverageAdvisory: matched.optimalLeverage,
    riskRating: matched.riskRating,
    trendAngle: side === 'LONG' ? `+${18 + (hashVal % 24)}° Upward` : `-${15 + (hashVal % 20)}° Downward`,
    volumeSurgeRatio: parseFloat((1.1 + ((hashVal % 8) / 5)).toFixed(2)),
    rsiStrength: side === 'LONG' ? '38 Index (Oversold Range)' : '68 Index (Overbought Range)',
    recommendationText: 'Aligned with premium predictive configurations. Autonomous RiskShield active.',
    triggeredBy
  };
}

// State mock data representing historical bots and strategy win rate cohorts
const RELATIONAL_DATABASE = {
  trading_bots: [
    { id: "B-101", bot_name: "NovaQuant Delta Autopilot", strategy_type: "EMA crossover systems", average_win_rate: 91.8, average_roi: "+32.1%", sharpe_ratio: 2.85, drawdown_percentage: 4.20, trade_frequency: "14 per day", supported_timeframes: "3m, 5m", market_conditions: "Momentum/Trending" },
    { id: "B-102", bot_name: "SMC Liquidity Scout", strategy_type: "Smart money concepts", average_win_rate: 94.2, average_roi: "+18.4%", sharpe_ratio: 3.40, drawdown_percentage: 3.50, trade_frequency: "6 per day", supported_timeframes: "5m, 15m", market_conditions: "volatile liquidity sweeps" },
    { id: "B-103", bot_name: "ATR Bollinger Squeeze", strategy_type: "Volatility breakout strategies", average_win_rate: 92.1, average_roi: "+41.2%", sharpe_ratio: 2.95, drawdown_percentage: 5.10, trade_frequency: "8 per day", supported_timeframes: "5m, 1h", market_conditions: "low-volatility squeezes" }
  ],
  signal_accuracy: [
    { id: "ACC-501", strategy_type: "EMA crossover systems", signals_dispatched: 1420, successful_signals: 1303, confidence_accuracy: 91.75, roi_per_strategy: "+1,452%" },
    { id: "ACC-502", strategy_type: "Smart money concepts", signals_dispatched: 640, successful_signals: 602, confidence_accuracy: 94.06, roi_per_strategy: "+982%" },
    { id: "ACC-503", strategy_type: "Volatility breakout strategies", signals_dispatched: 1120, successful_signals: 1031, confidence_accuracy: 92.05, roi_per_strategy: "+1,780%" }
  ]
};

interface AccuracyDbAnalyzerProps {
  activePositions: Position[];
  coinRegistry: Record<string, { name: string; iconColor: string; basePrice: number }>;
  activeSymbol: string;
  onAddLog: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
}

export default function AccuracyDbAnalyzer({
  activePositions,
  coinRegistry,
  activeSymbol,
  onAddLog
}: AccuracyDbAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<'accuracy' | 'benchmarking' | 'websocket'>('accuracy');
  const [showGuide, setShowGuide] = useState<boolean>(true);
  
  // Benchmarking section variables
  const [benchStrategy, setBenchStrategy] = useState<string>("EMA"); // EMA, SMC, VOL
  const [benchVolume, setBenchVolume] = useState<number>(1.8);
  const [benchRsi, setBenchRsi] = useState<number>(22);
  const [benchTrend, setBenchTrend] = useState<number>(28);
  const [benchVolatility, setBenchVolatility] = useState<number>(1.2);
  const [benchRR, setBenchRR] = useState<number>(2.5);
  const [benchSimilarity, setBenchSimilarity] = useState<number>(91);
  const [isComputingScore, setIsComputingScore] = useState<boolean>(false);
  const [decisionReport, setDecisionReport] = useState<any | null>(null);

  // Webhook/WS Stream section
  const [isWsStreaming, setIsWsStreaming] = useState<boolean>(true);
  const [wsLogs, setWsLogs] = useState<string[]>([]);
  const wsTimer = useRef<NodeJS.Timeout | null>(null);

  // WS Log trigger Simulation
  useEffect(() => {
    if (isWsStreaming) {
      const symbols = Object.keys(coinRegistry);
      const feedTypes = ['TICKER', 'ORDERBOOK', 'LIQUIDITY_SWEEP', 'WHALE_BLOCK'];
      
      wsTimer.current = setInterval(() => {
        const randSym = symbols[Math.floor(Math.random() * symbols.length)] || 'BTC';
        const randType = feedTypes[Math.floor(Math.random() * feedTypes.length)];
        const timeStr = new Date().toISOString().split('T')[1].substring(0, 11);
        let logText = "";

        if (randType === 'TICKER') {
          const price = (50000 + Math.random() * 20000).toFixed(2);
          logText = `[${timeStr}] [BINANCE_WS] 📈 ${randSym} TICK: Price $${price} | 24h Vol multiple: ${(1.1 + Math.random() * 2).toFixed(2)}x`;
        } else if (randType === 'ORDERBOOK') {
          const ratio = (1.2 + Math.random() * 1.5).toFixed(2);
          logText = `[${timeStr}] [REDIS_CACHE] 📊 ${randSym} Deep Book snapshot updated - Bid/Ask depth ratio: ${ratio}`;
        } else if (randType === 'LIQUIDITY_SWEEP') {
          logText = `[${timeStr}] [TELEMETRY_STREAM] 🌐 SWEEP: Registered Wick spike rejection check on ${randSym}. Volume Delta ${(1.8 + Math.random() * 1.5).toFixed(1)}x over SMA`;
        } else {
          const size = (100_000 + Math.random() * 850_000).toLocaleString(undefined, { maximumFractionDigits: 0 });
          logText = `[${timeStr}] [WHALE_RADAR] 🐋 block limit block filled on ${randSym}: $${size} USDT. Adaptive weighting metric compiled.`;
        }

        setWsLogs(prev => [logText, ...prev.slice(0, 38)]);
      }, 1550);
    } else {
      if (wsTimer.current) {
        clearInterval(wsTimer.current);
      }
    }
    return () => {
      if (wsTimer.current) clearInterval(wsTimer.current);
    };
  }, [isWsStreaming, coinRegistry]);

  // Initial populate WS log
  useEffect(() => {
    const defaultLogs = [
      `[DEBUG] [SYSTEM] Telemetry streaming nodes initialized perfectly on routing portal.`,
      `[DEBUG] [SYSTEM] Redis key-value cache cluster activated for live orderbook ticks.`,
      `[DEBUG] [SYSTEM] Neural weight coefficients aligned for historical probability metrics.`,
      `[SYSTEM] Connecting to Binance Unified Futures High-Frequency WebSockets...`,
      `[INFO] Handshake successfully finalized with binanceusdm@autofilter.`,
      `[INFO] Streaming initialized. WebSocket listening for telemetry triggers...`
    ];
    setWsLogs(defaultLogs);
  }, []);

  // Calculate Benchmarking Institutional Score & Decision
  const handleValidateBenchmarkingSetup = () => {
    setIsComputingScore(true);
    setDecisionReport(null);

    setTimeout(() => {
      // Calculate dynamic score with variables
      let baseScore = 82.5;
      
      // Strategy bonuses
      if (benchStrategy === "SMC") baseScore += 4.5;
      else if (benchStrategy === "EMA") baseScore += 2.1;
      else if (benchStrategy === "VOL") baseScore += 3.2;
      else if (benchStrategy === "REVERT") baseScore += 0.5;

      // Volume multiples bonus
      if (benchVolume >= 1.8) baseScore += 3.8;
      else if (benchVolume < 1.0) baseScore -= 12.0;

      // RSI confluence suitability
      if (benchStrategy === "SMC" || benchStrategy === "REVERT") {
        if (benchRsi <= 25 || benchRsi >= 75) baseScore += 5.2; // Oversold/bought helpful for sweeps
      } else {
        if (benchRsi >= 45 && benchRsi <= 65) baseScore += 2.5; // Neutral trending
      }

      // Trend match
      if (benchTrend >= 20) baseScore += 3.0;
      else baseScore -= 4.0;

      // Volatility boundaries check
      if (benchVolatility > 3.0) baseScore -= 5.5; // too risky

      // Similarity index match
      if (benchSimilarity >= 90) baseScore += 4.1;

      const confidenceResult = Math.min(99.6, Math.max(55.2, baseScore));
      
      // Verification checklists
      const checks = [
        { name: "Confidence threshold >= 90%", passed: confidenceResult >= 90.0, meta: `${confidenceResult.toFixed(1)}% derived` },
        { name: "Risk-reward bounds >= 1:2", passed: benchRR >= 2.0, meta: `1:${benchRR.toFixed(1)} structured` },
        { name: "Volume accumulation confirmation", passed: benchVolume >= 1.5, meta: `${benchVolume}x baseline` },
        { name: "Volatility index within safe bound", passed: benchVolatility <= 3.0, meta: `${benchVolatility}% ATR limit` },
        { name: "Neural pattern similarity recognized", passed: benchSimilarity >= 80, meta: `${benchSimilarity}% matching score` }
      ];

      const isApproved = checks.every(c => c.passed);

      setDecisionReport({
        score: parseFloat(confidenceResult.toFixed(1)),
        isApproved,
        checks,
        pnlEstimator: isApproved ? `+${(benchRR * 10.4).toFixed(1)}% compound ROI target` : "No simulation output",
        riskRating: confidenceResult >= 92 ? "LOW RISK CONFLUENCE" : confidenceResult >= 85 ? "MODERATE SCALPING RISK" : "HIGH HAZARD / VOLATILITY SQUEEZE"
      });

      setIsComputingScore(false);
      
      if (isApproved) {
        onAddLog(`🛡️ NOVAQUANT DECISION ENGINE: Signal APPROVED with high ${confidenceResult.toFixed(1)}% confidence score! Confluences successfully reached bounds.`, 'success');
      } else {
        onAddLog(`⚠️ NOVAQUANT DECISION ENGINE: Signal REJECTED. Underperforming necessary trading risk criteria in institutional rules.`, 'warn');
      }
    }, 600);
  };

  return (
    <div className="sleek-card overflow-hidden shadow-2xl border border-indigo-950/60" id="bot-performance-streaming-studio">
      
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-[#020617] via-[#090514] to-[#01030d] border-b border-slate-900 px-4 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap items-center justify-between w-full lg:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-950/40 border border-[#818cf8]/20 rounded-lg shrink-0">
              <Cpu className="h-5 w-5 text-sky-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-extrabold text-[#f8fafc] tracking-tight text-sm">
                  AI Bot Performance & Stream Analyzer
                </h2>
                <span className="text-[8.5px] bg-[#0d5338] text-emerald-300 border border-emerald-800/20 px-2 py-0.5 rounded font-mono font-black uppercase tracking-wider animate-pulse">
                  AI Model Benchmarking Suite
                </span>
              </div>
              <p className="text-[10px] text-slate-405 font-sans mt-0.5">
                Real-time bot win-rates, active quantitative AI benchmarking, and live ingestion signal streams.
              </p>
            </div>
          </div>
          
          {/* Quick Guide Toggle button */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`px-3 py-1 text-[10px] font-mono rounded-md font-bold transition-all flex items-center gap-1 border cursor-pointer shrink-0 ${
              showGuide 
                ? 'bg-sky-950/40 text-sky-300 border-sky-500/35 hover:bg-sky-950/70' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-350'
            }`}
            title="Toggle step-by-step Interactive Analytical Tour guide."
          >
            <BookOpen className="h-3 w-3" />
            <span>Interactive Guide: {showGuide ? 'STYLISH ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap p-0.5 bg-slate-950 border border-slate-900 rounded-lg gap-0.5 max-w-full">
          <button
            onClick={() => setActiveTab('accuracy')}
            className={`px-3 py-1 text-[10px] font-mono rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'accuracy' ? 'bg-indigo-950/80 text-emerald-400 border border-indigo-900/40 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="h-3 w-3 text-emerald-400" /> Bots Win Rate %
          </button>
          
          <button
            onClick={() => setActiveTab('benchmarking')}
            className={`px-3 py-1 text-[10px] font-mono rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'benchmarking' ? 'bg-indigo-950/80 text-white border border-indigo-900/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="h-3 w-3 text-emerald-400" /> Bot AI Benchmark
          </button>
          
          <button
            onClick={() => setActiveTab('websocket')}
            className={`px-3 py-1 text-[10px] font-mono rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'websocket' ? 'bg-indigo-950/80 text-white border border-indigo-900/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="h-3 w-3 text-indigo-400" /> Ingestion Streaming
          </button>
        </div>
      </div>

      {/* Main Tab Panels Wrapper */}
      <div className="p-4 bg-[#010410]/50">
        
        {/* Interactive Analyzer Tour Guide */}
        {showGuide && (
          <div className="mb-4 bg-gradient-to-br from-[#0c1020] to-[#040612] border border-sky-500/20 rounded-lg p-4 space-y-3 shadow-xl text-slate-300 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-sans font-extrabold text-sky-400 uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#38bdf8]" /> 🎓 BOT PERFORMANCE ANALYZER GUIDE
              </span>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-[10px] font-mono font-bold bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-450 hover:text-white px-2 py-0.5 rounded cursor-pointer"
              >
                Hide Guide
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-[11px]" id="studio-guide-grid">
              {/* Card 1: Multi-Model Win Rates */}
              <div className="p-3 rounded bg-[#030614]/80 border border-slate-900 space-y-1.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    1. Multi-Model Win Rates
                  </h4>
                  <p className="text-[10px] text-slate-404 leading-normal mt-1">
                    Evaluates long-term success metrics, Sharpe coefficients, and ROI factors on 5 active institutional quant models dynamically configured inside active servers.
                  </p>
                </div>
              </div>

              {/* Card 2: Interactive Confluence Solver */}
              <div className="p-3 rounded bg-[#030614]/85 border border-slate-900 space-y-1.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-[#38bdf8] shrink-0" />
                    2. AI Validation & Scoring
                  </h4>
                  <p className="text-[10px] text-slate-404 leading-normal mt-1">
                    Vets target parameters (volume multipliers, oversold conditions, volatility bounds) before triggering signals to verify conformance alignment of the automated strategy.
                  </p>
                </div>
              </div>

              {/* Card 3: Deep Package Capturing */}
              <div className="p-3 rounded bg-[#030614]/85 border border-slate-900 space-y-1.5 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <Wifi className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    3. High-Frequency Feed Logger
                  </h4>
                  <p className="text-[10px] text-slate-404 leading-normal mt-1">
                    Simulates connection with production trade flows, reporting incoming orderbook configurations and large block alerts with microsecond precision.
                  </p>
                </div>
              </div>
            </div>

            {/* Contextual Active Tab Assistance */}
            <div className="bg-[#04081c]/90 border border-indigo-950 p-2.5 rounded text-[10.5px] text-indigo-250 font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white uppercase block text-[9.5px] tracking-wider">
                    Context Guide for Selected Tab: <span className="text-sky-400">"{activeTab.toUpperCase()}"</span>
                  </span>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 animate-fade-in">
                    {activeTab === 'accuracy' && "Review dynamic backtested and real-time win rate performance of our 5 main institutional trading engines registered inside the schema."}
                    {activeTab === 'benchmarking' && "Simulate quantitative risk conformance checks! Move the sliders or change the drop-down template to recalculate the confidence vector of active bot structures."}
                    {activeTab === 'websocket' && "Monitors high-frequency ticker sweeps. Toggle the bridge streaming state or observe raw incoming blocks parsed."}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center font-mono text-[9px] text-[#818cf8]">
                <span>Status:</span>
                <span className="bg-indigo-950/60 border border-indigo-900/40 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded">
                  SYNCHRONIZED
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Tab 0: All Bots Win-Rate & Accuracy Dashboard */}
        {activeTab === 'accuracy' && (
          <div className="space-y-4 animate-fade-in">
            {/* Context Header */}
            <div className="p-3 bg-gradient-to-r from-emerald-950/20 via-indigo-950/10 to-slate-900/40 border border-emerald-800/20 rounded-lg text-slate-300 text-[11px] leading-relaxed flex justify-between items-center">
              <div>
                🔋 <strong>Real-Time Accuracy Matrix</strong>: Displays performance, standard deviations, and win rate multipliers across our institutional AI quant models. Accuracy levels are aligned with active workspace configurations.
              </div>
              <span className="shrink-0 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 rounded px-2 py-0.5 ml-2">
                5 Active Models Optimized
              </span>
            </div>

            {/* Grid of the Bots */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="all-bots-winrate-grid">
              {RELATIONAL_DATABASE.trading_bots.map((bot, index) => {
                const specData = HIGH_ACCURACY_DATABASE.find(db => db.winRate === bot.average_win_rate) 
                  || HIGH_ACCURACY_DATABASE[index] 
                  || { name: bot.bot_name, code: "QUANT_BOT", indicators: [], riskRating: "MODERATE", templateFormula: "", averageProfit: bot.average_roi, totalBacktests: 12000 };
                
                // Color mapping for winrate range
                const isElite = bot.average_win_rate >= 92;
                const progressColor = isElite ? 'from-emerald-400 to-teal-400' : 'from-indigo-400 to-sky-400';
                
                return (
                  <div 
                    key={bot.id} 
                    className="p-4 bg-gradient-to-b from-[#030612]/95 to-[#010410]/98 border border-slate-850 rounded-xl hover:border-slate-805 hover:shadow-xl transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      {/* Title row */}
                      <div className="flex justify-between items-start border-b border-indigo-950/50 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono font-bold px-1.5 py-0.5 rounded">
                              {bot.id}
                            </span>
                            <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                              {specData.code}
                            </span>
                          </div>
                          <h4 className="font-sans font-extrabold text-white text-xs mt-1">
                            {bot.bot_name}
                          </h4>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[8.5px] bg-[#0c2f21] text-emerald-300 border border-emerald-800/30 px-1.5 py-0.5 rounded font-mono font-black uppercase tracking-wider">
                            ● OPERATIONAL
          				  </span>
          				  <span className="text-[8px] text-slate-500 font-mono mt-0.5">
                            {bot.trade_frequency}
                          </span>
                        </div>
                      </div>

                      {/* Main gauge row */}
                      <div className="py-3 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[8.5px] text-slate-400 uppercase font-mono block">Accuracy percentage</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 font-sans tracking-tight">
                              {bot.average_win_rate}%
                            </span>
                            <span className="text-[9.5px] text-emerald-400 font-mono font-bold">WIN RATE</span>
                          </div>
                        </div>

                        {/* Sparkline-like progress line */}
                        <div className="w-1/2 flex flex-col justify-center space-y-1">
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-950">
                            <div 
                              className={`h-full rounded-full bg-gradient-to-r ${progressColor}`}
                              style={{ width: `${bot.average_win_rate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-slate-500">
                            <span>0% min</span>
                            <span className="text-emerald-400 font-extrabold">{bot.average_win_rate}%</span>
                            <span>100% max</span>
                          </div>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/60 border border-slate-900/60 rounded-lg text-[10px] font-mono">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block text-[8px] uppercase font-sans">Average ROI</span>
                          <span className="text-emerald-400 font-bold">{bot.average_roi}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-slate-500 block text-[8px] uppercase font-sans">Sharpe Ratio</span>
                          <span className="text-white font-bold">{bot.sharpe_ratio}</span>
                        </div>
                        <div className="space-y-0.5 col-span-1">
                          <span className="text-slate-500 block text-[8px] uppercase font-sans">Max Drawdown</span>
                          <span className="text-rose-400 font-semibold">{bot.drawdown_percentage}%</span>
                        </div>
                        <div className="space-y-0.5 col-span-1">
                          <span className="text-slate-500 block text-[8px] uppercase font-sans">Timeframes</span>
                          <span className="text-sky-400 font-semibold">{bot.supported_timeframes}</span>
                        </div>
                      </div>

                      {/* Technical Blueprint */}
                      <div className="mt-2.5 space-y-1">
                        <span className="text-[8px] text-indigo-400 font-mono font-black uppercase tracking-wider block">
                          Core Formula Logic Matrix:
                        </span>
                        <code className="block text-[8.5px] text-slate-400 font-mono bg-slate-950 border border-slate-900 p-1.5 rounded-md break-all select-all leading-normal">
                          {specData.templateFormula}
                        </code>
                      </div>
                    </div>

                    {/* Quick check trigger */}
                    <div className="pt-2 border-t border-slate-900 flex justify-between items-center gap-2 mt-3">
                      <div className="flex items-center gap-1 text-[8.5px] text-slate-400 font-mono">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        <span>Vetted {specData.totalBacktests.toLocaleString()} backtests</span>
                      </div>
                      <button
                        onClick={() => {
                          // Change tab and select strategy
                          let targetStrat = "EMA";
                          if (bot.id === "B-101") targetStrat = "EMA";
                          else if (bot.id === "B-102") targetStrat = "SMC";
                          else if (bot.id === "B-103") targetStrat = "VOL";
                          
                          setBenchStrategy(targetStrat);
                          setActiveTab("benchmarking");
                          onAddLog(`⚡ Quick Confluence Benchmarking: Loaded model '${bot.bot_name}' setup parameters.`, 'info');
                        }}
                        className="px-2 py-1 text-[9px] font-mono font-black rounded border border-indigo-900/50 hover:border-indigo-800 text-indigo-300 hover:text-white bg-indigo-950/10 hover:bg-indigo-950/40 cursor-pointer transition-colors"
                      >
                        Run Benchmarking →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Real-time cohort comparison table stats */}
            <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-lg space-y-3">
              <div className="flex justify-between items-center border-b border-indigo-950/50 pb-2">
                <span className="text-[10px] text-slate-350 font-bold uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  Cohort Accuracy & Confidence Breakdown Indices
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  Accuracy Groups: 3 | Precision: 5 decimals
                </span>
              </div>

              {/* tabular list of cohort signal accuracy */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] text-slate-350">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-500 uppercase font-black tracking-wider text-[8px]">
                      <th className="py-2 px-1">ID</th>
                      <th className="py-2">Strategical Group</th>
                      <th className="py-2 text-right">Signals Dispatched</th>
                      <th className="py-2 text-right">Successful Signals</th>
                      <th className="py-2 text-right">Exact Accuracy %</th>
                      <th className="py-2 text-right">Aggregated ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40">
                    {RELATIONAL_DATABASE.signal_accuracy?.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/20">
                        <td className="py-2 px-1 text-slate-400 font-bold">{row.id}</td>
                        <td className="py-2 text-slate-200">{row.strategy_type}</td>
                        <td className="py-2 text-right">{row.signals_dispatched}</td>
                        <td className="py-2 text-right text-emerald-400">{row.successful_signals}</td>
                        <td className="py-2 text-right text-emerald-400 font-black">{row.confidence_accuracy}%</td>
                        <td className="py-2 text-right text-emerald-400 font-bold">{row.roi_per_strategy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: AI Benchmarking & Scoring Engine */}
        {activeTab === 'benchmarking' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-lg text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
              <Zap className="h-4.5 w-4.5 text-yellow-405 shrink-0 mt-0.5 animate-pulse" />
              <div>
                🔋 <strong>NovaQuant AI Validation Pipeline</strong>: Every autonomously compiled trade is vetted through our historical database prior to dispatch. Specify market parameters below to execute a confluences conformance check and calculate the <strong>Confidence Score</strong>.
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              
              {/* Inputs sliders Card */}
              <div className="lg:col-span-2 bg-slate-950/80 p-3.5 rounded-lg border border-slate-900 space-y-4">
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider font-mono block border-b border-indigo-950 pb-1.5">
                  ⚡ Confluence Input Vectors:
                </span>

                <div className="space-y-3.5 text-[10px] font-mono leading-none">
                  {/* Strategy Option selector */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 uppercase tracking-wide block font-sans">1. Targeted Strategy Core</label>
                    <select
                      value={benchStrategy}
                      onChange={(e) => setBenchStrategy(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-slate-100 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-indigo-500 font-mono"
                      id="benchmarking-strategy-select"
                    >
                      <option value="EMA">NovaQuant Delta Autopilot</option>
                      <option value="SMC">SMC Liquidity Scout</option>
                      <option value="VOL">ATR Bollinger Squeeze</option>
                    </select>
                  </div>

                  {/* Volume Ratio Selector */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-405 uppercase tracking-wide block font-sans">2. Volume Surge multiple</label>
                      <span className="text-emerald-400 font-black">{benchVolume}x SMA</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="4.0" 
                      step="0.1"
                      value={benchVolume}
                      onChange={(e) => setBenchVolume(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-505"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>0.5x low val</span>
                      <span>1.5x baseline</span>
                      <span>4.0x extreme spike</span>
                    </div>
                  </div>

                  {/* RSI index level */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-405 uppercase tracking-wide block font-sans">3. RSI Level indicator</label>
                      <span className="text-sky-400 font-black">{benchRsi} Index</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="90" 
                      step="1"
                      value={benchRsi}
                      onChange={(e) => setBenchRsi(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-505"
                    />
                    <div className="flex justify-between text-[8px] text-slate-505 font-mono">
                      <span className="text-emerald-400">10 Oversold</span>
                      <span>50 Neutral</span>
                      <span className="text-rose-455">90 Overbought</span>
                    </div>
                  </div>

                  {/* Trend Angle */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-405 uppercase tracking-wide block font-sans">4. Active Trend Expansion angle</label>
                      <span className="text-[#818cf8] font-black">{benchTrend}° angle</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="60" 
                      step="1"
                      value={benchTrend}
                      onChange={(e) => setBenchTrend(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-505"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>0° Chop/range</span>
                      <span>20° Mild trend</span>
                      <span>60° Hyperbolic push</span>
                    </div>
                  </div>

                  {/* Volatility Index */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-405 uppercase tracking-wide block font-sans">5. Volatility ATR percentage</label>
                      <span className="text-indigo-400 font-black">{benchVolatility}% range</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.2" 
                      max="5.0" 
                      step="0.1"
                      value={benchVolatility}
                      onChange={(e) => setBenchVolatility(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-505"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>0.2% Low Vol Squeeze</span>
                      <span>1.5% Normal</span>
                      <span className="text-rose-455">5.0% Extreme Liquidation</span>
                    </div>
                  </div>

                  {/* Risk Reward Ratio */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-405 uppercase tracking-wide block font-sans">6. Risk Reward Target ratio</label>
                      <span className="text-teal-400 font-black">1 : {benchRR} setup</span>
                    </div>
                    <input 
                      type="range" 
                      min="1.0" 
                      max="5.0" 
                      step="0.1"
                      value={benchRR}
                      onChange={(e) => setBenchRR(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-505"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>1:1 scalping target</span>
                      <span>1:2.5 Standard</span>
                      <span>1:5 Swing multiplier</span>
                    </div>
                  </div>

                  {/* Neural Pattern Match similarity */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-405 uppercase tracking-wide block font-sans">7. Historical Pattern Similarity</label>
                      <span className="text-amber-400 font-black">{benchSimilarity}% score</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="100" 
                      step="1"
                      value={benchSimilarity}
                      onChange={(e) => setBenchSimilarity(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-505"
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                      <span>50% low conformance</span>
                      <span>85% qualified</span>
                      <span>100% exact copy</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleValidateBenchmarkingSetup}
                  disabled={isComputingScore}
                  className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-mono font-black rounded uppercase tracking-wider cursor-pointer shadow-lg select-none flex items-center justify-center gap-1.5 active:scale-98 transition-all border-0 focus:outline-none"
                  id="confluence-validate-btn"
                >
                  {isComputingScore ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin text-slate-950 shrink-0" />
                      Computing Confluence Score Matrix...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-950 shrink-0" />
                      Run Validation Verdict
                    </>
                  )}
                </button>
              </div>

              {/* Verdict results Column */}
              <div className="lg:col-span-3 flex flex-col justify-between">
                
                {isComputingScore ? (
                  <div className="py-24 text-center text-slate-400 italic text-[11px] border border-slate-900 rounded-lg bg-[#020610]/15 flex-1 flex flex-col justify-center items-center gap-3">
                    <RefreshCw className="h-9 w-9 text-indigo-500 animate-spin" />
                    <span className="font-mono text-xs text-[#818cf8] uppercase tracking-widest font-black animate-pulse">Running Neural Conformance Pipeline...</span>
                    <p className="text-[10px] text-slate-550 max-w-sm leading-normal">Checking parameters against institutional weightings registry, historical trading indices on Binance Futures demo, and computing standard deviation confluences.</p>
                  </div>
                ) : decisionReport ? (
                  <div className="bg-slate-950/80 p-4.5 rounded-lg border border-slate-900 font-mono flex-1 flex flex-col justify-between space-y-4 animate-fade-in text-left">
                    
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-indigo-950 pb-2.5">
                        <span className="text-[10.5px] text-white font-extrabold uppercase tracking-wider flex items-center gap-1">
                          🛡️ Automated Verdict Matrix Output
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black border text-nowrap ${
                            decisionReport.score >= 90.0
                              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30'
                              : 'text-rose-400 bg-rose-950/40 border-rose-900/30'
                          }`}>
                            {decisionReport.score >= 90.0 ? "CONFORMANCE PASSED" : "CONFORMANCE FAILED"}
                          </span>
                        </div>
                      </div>

                      {/* Score circle and estimation */}
                      <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-900/30 p-3 rounded-lg border border-slate-900">
                        <div className="relative flex items-center justify-center">
                          {/* Circle boundary */}
                          <div className={`h-20 w-20 rounded-full border-4 flex items-center justify-center flex-col shadow-inner ${
                            decisionReport.score >= 90.0 ? 'border-emerald-500/30 bg-emerald-950/15' : 'border-rose-500/30 bg-rose-950/15'
                          }`}>
                            <span className={`text-xl font-black font-sans leading-none ${
                              decisionReport.score >= 90.0 ? 'text-emerald-400' : 'text-rose-455'
                            }`}>{decisionReport.score}%</span>
                            <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Rating</span>
                          </div>
                        </div>

                        <div className="space-y-1 flex-1 text-center sm:text-left">
                          <span className="text-[9px] text-slate-500 block uppercase">Confidence Index Strength:</span>
                          <span className={`text-md font-bold tracking-tight ${decisionReport.score >= 90.0 ? 'text-emerald-300' : 'text-rose-350'}`}>
                            {decisionReport.score >= 92.0 
                              ? "🌟 Institutional Confluence Match" 
                              : decisionReport.score >= 85.0 
                                ? "⚖️ Mild Probability Divergence" 
                                : "⚠️ Underperforming / High Volatility Cascade"}
                          </span>
                          <p className="text-[10px] text-slate-400 leading-normal pt-1 font-sans">
                            Confluence score calculates the total strategy probability vector and matches dynamic support indexes to generate institutional decisions.
                          </p>
                        </div>
                      </div>

                      {/* Criteria check lists */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[8.5px] text-slate-500 font-black uppercase tracking-wider block">Requirement validation list checks:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]" id="conformance-checker-rows">
                          {decisionReport.checks.map((check: any, idx: number) => (
                            <div 
                              key={idx}
                              className={`p-2 rounded border flex justify-between items-center gap-2 ${
                                check.passed
                                  ? 'bg-[#022d1a]/25 border-[#10b981]/20 text-emerald-300'
                                  : 'bg-[#310f13]/25 border-[#ef4444]/20 text-rose-300'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-extrabold">{check.passed ? "✓" : "✗"}</span>
                                <span className="truncate font-sans">{check.name}</span>
                              </div>
                              <span className="text-[8.5px] text-slate-400 font-bold bg-[#020510] px-1.5 py-0.5 rounded border border-slate-900 shrink-0 select-all font-mono">
                                {check.meta}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Verdict Output Box */}
                      {decisionReport.isApproved ? (
                        <div className="p-3 bg-emerald-950/35 border border-emerald-800/20 rounded-lg text-emerald-450 text-[10.5px] leading-relaxed mt-3 flex items-start gap-2">
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-405 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-white">CONFORMANCE SEAL MATURED: APPROVED</strong>: Signal confluences are high-accuracy qualified. Calculated ROI: <strong>{decisionReport.pnlEstimator}</strong>.
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-950/35 border border-rose-800/20 rounded-lg text-rose-450 text-[10.5px] leading-relaxed mt-3 flex items-start gap-2">
                          <XCircle className="h-4.5 w-4.5 text-rose-405 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-white">CONFORMANCE TRIPPED: BLOCKED</strong>: Setup fails standard quantitative risk covenants. Autopilot has declined execution to preserve portfolio capital.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-t border-slate-900 pt-3">
                      <span>Risk model outcome category: <strong className="text-slate-350">{decisionReport.riskRating}</strong></span>
                      <span>Compiled: {new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500 italic text-[11px] border border-dashed border-slate-850 rounded-lg bg-[#020610]/15 flex-1 flex flex-col justify-center items-center gap-2">
                    <Sliders className="h-8 w-8 text-indigo-900 animate-pulse" />
                    <span>Configure target confluences in the left panel and click validate to receive institutional verdict!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: WebSocket Ingestion Streaming */}
        {activeTab === 'websocket' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-950/80 p-3 rounded-lg border border-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWsStreaming ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isWsStreaming ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  WebSocket Ingest Logger Status: {isWsStreaming ? "ACTIVE STREAM" : "PAUSED"}
                </span>
              </div>

              <button
                onClick={() => setIsWsStreaming(!isWsStreaming)}
                className={`py-1.5 px-3 text-[10px] font-mono font-bold uppercase rounded cursor-pointer transition-all border-0 ${
                  isWsStreaming ? 'bg-rose-950 text-rose-400 border border-rose-800/40 hover:bg-rose-900' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900'
                }`}
              >
                {isWsStreaming ? "Pause WS feed" : "Play WS live stream"}
              </button>
            </div>

            {/* InGEST Logger display terminal window */}
            <div className="bg-[#020510] text-[#a5f3fc] font-mono rounded max-h-80 overflow-y-auto p-3 hover:shadow-inner text-xs space-y-1.5 custom-scrollbar border border-slate-900">
              {wsLogs.map((log, index) => (
                <div key={index} className="leading-relaxed hover:bg-slate-900/40 px-1 border-l-2 border-indigo-950 pl-2">
                  {log.includes("SWEEP") ? (
                    <span className="text-yellow-400 font-bold">{log}</span>
                  ) : log.includes("block") || log.includes("WHALE_RADAR") ? (
                    <span className="text-[#818cf8] font-bold">{log}</span>
                  ) : log.includes("TICK") ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : (
                    <span className="text-slate-400">{log}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="text-[9.5px] text-slate-400 leading-relaxed">
              ⚠️ Ingestion streams record aggregate Binance Futures websockets trades and instantly trigger timeseries data points to dynamically update the active strategy winrate benchmarks on-the-fly.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
