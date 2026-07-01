/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Trade, TradeSide } from '../types';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Flame,
  Award,
  Activity,
  History,
  CheckCircle,
  XCircle,
  HelpCircle,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import PnLSummary from './PnLSummary';

interface PnLDashboardProps {
  trades: Trade[];
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  initialBalance: number;
}

export default function PnLDashboard({ trades, setTrades, initialBalance }: PnLDashboardProps) {
  // Filters State
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [sideFilter, setSideFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  
  // Hover state for interactive SVG chart
  const [activeHoverPoint, setActiveHoverPoint] = useState<{
    x: number;
    y: number;
    trade: Trade;
    cumulativePnl: number;
    cumulativeBalance: number;
    index: number;
  } | null>(null);

  // Get list of unique symbols from trades for filter dropdown
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>();
    trades.forEach(t => {
      if (t.symbol) symbols.add(t.symbol);
    });
    return Array.from(symbols).sort();
  }, [trades]);

  // Apply filters on trades
  const filteredTrades = useMemo(() => {
    // Sort trades chronologically simple to build progression
    const sorted = [...trades].sort((a, b) => a.exitTime - b.exitTime);
    return sorted.filter(t => {
      const matchSymbol = symbolFilter === 'ALL' || t.symbol === symbolFilter;
      const matchSide = sideFilter === 'ALL' || t.side === sideFilter;
      const matchReason = reasonFilter === 'ALL' || t.exitReason === reasonFilter;
      return matchSymbol && matchSide && matchReason;
    });
  }, [trades, symbolFilter, sideFilter, reasonFilter]);

  // Compute stats on filtered trades
  const stats = useMemo(() => {
    const totalCount = filteredTrades.length;
    if (totalCount === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        netPnl: 0,
        netPnlPercent: 0,
        grossProfit: 0,
        grossLoss: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        maxWin: 0,
        maxLoss: 0,
        longsCount: 0,
        shortsCount: 0,
        maxDrawdown: 0,
        tpCount: 0,
        slCount: 0,
        manualCount: 0,
        emergencyCount: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let maxWin = 0;
    let maxLoss = 0;
    let longsCount = 0;
    let shortsCount = 0;
    let tpCount = 0;
    let slCount = 0;
    let manualCount = 0;
    let emergencyCount = 0;

    filteredTrades.forEach(t => {
      const p = t.profit;
      if (p >= 0) {
        wins++;
        grossProfit += p;
        if (p > maxWin) maxWin = p;
      } else {
        losses++;
        grossLoss += Math.abs(p);
        if (p < maxLoss) maxLoss = p;
      }

      if (t.side === 'LONG') longsCount++;
      if (t.side === 'SHORT') shortsCount++;

      if (t.exitReason === 'TP') tpCount++;
      else if (t.exitReason === 'SL') slCount++;
      else if (t.exitReason === 'MANUAL') manualCount++;
      else if (t.exitReason === 'EMERGENCY') emergencyCount++;
    });

    const winRate = (wins / totalCount) * 100;
    const netPnl = grossProfit - grossLoss;
    const netPnlPercent = (netPnl / initialBalance) * 100;

    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.9 : 0) : grossProfit / grossLoss;
    const avgWin = wins === 0 ? 0 : grossProfit / wins;
    const avgLoss = losses === 0 ? 0 : grossLoss / losses;

    // Calculate Max Drawdown from running equity curve
    let peak = initialBalance;
    let maxDd = 0;
    let runningBalance = initialBalance;

    filteredTrades.forEach(t => {
      runningBalance += t.profit;
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const dd = ((peak - runningBalance) / peak) * 100;
      if (dd > maxDd) {
        maxDd = dd;
      }
    });

    return {
      totalTrades: totalCount,
      wins,
      losses,
      winRate,
      netPnl,
      netPnlPercent,
      grossProfit,
      grossLoss,
      profitFactor,
      avgWin,
      avgLoss,
      maxWin,
      maxLoss,
      longsCount,
      shortsCount,
      maxDrawdown: maxDd,
      tpCount,
      slCount,
      manualCount,
      emergencyCount,
    };
  }, [filteredTrades, initialBalance]);

  // Calculate Cumulative P&L Timeline Data points
  const pnlTimeline = useMemo(() => {
    let currentBal = initialBalance;
    let cumulativePnl = 0;
    
    return filteredTrades.map((trade, i) => {
      currentBal += trade.profit;
      cumulativePnl += trade.profit;
      return {
        index: i,
        trade,
        profit: trade.profit,
        cumulativePnl,
        cumulativeBalance: currentBal,
        timestamp: trade.exitTime
      };
    });
  }, [filteredTrades, initialBalance]);

  // Simulate historical trade data injection
  const handleSimulateTrades = () => {
    const coins = ['SOLUSDT', 'BTCUSDT', 'ETHUSDT', 'AVAXUSDT', 'DOGEUSDT', 'LINKUSDT'];
    const reasons: ('TP' | 'SL' | 'MANUAL' | 'EMERGENCY')[] = ['TP', 'SL', 'MANUAL', 'TP', 'TP', 'SL', 'TP'];
    
    const count = 15;
    const simulated: Trade[] = [];
    const startTime = Date.now() - 36 * 3600 * 1000; // 36 hours ago

    let lastBalance = initialBalance;

    for (let i = 0; i < count; i++) {
      const coin = coins[Math.floor(Math.random() * coins.length)];
      const side: TradeSide = Math.random() > 0.45 ? 'LONG' : 'SHORT';
      const exitReason = reasons[Math.floor(Math.random() * reasons.length)];
      
      const entryPrice = Math.random() * 150 + 20; // Simulated asset price
      let sizeValue = Math.floor(Math.random() * 40) + 10; // quantity
      
      // Compute a realistic profit/loss
      let profit = 0;
      let exitPrice = entryPrice;

      if (exitReason === 'TP') {
        const coef = 1.8 + Math.random() * 3.5; // percent gain
        profit = (entryPrice * (coef / 100)) * sizeValue;
        exitPrice = side === 'LONG' ? entryPrice * (1 + coef/100) : entryPrice * (1 - coef/100);
      } else if (exitReason === 'SL') {
        const coef = 1.0 + Math.random() * 1.5; // percent loss
        profit = -(entryPrice * (coef / 100)) * sizeValue;
        exitPrice = side === 'LONG' ? entryPrice * (1 - coef/100) : entryPrice * (1 + coef/100);
      } else {
        const coef = (Math.random() - 0.3) * 1.5; // mixed profit/loss
        profit = (entryPrice * (coef / 100)) * sizeValue;
        exitPrice = side === 'LONG' ? entryPrice * (1 + coef/100) : entryPrice * (1 - coef/100);
      }

      // Cap decimals
      profit = parseFloat(profit.toFixed(2));
      exitPrice = parseFloat(exitPrice.toFixed(4));
      
      const entryTime = startTime + i * 2.2 * 3600 * 1000 + Math.random() * 1200000;
      const exitTime = entryTime + 1.5 * 3600 * 1000 + Math.random() * 600000;

      simulated.push({
        id: `sim-tr-${10000 + i}`,
        symbol: coin,
        side,
        entryPrice: parseFloat(entryPrice.toFixed(4)),
        exitPrice,
        size: sizeValue,
        profit,
        exitReason,
        entryTime,
        exitTime
      });
    }

    // Append to current trades list
    setTrades(prev => {
      // Avoid duplicating simulated trades if they click again, generate new distinct ids
      const cleanPrev = prev.filter(t => !t.id.startsWith('sim-tr-'));
      return [...cleanPrev, ...simulated].sort((a, b) => a.exitTime - b.exitTime);
    });
  };

  // Safe file export simulation triggering a download in client browsers
  const handleCSVExport = () => {
    if (filteredTrades.length === 0) {
      alert("No trades found to export.");
      return;
    }

    const headers = "Trade ID,Symbol,Side,Entry Price,Exit Price,Size,Realized Profit,Exit Reason,Entry Time,Exit Time\n";
    const rows = filteredTrades.map(t => {
      return `${t.id},${t.symbol},${t.side},${t.entryPrice},${t.exitPrice},${t.size},${t.profit},${t.exitReason},"${new Date(t.entryTime).toISOString() || ''}","${new Date(t.exitTime).toISOString() || ''}"`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `novaquant_pnl_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset filters quickly
  const clearFilters = () => {
    setSymbolFilter('ALL');
    setSideFilter('ALL');
    setReasonFilter('ALL');
  };

  // SVG Chart Dimensions & Computations
  const chartHeight = 220;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 25;

  const chartParams = useMemo(() => {
    if (pnlTimeline.length === 0) return null;
    
    // Find min and max of cumulative values (include 0 baseline/initialBalance to draw nicely)
    const values = pnlTimeline.map(p => p.cumulativePnl);
    const maxVal = Math.max(0, ...values);
    const minVal = Math.min(0, ...values);
    
    // Safety padding so points don't clip at top or bottom
    const range = maxVal - minVal;
    const gridMin = minVal - (range === 0 ? 100 : range * 0.15);
    const gridMax = maxVal + (range === 0 ? 100 : range * 0.15);
    const gridRange = gridMax - gridMin;

    return {
      minVal,
      maxVal,
      gridMin,
      gridMax,
      gridRange
    };
  }, [pnlTimeline]);

  // Render SVG Path builders
  const svgElements = useMemo(() => {
    if (pnlTimeline.length === 0 || !chartParams) return null;
    const { gridMin, gridRange } = chartParams;
    const count = pnlTimeline.length;

    // We plot points across the width
    const points = pnlTimeline.map((p, i) => {
      // Step distribution
      const x = paddingX + (i / Math.max(1, count - 1)) * (chartWidth - paddingX * 2);
      // Height calculation (flipped axes for screen space)
      const ratio = (p.cumulativePnl - gridMin) / gridRange;
      const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
      return { x, y, p };
    });

    // Baseline (0 profit line)
    const baselineRatio = (0 - gridMin) / gridRange;
    const baselineY = chartHeight - paddingY - baselineRatio * (chartHeight - paddingY * 2);

    // Build line path
    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      points.slice(1).forEach(pt => {
        linePath += ` L ${pt.x} ${pt.y}`;
      });

      // Area path needs to close down to the baseline
      areaPath = `M ${points[0].x} ${baselineY}`;
      points.forEach(pt => {
        areaPath += ` L ${pt.x} ${pt.y}`;
      });
      areaPath += ` L ${points[points.length - 1].x} ${baselineY} Z`;
    }

    return { points, linePath, areaPath, baselineY };
  }, [pnlTimeline, chartParams]);

  return (
    <div className="space-y-6" id="pnl-dashboard-module">
      
      {/* 🚀 Header Actions and Banner Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a0f1d]/65 p-4 rounded-2xl border border-slate-900 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-950/50 rounded-lg border border-emerald-800/35">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </span>
            <h1 className="text-sm md:text-[15px] font-bold text-white tracking-tight uppercase font-mono flex items-center gap-2">
              NovaQuant P&L Analytics Hub <Sparkles className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 pl-8 font-sans">
            Diagnostic trade ledger and statistical health monitoring of active workspace nodes.
          </p>
        </div>

        {/* Action Button Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto font-mono text-[11px]">
          <button
            onClick={handleSimulateTrades}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 border border-purple-800/50 bg-[#120b22] hover:bg-[#1a102f] hover:border-purple-700 text-purple-250 font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer select-none"
            id="btn-simulate-trades-pnl"
          >
            <Activity className="h-3.5 w-3.5 text-purple-400 animate-pulse" /> Inject Simulated Run
          </button>

          <button
            onClick={handleCSVExport}
            disabled={filteredTrades.length === 0}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-800 bg-[#060a13] hover:bg-slate-900 hover:border-slate-700 text-slate-300 font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
            id="btn-export-csv-pnl"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" /> Export ledger
          </button>
        </div>
      </div>

      {/* 📈 Aggregate analytical summary cards and Recharts distribution */}
      <PnLSummary trades={trades} initialBalance={initialBalance} />

      {/* 📊 Central Profitability Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="pnl-stats-cards-grid">
        
        {/* Metric 1: Net Cumulative Realized P&L */}
        <div className="sleek-card p-4 space-y-2 border border-slate-900 shadow-lg relative overflow-hidden backdrop-blur-md bg-[#040812]/50">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider select-none">
            <span>Net Realized Income / PNL</span>
            <Activity className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <div className={`text-xl md:text-2xl font-bold font-mono tracking-tight flex items-baseline gap-1.5 ${stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono leading-none">
              {stats.netPnl >= 0 ? (
                <span className="text-emerald-450 flex items-center font-bold">
                  <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> +{stats.netPnlPercent.toFixed(2)}%
                </span>
              ) : (
                <span className="text-rose-450 flex items-center font-bold">
                  <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" /> {stats.netPnlPercent.toFixed(2)}%
                </span>
              )}
              <span className="text-slate-500 font-normal">of capital</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-900/10 to-transparent pointer-events-none" />
        </div>

        {/* Metric 2: Win Frequency Score */}
        <div className="sleek-card p-4 space-y-2 border border-slate-900 shadow-lg relative overflow-hidden backdrop-blur-md bg-[#040812]/50">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider select-none">
            <span>Execution Success Rate</span>
            <Award className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1.5">
              <span>{stats.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <span className="text-emerald-400 font-semibold">{stats.wins} Wins</span>
              <span>/</span>
              <span className="text-rose-400 font-semibold">{stats.losses} Losses</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-900/10 to-transparent pointer-events-none" />
        </div>

        {/* Metric 3: Profit Factor Lever */}
        <div className="sleek-card p-4 space-y-2 border border-slate-900 shadow-lg relative overflow-hidden backdrop-blur-md bg-[#040812]/50">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider select-none">
            <span>Profit Factor Ratio</span>
            <BarChart3 className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="space-y-1.5">
            <div className={`text-xl md:text-2xl font-bold font-mono tracking-tight ${stats.profitFactor >= 2 ? 'text-emerald-450' : stats.profitFactor >= 1 ? 'text-sky-400' : 'text-slate-350'}`}>
              <span>{stats.profitFactor.toFixed(2)}x</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 flex items-center leading-none">
              <span>Gross Profit Ratio {stats.profitFactor >= 1 ? 'Positive' : 'Restricted'}</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-900/10 to-transparent pointer-events-none" />
        </div>

        {/* Metric 4: Risk metrics (Max DD) */}
        <div className="sleek-card p-4 space-y-2 border border-slate-900 shadow-lg relative overflow-hidden backdrop-blur-md bg-[#040812]/50">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider select-none">
            <span>Max Peak Drawdown</span>
            <Flame className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="space-y-1.5">
            <div className="text-xl md:text-2xl font-bold font-mono text-rose-400 tracking-tight flex items-baseline gap-1.5">
              <span>-{stats.maxDrawdown.toFixed(2)}%</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              <span>Account High-Water Drop</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-900/10 to-transparent pointer-events-none" />
        </div>

      </div>

      {/* 🧭 Filter Station */}
      <div className="bg-[#030611] p-3 rounded-xl border border-slate-900 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] shadow-sm select-none">
        
        {/* Left Section: Active filters counter */}
        <div className="flex items-center gap-2 pl-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Filtering Console:</span>
          <span className="text-emerald-450 font-bold px-1.5 py-0.5 bg-emerald-950/40 rounded border border-emerald-900/50">
            {filteredTrades.length} / {trades.length} Trades Shown
          </span>
        </div>

        {/* Middle Select Inputs */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Symbol Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Asset:</span>
            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="bg-slate-950 border border-slate-850 text-slate-300 font-mono text-[11px] rounded px-2 py-1 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">ALL COINS</option>
              {uniqueSymbols.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          {/* Direction Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Side:</span>
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value)}
              className="bg-slate-950 border border-slate-850 text-slate-300 font-mono text-[11px] rounded px-2 py-1 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">ALL DIRECTIONS</option>
              <option value="LONG">LONG Only</option>
              <option value="SHORT">SHORT Only</option>
            </select>
          </div>

          {/* Reason Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Trigger:</span>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="bg-slate-950 border border-slate-850 text-slate-300 font-mono text-[11px] rounded px-2 py-1 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">ALL TRIGGERS</option>
              <option value="TP">Take Profit (TP)</option>
              <option value="SL">Stop Loss (SL)</option>
              <option value="MANUAL">Manual Close</option>
              <option value="EMERGENCY">Emergency Stop</option>
            </select>
          </div>

          {/* Clear button if active */}
          {(symbolFilter !== 'ALL' || sideFilter !== 'ALL' || reasonFilter !== 'ALL') && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1 text-rose-450 hover:text-rose-300 border border-rose-950/40 hover:border-rose-900 bg-rose-950/20 rounded cursor-pointer select-none"
            >
              Reset
            </button>
          )}

        </div>
      </div>

      {/* 📈 Chart Screen Workspace (Main cumulative P&L line graph) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Line Graph */}
        <div className="lg:col-span-8 sleek-card p-4 flex flex-col justify-between space-y-4 shadow-xl border border-slate-900 min-h-[340px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 select-none pr-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <h3 className="font-semibold text-white text-[12px] font-mono uppercase tracking-wider">
                Realized Capital Growth Progression (Equity Curve)
              </h3>
            </div>
            <span className="text-[9px] text-[#38bdf8] font-bold font-mono tracking-widest bg-cyan-950/50 border border-cyan-900/60 px-2 py-0.5 rounded">
              {stats.totalTrades === 0 ? 'MONITORING BLOCKED' : 'TIMELINE LIVE'}
            </span>
          </div>

          {/* SVG Core Graph Container */}
          <div className="relative flex-grow flex items-center justify-center pt-2">
            
            {stats.totalTrades === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm font-sans" id="chart-placeholder">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-full animate-pulse">
                  <Activity className="h-6 w-6 text-slate-500" />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-slate-200">No trading data available</span>
                  <span className="block text-[11px] text-slate-500">
                    No closed trades pass the active filter criteria. Run the bot simulator or load a mock session above to test P&L calculations.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateTrades}
                  className="px-4 py-1.5 border border-purple-800/40 hover:border-purple-800/80 bg-purple-950/20 rounded-md font-mono text-[10px] text-purple-300 font-bold uppercase transition-all tracking-wider select-none cursor-pointer"
                >
                  Generate sample run data
                </button>
              </div>
            ) : (
              <div className="w-full h-full relative" id="pnl-canvas-holder">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                    </linearGradient>
                    <linearGradient id="areaGradLoss" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.00" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.22" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    if (!chartParams) return null;
                    const val = chartParams.gridMin + chartParams.gridRange * ratio;
                    const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
                    return (
                      <g key={idx} className="opacity-40">
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="#1e293b"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={paddingX - 10}
                          y={y + 3}
                          fill="#64748b"
                          fontSize="8"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {val >= 0 ? '+' : ''}${val.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bottom boundary line */}
                  <line
                    x1={paddingX}
                    y1={chartHeight - paddingY}
                    x2={chartWidth - paddingX}
                    y2={chartHeight - paddingY}
                    stroke="#334155"
                    strokeWidth="1.5"
                  />

                  {/* 0 Baseline Reference */}
                  {svgElements && (
                    <line
                      x1={paddingX}
                      y1={svgElements.baselineY}
                      x2={chartWidth - paddingX}
                      y2={svgElements.baselineY}
                      stroke="#475569"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      className="opacity-55"
                    />
                  )}

                  {/* Filled Area Gradient */}
                  {svgElements && svgElements.areaPath && (
                    <path
                      d={svgElements.areaPath}
                      fill="url(#areaGrad)"
                      className="transition-all duration-350"
                    />
                  )}

                  {/* Line Overlay */}
                  {svgElements && svgElements.linePath && (
                    <path
                      d={svgElements.linePath}
                      fill="none"
                      stroke={stats.netPnl >= 0 ? '#10b981' : '#ef4444'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-350"
                    />
                  )}

                  {/* Circle Dots for trades */}
                  {svgElements && svgElements.points && svgElements.points.map((pt, index) => {
                    const isHovered = activeHoverPoint && activeHoverPoint.index === index;
                    return (
                      <circle
                        key={index}
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 3}
                        fill={pt.p.profit >= 0 ? '#34d399' : '#f87171'}
                        stroke="#01040a"
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="cursor-pointer transition-all hover:scale-130"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveHoverPoint({
                            x: pt.x,
                            y: pt.y,
                            trade: pt.p.trade,
                            cumulativePnl: pt.p.cumulativePnl,
                            cumulativeBalance: pt.p.cumulativeBalance,
                            index
                          });
                        }}
                        onMouseLeave={() => setActiveHoverPoint(null)}
                      />
                    );
                  })}
                </svg>

                {/* Micro tooltip HUD absolute on SVG */}
                {activeHoverPoint && (
                  <div
                    className="absolute p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 font-mono text-[10px] shadow-2xl pointer-events-none z-30"
                    style={{
                      left: `${(activeHoverPoint.x / chartWidth) * 100}%`,
                      transform: 'translate(-50%, -105%)',
                      top: `${(activeHoverPoint.y / chartHeight) * 100}%`,
                    }}
                  >
                    <div className="flex justify-between items-center gap-5 border-b border-slate-900 pb-1 text-slate-400">
                      <span>Trade #{activeHoverPoint.index + 1}</span>
                      <span>{new Date(activeHoverPoint.trade.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <div className="font-bold text-white uppercase flex items-center justify-between gap-4">
                      <span>{activeHoverPoint.trade.symbol}</span>
                      <span className={activeHoverPoint.trade.side === 'LONG' ? 'text-sky-400' : 'text-orange-400'}>{activeHoverPoint.trade.side}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">P&L outcome:</span>
                      <span className={`font-bold ${activeHoverPoint.trade.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeHoverPoint.trade.profit >= 0 ? '+' : ''}${activeHoverPoint.trade.profit.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-900 pt-1">
                      <span className="text-slate-400">Balance:</span>
                      <span className="font-bold text-cyan-333">
                        ${activeHoverPoint.cumulativeBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SVG Axis / Legend indicator footer */}
          {stats.totalTrades > 0 && (
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono select-none px-6">
              <span>First recorded trade</span>
              <span>Execution timeline distribution (Chronological)</span>
              <span>Latest trade closed</span>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Secondary Statistics Details & triggers */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Diagnostic Category 1: Execution ratios */}
          <div className="sleek-card p-4 space-y-4 border border-slate-900 shadow-xl backdrop-blur bg-[#040812]/40">
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2.5 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-sky-450" /> Analytical Ratios
            </h3>

            <div className="space-y-3 font-mono text-[11px] text-slate-400">
              
              <div className="flex justify-between items-center border-b border-slate-900/55 pb-1">
                <span className="text-slate-500 flex items-center gap-1">
                  Avg Winning Trade
                </span>
                <span className="text-emerald-400 font-bold">
                  +${stats.avgWin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-900/55 pb-1">
                <span className="text-slate-500 flex items-center gap-1">
                  Avg Losing Trade
                </span>
                <span className="text-rose-400 font-bold">
                  -${stats.avgLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-900/55 pb-1">
                <span className="text-slate-500">
                  Risk/Reward (Avg Win/Loss)
                </span>
                <span className="text-slate-200 font-bold">
                  {stats.avgLoss === 0 ? 'Infinite' : (stats.avgWin / stats.avgLoss).toFixed(2)}x
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-900/55 pb-1">
                <span className="text-slate-500">
                  Best Winning Trade
                </span>
                <span className="text-emerald-450 font-bold">
                  +${stats.maxWin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-900/55 pb-1">
                <span className="text-slate-500">
                  Worst Losing Trade
                </span>
                <span className="text-rose-455 font-bold">
                  -${Math.abs(stats.maxLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">
                  Sides Played Split (L / S)
                </span>
                <span className="text-slate-200 font-bold leading-none">
                  {stats.longsCount}L <span className="text-slate-700">|</span> {stats.shortsCount}S
                </span>
              </div>

            </div>
          </div>

          {/* Diagnostic Category 2: Exit Reason Breakdown Progress track */}
          <div className="sleek-card p-4 space-y-4 border border-slate-900 shadow-xl backdrop-blur bg-[#040812]/40">
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2.5">
              Closed Trade Trigger Distribution
            </h3>

            <div className="space-y-3 font-mono text-[10px]">
              
              {/* Take Profit Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span className="font-bold flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-400" /> TAKE PROFIT (TP)
                  </span>
                  <span className="text-slate-200 font-bold">{stats.tpCount} trades ({stats.totalTrades === 0 ? 0 : Math.round(stats.tpCount / stats.totalTrades * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 roundedOverflow overflow-hidden border border-slate-900">
                  <div
                    className="bg-emerald-450 h-full rounded"
                    style={{ width: `${stats.totalTrades === 0 ? 0 : (stats.tpCount / stats.totalTrades * 100)}%` }}
                  />
                </div>
              </div>

              {/* Stop Loss Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span className="font-bold flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-rose-450" /> STOP LOSS (SL)
                  </span>
                  <span className="text-slate-200 font-bold">{stats.slCount} trades ({stats.totalTrades === 0 ? 0 : Math.round(stats.slCount / stats.totalTrades * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 roundedOverflow overflow-hidden border border-slate-900">
                  <div
                    className="bg-rose-500 h-full rounded"
                    style={{ width: `${stats.totalTrades === 0 ? 0 : (stats.slCount / stats.totalTrades * 100)}%` }}
                  />
                </div>
              </div>

              {/* Manual Close Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span className="font-bold flex items-center gap-1">
                    <History className="h-3 w-3 text-sky-400" /> MANUAL DISCHARGE
                  </span>
                  <span className="text-slate-200 font-bold">{stats.manualCount} trades ({stats.totalTrades === 0 ? 0 : Math.round(stats.manualCount / stats.totalTrades * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 roundedOverflow overflow-hidden border border-slate-900">
                  <div
                    className="bg-sky-405 h-full rounded"
                    style={{ width: `${stats.totalTrades === 0 ? 0 : (stats.manualCount / stats.totalTrades * 100)}%` }}
                  />
                </div>
              </div>

              {/* Emergency Stop Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span className="font-bold flex items-center gap-1">
                    <Flame className="h-3 w-3 text-amber-500" /> EMERGENCY HALT
                  </span>
                  <span className="text-slate-200 font-bold">{stats.emergencyCount} trades ({stats.totalTrades === 0 ? 0 : Math.round(stats.emergencyCount / stats.totalTrades * 100)}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 roundedOverflow overflow-hidden border border-slate-900">
                  <div
                    className="bg-amber-500 h-full rounded"
                    style={{ width: `${stats.totalTrades === 0 ? 0 : (stats.emergencyCount / stats.totalTrades * 100)}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* 🧾 Interactive Detailed Trade Journal */}
      <div className="sleek-card overflow-hidden shadow-2xl border border-slate-900 bg-[#02050c]/55" id="pnl-journal-table">
        <div className="flex justify-between items-center border-b border-slate-800 px-4 py-3 select-none bg-transparent">
          <div className="flex items-center gap-2">
            <History className="h-4 pr-1 text-emerald-400" />
            <h2 className="font-sans font-semibold text-white tracking-tight text-sm">
              Trade Journal Ledger ({filteredTrades.length} recorded positions)
            </h2>
          </div>
          <span className="text-[9px] text-slate-400 font-mono font-bold tracking-widest leading-none bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded uppercase">
            AUDITED LEDGER
          </span>
        </div>

        <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-[#020617] text-slate-400 select-none uppercase font-mono border-b border-slate-800 text-[10px] sticky top-0 bg-opacity-95 backdrop-blur z-20">
                <th className="py-2.5 px-4 font-normal">Closed Time</th>
                <th className="py-2.5 px-3 font-normal">Trade ID</th>
                <th className="py-2.5 px-3 font-normal">Symbol</th>
                <th className="py-2.5 px-3 font-normal">Direction</th>
                <th className="py-2.5 px-3 font-normal">Trade Size</th>
                <th className="py-2.5 px-3 font-normal">Entry Price</th>
                <th className="py-2.5 px-3 font-normal">Exit Price</th>
                <th className="py-2.5 px-3 font-normal">Exit Trigger</th>
                <th className="py-2.5 px-4 font-normal text-right">Realized Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic font-mono text-[11px]">
                    No closed trades found matching your active filter configuration.
                  </td>
                </tr>
              ) : (
                [...filteredTrades].reverse().map((trade) => {
                  const isLong = trade.side === 'LONG';
                  const isWin = trade.profit >= 0;
                  
                  const formattedTime = new Date(trade.exitTime).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-900/30 transition-all font-mono text-[11px]"
                    >
                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">{formattedTime}</td>
                      <td className="py-2.5 px-3 text-slate-500">{trade.id}</td>
                      <td className="py-2.5 px-3 font-bold text-white uppercase">{trade.symbol}</td>
                      <td className="py-2.5 px-3">
                        {isLong ? (
                          <span className="text-sky-400 font-bold bg-sky-950/40 border border-sky-900/50 px-2 py-0.5 rounded text-[10px]">
                            LONG
                          </span>
                        ) : (
                          <span className="text-orange-400 font-bold bg-orange-950/40 border border-orange-900/50 px-2 py-0.5 rounded text-[10px]">
                            SHORT
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-350">{trade.size}</td>
                      <td className="py-2.5 px-3 text-slate-350">${trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                      <td className="py-2.5 px-3 text-slate-350">${trade.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          trade.exitReason === 'TP'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
                            : trade.exitReason === 'SL'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-900/50'
                              : 'bg-slate-950 text-slate-400 border-slate-900'
                        }`}>
                          {trade.exitReason}
                        </span>
                      </td>
                      <td className={`py-2.5 px-4 font-bold text-right py-0.5 rounded text-[11px] font-mono ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${trade.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
