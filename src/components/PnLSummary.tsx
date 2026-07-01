/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Trade } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Award, 
  Activity, 
  BarChart3, 
  Scale, 
  Percent,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';

interface PnLSummaryProps {
  trades: Trade[];
  initialBalance: number;
}

export default function PnLSummary({ trades, initialBalance }: PnLSummaryProps) {
  // Compute comprehensive metrics
  const summaryMetrics = useMemo(() => {
    const totalTrades = trades.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        netPnl: 0,
        winRatePercent: '0.0%',
        avgProfitPerTrade: 0,
        totalRealizedGain: 0,
        grossProfit: 0,
        grossLoss: 0,
        profitFactor: 0,
        bestTrade: 0,
        worstTrade: 0,
        avgWin: 0,
        avgLoss: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let bestTrade = -Infinity;
    let worstTrade = Infinity;

    trades.forEach(t => {
      const profit = t.profit;
      if (profit >= 0) {
        wins++;
        grossProfit += profit;
        if (profit > bestTrade) bestTrade = profit;
      } else {
        losses++;
        grossLoss += Math.abs(profit);
        if (profit < worstTrade) worstTrade = profit;
      }
    });

    const netPnl = grossProfit - grossLoss;
    const winRate = (wins / totalTrades) * 100;
    const avgProfitPerTrade = netPnl / totalTrades;
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99.9 : 0) : grossProfit / grossLoss;
    const avgWin = wins === 0 ? 0 : grossProfit / wins;
    const avgLoss = losses === 0 ? 0 : grossLoss / losses;

    return {
      totalTrades,
      wins,
      losses,
      winRate,
      winRatePercent: `${winRate.toFixed(1)}%`,
      netPnl,
      avgProfitPerTrade,
      totalRealizedGain: netPnl,
      grossProfit,
      grossLoss,
      profitFactor,
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
      avgWin,
      avgLoss,
    };
  }, [trades]);

  // Compute performance distribution data using adaptive standard deviations or magnitude buckets
  const distributionData = useMemo(() => {
    if (trades.length === 0) {
      return [];
    }

    // Determine an average absolute profit size to construct dynamic buckets
    const avgAbsProfit = trades.reduce((sum, t) => sum + Math.abs(t.profit), 0) / trades.length;
    
    // Scale buckets dynamically based on average trade size, falling back to 50 if zero
    const unit = avgAbsProfit > 0.01 ? avgAbsProfit : 50;

    // Define 6 adaptive bins:
    // Bin 0: <-1.5 * unit (Heavy Loss)
    // Bin 1: -1.5 * unit to -0.5 * unit (Medium Loss)
    // Bin 2: -0.5 * unit to 0 (Minor Loss)
    // Bin 3: 0 to 0.5 * unit (Minor Gain)
    // Bin 4: 0.5 * unit to 1.5 * unit (Medium Gain)
    // Bin 5: >=1.5 * unit (Heavy Gain)

    const binLabels = [
      `Heavy Loss (<-$${(1.5 * unit).toFixed(0)})`,
      `Medium Loss (-$${(1.5 * unit).toFixed(0)} to -$${(0.5 * unit).toFixed(0)})`,
      `Minor Loss (-$${(0.5 * unit).toFixed(0)} to $0)`,
      `Minor Gain ($0 to $${(0.5 * unit).toFixed(0)})`,
      `Medium Gain ($${(0.5 * unit).toFixed(0)} to $${(1.5 * unit).toFixed(0)})`,
      `Heavy Gain (>$${(1.5 * unit).toFixed(0)})`
    ];

    const counts = [0, 0, 0, 0, 0, 0];

    trades.forEach(t => {
      const p = t.profit;
      if (p < -1.5 * unit) {
        counts[0]++;
      } else if (p >= -1.5 * unit && p < -0.5 * unit) {
        counts[1]++;
      } else if (p >= -0.5 * unit && p < 0) {
        counts[2]++;
      } else if (p >= 0 && p < 0.5 * unit) {
        counts[3]++;
      } else if (p >= 0.5 * unit && p < 1.5 * unit) {
        counts[4]++;
      } else {
        counts[5]++;
      }
    });

    return binLabels.map((label, idx) => ({
      name: label,
      count: counts[idx],
      isPositive: idx >= 3,
      percentage: ((counts[idx] / trades.length) * 100).toFixed(1)
    }));
  }, [trades]);

  const hasData = trades.length > 0;

  // Custom tool tip for the Recharts distribution
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-lg shadow-2xl font-mono text-xs text-left text-slate-100">
          <p className="font-bold text-[11px] text-slate-350">{data.name}</p>
          <div className="flex justify-between gap-6 mt-1 border-t border-slate-900 pt-1.5">
            <span className="text-slate-500">Frequency Count:</span>
            <span className="font-bold text-white">{data.count} {data.count === 1 ? 'trade' : 'trades'}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-slate-500">Distribution %:</span>
            <span className="font-bold text-indigo-400">{data.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" id="pnl-summary-root">
      
      {/* Metrics Row: 3 major focus points as cards + Distribution Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Stats Highlight Cards (Total Realized Gain, Win Rate, Avg Profit) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          
          {/* Card 1: Total Realized Gain (Net P&L) */}
          <div className="bg-slate-950/45 border border-slate-900/80 p-4.5 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden backdrop-blur-md">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest block">TOTAL REALIZED GAIN</span>
              {hasData ? (
                <div className={`text-2xl font-extrabold font-mono tracking-tight flex items-baseline gap-1.5 ${summaryMetrics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span>{summaryMetrics.netPnl >= 0 ? '+' : ''}${summaryMetrics.netPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-500 font-normal">USDT</span>
                </div>
              ) : (
                <span className="text-lg font-bold text-slate-500 font-mono">--</span>
              )}
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-1">
                {hasData && (
                  <>
                    <span className="text-emerald-400">Profit: +${summaryMetrics.grossProfit.toFixed(0)}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-rose-450">Loss: -${summaryMetrics.grossLoss.toFixed(0)}</span>
                  </>
                )}
                {!hasData && <span>Awaiting live trade executions...</span>}
              </div>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-850">
              {summaryMetrics.netPnl >= 0 ? (
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              ) : (
                <TrendingDown className="h-6 w-6 text-rose-400" />
              )}
            </div>
            {/* Ambient indicator gradient */}
            <div className={`absolute top-0 right-0 w-20 h-20 bg-radial-gradient from-transparent to-transparent pointer-events-none opacity-20 ${summaryMetrics.netPnl >= 0 ? 'from-emerald-500/10' : 'from-rose-500/10'}`} />
          </div>

          {/* Card 2: Win Frequency Speedometer */}
          <div className="bg-slate-950/45 border border-slate-900/80 p-4.5 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden backdrop-blur-md">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest block">TOTAL SUCCESS WIN RATE</span>
              {hasData ? (
                <div className="text-2xl font-extrabold font-mono text-white tracking-tight flex items-baseline gap-1">
                  <span>{summaryMetrics.winRatePercent}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({summaryMetrics.wins} / {summaryMetrics.totalTrades} Runs)</span>
                </div>
              ) : (
                <span className="text-lg font-bold text-slate-500 font-mono">--</span>
              )}
              <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                {hasData && (
                  <>
                    <span className="text-amber-500 font-bold">Profit Factor: {summaryMetrics.profitFactor.toFixed(2)}x</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-sky-400">Win Avg: +${summaryMetrics.avgWin.toFixed(0)}</span>
                  </>
                )}
                {!hasData && <span>Connect strategy setup</span>}
              </div>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-850">
              <Award className="h-6 w-6 text-indigo-400" />
            </div>
          </div>

          {/* Card 3: Avg Profit Per Trade */}
          <div className="bg-slate-950/45 border border-slate-900/80 p-4.5 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden backdrop-blur-md">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-widest block">AVERAGE PROFIT PER TRADE</span>
              {hasData ? (
                <div className={`text-2xl font-extrabold font-mono tracking-tight flex items-baseline gap-1.5 ${summaryMetrics.avgProfitPerTrade >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span>{summaryMetrics.avgProfitPerTrade >= 0 ? '+' : ''}${summaryMetrics.avgProfitPerTrade.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-500 font-normal">avg</span>
                </div>
              ) : (
                <span className="text-lg font-bold text-slate-500 font-mono">--</span>
              )}
              <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                {hasData && (
                  <>
                    <span className="text-emerald-400 font-medium">Max Win: +${summaryMetrics.bestTrade.toFixed(0)}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-rose-455 font-medium">Max Loss: -${Math.abs(summaryMetrics.worstTrade).toFixed(0)}</span>
                  </>
                )}
                {!hasData && <span>Dynamic margin tracking</span>}
              </div>
            </div>
            <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-850">
              <Scale className="h-6 w-6 text-sky-400" />
            </div>
          </div>

        </div>

        {/* Right Side: Recharts Bar distribution of profits/losses (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/45 border border-slate-900 p-4 rounded-xl flex flex-col justify-between shadow-lg relative min-h-[280px]">
          <div className="flex justify-between items-center border-b border-slate-900 pb-2.5 mb-3">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400 animate-pulse" /> Statistical Performance Distribution Histogram
            </h3>
            <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider">
              6 ADAPTIVE SPEC SPECTRUMS
            </span>
          </div>

          <div className="flex-grow w-full h-[185px]">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distributionData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0f172a" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#475569', fontSize: 8, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#1e293b' }}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#1e293b' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#0a0f1d', opacity: 0.5 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.count === 0 ? '#1e293b' : entry.isPositive ? '#10b981' : '#f43f5e'}
                        fillOpacity={entry.count === 0 ? 0.2 : 0.8}
                        className="transition-all hover:fill-opacity-100"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-3 font-mono">
                <BarChart3 className="h-8 w-8 text-slate-800 animate-pulse mb-2" />
                <p className="text-slate-500 text-[10px]">Awaiting database transactions to render spectrum...</p>
                <p className="text-[9px] text-slate-600 mt-1 max-w-sm">
                  Click 'Inject Simulated Run' at the top of the P&L Dashboard to generate live test transactions instantly.
                </p>
              </div>
            )}
          </div>

          <div className="text-[9px] text-slate-500 font-mono mt-1 border-t border-slate-900/80 pt-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" /> Bins are scaled based on the relative average order volatility index.
            </span>
            <span className="text-slate-400 font-bold hidden sm:inline">
              N = {trades.length} Closed Runs
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
