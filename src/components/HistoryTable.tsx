/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trade } from '../types';
import { History, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface HistoryProps {
  trades: Trade[];
}

export default function HistoryTable({ trades }: HistoryProps) {
  return (
    <div className="sleek-card overflow-hidden shadow-2xl" id="history-panel">
      {/* Table Title Block */}
      <div className="flex justify-between items-center border-b border-slate-800 px-4 py-3 select-none bg-transparent">
        <div className="flex items-center gap-2">
          <History className="h-4 pr-1 text-[#818cf8]" />
          <h2 className="font-sans font-semibold text-white tracking-tight text-sm">
            Closed Trade History Log ({trades.length})
          </h2>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          REAL-TIME RESULTS
        </span>
      </div>

      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="bg-[#020617] text-slate-400 select-none uppercase font-mono border-b border-slate-800 text-[10px] sticky top-0 bg-opacity-95 backdrop-blur">
              <th className="py-2.5 px-4 font-normal">Closed Time</th>
              <th className="py-2.5 px-3 font-normal">Symbol</th>
              <th className="py-2.5 px-3 font-normal">Side</th>
              <th className="py-2.5 px-3 font-normal">Size</th>
              <th className="py-2.5 px-3 font-normal">Entry Price</th>
              <th className="py-2.5 px-3 font-normal">Exit Price</th>
              <th className="py-2.5 px-3 font-normal">Reason</th>
              <th className="py-2.5 px-4 font-normal text-right">Realized Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {trades.length === 0 ? (
              <tr id="empty-history-row">
                <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                  No completed trades in current cycle. Active state is monitoring...
                </td>
              </tr>
            ) : (
              // Show most recent first
              [...trades].reverse().map(trade => {
                const isLong = trade.side === 'LONG';
                const isWin = trade.profit >= 0;
                
                const formattedTime = new Date(trade.exitTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                // Set reason badge coloring
                let reasonBg = 'bg-slate-800/80 text-slate-400 border border-slate-700/50';
                if (trade.exitReason === 'TP') {
                  reasonBg = 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/60';
                } else if (trade.exitReason === 'SL') {
                  reasonBg = 'bg-rose-950/80 text-rose-400 border border-rose-900/60';
                } else if (trade.exitReason === 'EMERGENCY') {
                  reasonBg = 'bg-red-950 text-red-400 border border-red-900';
                }

                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-slate-850/30 transition-colors"
                    id={`trade-row-${trade.id}`}
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-600" /> {formattedTime}
                    </td>

                    {/* Symbol */}
                    <td className="py-3 px-3 font-bold text-slate-200">
                      {trade.symbol}
                    </td>

                    {/* Side direction */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-0.5 font-mono text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-md ${
                        isLong
                          ? 'bg-emerald-950/50 text-emerald-400'
                          : 'bg-rose-950/50 text-rose-400'
                      }`}>
                        {isLong ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {trade.side}
                      </span>
                    </td>

                    {/* Position size */}
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {trade.size.toFixed(4)} {trade.symbol.replace('USDT', '')}
                    </td>

                    {/* Entry Price */}
                    <td className="py-3 px-3 font-mono text-slate-400">
                      ${trade.entryPrice.toFixed(4)}
                    </td>

                    {/* Exit Price */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      ${trade.exitPrice.toFixed(4)}
                    </td>

                    {/* Exit Reason tag */}
                    <td className="py-3 px-3">
                      <span className={`inline-block font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-md ${reasonBg}`}>
                        {trade.exitReason}
                      </span>
                    </td>

                    {/* Actualized P&L */}
                    <td className="py-3 px-4 text-right font-mono">
                      <span className={`font-bold text-xs ${isWin ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {isWin ? '+' : ''}${trade.profit.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
