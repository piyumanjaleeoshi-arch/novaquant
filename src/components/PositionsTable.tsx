/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Position } from '../types';
import { 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  XCircle, 
  Database, 
  ChevronUp, 
  ChevronDown, 
  Gauge 
} from 'lucide-react';

interface PositionsTableProps {
  positions: Position[];
  onClosePosition: (symbol: string) => void;
  pnlDisplayMode?: 'BOTH' | 'USDT' | 'PERCENT';
}

export default function PositionsTable({ positions, onClosePosition, pnlDisplayMode = 'BOTH' }: PositionsTableProps) {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  return (
    <div className="sleek-card overflow-hidden shadow-2xl" id="positions-panel">
      {/* Panel header banner */}
      <div className="flex justify-between items-center border-b border-slate-800 px-4 py-3 select-none bg-transparent">
        <div className="flex items-center gap-2">
          <Target className="h-4 pr-1 text-sky-400" />
          <h2 className="font-sans font-semibold text-white tracking-tight text-sm">
            Active Open Positions ({positions.length})
          </h2>
        </div>
        <span className="text-[10px] bg-sky-950/80 text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded font-mono">
          CROSS MARGIN
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="bg-slate-950 text-slate-400 select-none uppercase font-mono border-b border-slate-800 text-[10px]">
              <th className="py-2.5 px-4 font-normal">Symbol</th>
              <th className="py-2.5 px-3 font-normal">Side</th>
              <th className="py-2.5 px-3 font-normal">Leverage</th>
              <th className="py-2.5 px-3 font-normal">Position Size</th>
              <th className="py-2.5 px-3 font-normal">Entry Price</th>
              <th className="py-2.5 px-3 font-normal">Mark Price</th>
              <th className="py-2.5 px-3 font-normal">Stop Loss / Take Profit</th>
              <th className="py-2.5 px-4 font-normal text-right">Unrealized PNL (USDT %)</th>
              <th className="py-2.5 px-4 font-normal text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {positions.length === 0 ? (
              <tr id="empty-positions-row">
                <td colSpan={9} className="py-8 text-center text-slate-500 italic">
                  No active open positions for this symbol. Waiting for strategy triggers.
                </td>
              </tr>
            ) : (
              positions.flatMap(position => {
                const isLong = position.side === 'LONG';
                const pnl = position.pnl;
                const pnlPct = position.pnlPercent;
                const isProfit = pnl >= 0;
                const isExpanded = expandedSymbol === position.symbol;

                const trRow = (
                  <tr
                    key={position.symbol}
                    className="hover:bg-slate-850/30 transition-colors"
                    id={`position-row-${position.symbol}`}
                  >
                    {/* Symbol info with DB Audit toggle */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200 mb-1">{position.symbol}</div>
                      {position.analysis ? (
                        <button
                          type="button"
                          onClick={() => setExpandedSymbol(isExpanded ? null : position.symbol)}
                          className={`text-[8.5px] font-mono leading-none py-1 px-1.5 rounded flex items-center gap-1 cursor-pointer select-none border transition-all ${
                            isExpanded
                              ? 'bg-indigo-950 text-indigo-400 border-indigo-800/60'
                              : 'bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                          id={`analyse-btn-${position.symbol}`}
                        >
                          <Database className="h-2.5 w-2.5" />
                          {isExpanded ? 'Hide Audit' : 'Auto Audit'}
                        </button>
                      ) : (
                        <span className="text-[8px] text-slate-600 font-mono italic">No cached model</span>
                      )}
                    </td>

                    {/* Trade side badge */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                        isLong
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}>
                        {isLong ? (
                          <>
                            <TrendingUp className="h-3 w-3" /> LONG
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3" /> SHORT
                          </>
                        )}
                      </span>
                    </td>

                    {/* Leverage indicator */}
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {position.leverage}x
                    </td>

                    {/* Position size in asset units */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {position.size.toFixed(4)} {position.symbol.replace('USDT', '')}
                    </td>

                    {/* Entry Price */}
                    <td className="py-3 px-3 font-mono text-slate-400">
                      ${position.entryPrice.toFixed(4)}
                    </td>

                    {/* Current Mark Price */}
                    <td className="py-3 px-3 font-mono text-slate-100 font-medium">
                      ${position.currentPrice.toFixed(4)}
                    </td>

                    {/* Stop Loss / Take profit indices */}
                    <td className="py-3 px-3 font-mono">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-rose-400 text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          SL: ${position.stopLoss.toFixed(4)}
                        </span>
                        <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          TP: ${position.takeProfit.toFixed(4)}
                        </span>
                      </div>
                    </td>

                    {/* Realized or Unrealized P&L */}
                    <td className="py-3 px-4 text-right font-mono">
                      {(pnlDisplayMode === 'BOTH' || pnlDisplayMode === 'USDT') && (
                        <span className={`font-bold text-xs block ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${pnl.toFixed(2)}
                        </span>
                      )}
                      {(pnlDisplayMode === 'BOTH' || pnlDisplayMode === 'PERCENT') && (
                        <span className={`block text-[10px] ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {pnlDisplayMode === 'PERCENT' ? (isProfit ? '+' : '') : '(' + (isProfit ? '+' : '')}{pnlPct.toFixed(2)}%{pnlDisplayMode === 'PERCENT' ? '' : ')'}
                        </span>
                      )}
                    </td>

                    {/* Exit manually */}
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onClosePosition(position.symbol)}
                        className="p-1 px-2.5 rounded bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-900 text-slate-400 hover:text-rose-400 transition-all font-mono text-[10px] flex items-center gap-1 mx-auto"
                        title="Market Close Position immediately"
                        id={`close-btn-${position.symbol}`}
                      >
                        <XCircle className="h-3 w-3" /> MARKET CLOSE
                      </button>
                    </td>
                  </tr>
                );

                if (isExpanded && position.analysis) {
                  return [
                    trRow,
                    <tr key={`${position.symbol}-analysis`} className="bg-indigo-950/20 border-b border-indigo-950/60 select-none">
                      <td colSpan={9} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-300 font-sans">
                          {/* Left summary blocks */}
                          <div className="md:col-span-2 space-y-2">
                            <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-[11px] font-bold">
                              <Database className="h-3.5 w-3.5 shrink-0" />
                              <span>ACCURACY DATABASE ACTIVE AUDIT FEED</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-100">
                              Matched Setup Model: <span className="text-indigo-400 font-mono">{position.analysis.patternId} ({position.analysis.patternName})</span>
                            </h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                              {position.analysis.recommendationText}
                            </p>
                          </div>

                          {/* Stat 1 */}
                          <div className="p-3 bg-slate-950/80 border border-indigo-950/50 rounded-lg flex flex-col justify-between">
                            <div>
                              <span className="block text-[8px] text-slate-500 font-mono uppercase">STATISTICAL FIT WEIGHT</span>
                              <span className="text-emerald-400 text-sm font-black font-mono tracking-tight flex items-center gap-1 mt-1">
                                {position.analysis.confidenceScore}% ACCURACY <Gauge className="h-3.5 w-3.5" />
                              </span>
                            </div>
                            <span className="text-[9.5px] text-slate-400 font-mono pt-1.5 mt-1 border-t border-slate-900 flex justify-between">
                              <span>Model Win-Rate:</span>
                              <strong>{position.analysis.historicalWinRate}%</strong>
                            </span>
                          </div>

                          {/* Stat 2 */}
                          <div className="p-3 bg-slate-950/80 border border-indigo-950/50 rounded-lg flex flex-col justify-between font-mono text-[9.5px] space-y-1.5 text-slate-400">
                            <div className="flex justify-between items-center pb-1 border-b border-slate-900">
                              <span>Trend Vector:</span>
                              <strong className="text-slate-200">{position.analysis.trendAngle}</strong>
                            </div>
                            <div className="flex justify-between items-center pb-1 border-b border-slate-900">
                              <span>Volume Surge:</span>
                              <strong className="text-indigo-400">{position.analysis.volumeSurgeRatio}x SMA</strong>
                            </div>
                            <div className="flex justify-between items-center pb-1 border-b border-slate-900">
                              <span>RSI Oscillator:</span>
                              <strong className="text-slate-200 truncate max-w-[105px]" title={position.analysis.rsiStrength}>
                                {position.analysis.rsiStrength.split(' Index')[0]}
                              </strong>
                            </div>
                            <div className="flex justify-between items-center text-[8.5px] text-slate-500">
                              <span>Advisory Source:</span>
                              <strong className="text-indigo-300 font-sans">
                                {position.analysis.triggeredBy === 'AUTOPILOT_SWEEP' ? 'Autopilot Sweep' : 'Manual Dispatch'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ];
                }

                return trRow;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
