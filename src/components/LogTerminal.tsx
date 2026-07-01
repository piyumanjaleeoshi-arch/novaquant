/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { LogEntry, Trade } from '../types';
import { Terminal, Shield, RefreshCw, Trash2, Search, BarChart3, Activity } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  trades?: Trade[];
}

export default function LogTerminal({ logs, onClearLogs, trades = [] }: TerminalProps) {
  const [filter, setFilter] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'pnl'>('logs');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (activeSubTab === 'logs') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeSubTab]);

  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    log.type.toLowerCase().includes(filter.toLowerCase())
  );

  // Compute profit and loss statistics in real-time
  const pnlStats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        netPnl: 0,
        grossProfit: 0,
        grossLoss: 0,
        avgWin: 0,
        avgLoss: 0,
        longs: 0,
        shorts: 0,
        tpCount: 0,
        slCount: 0,
        manualCount: 0,
        emergencyCount: 0
      };
    }

    let wins = 0;
    let losses = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let longs = 0;
    let shorts = 0;
    let tpCount = 0;
    let slCount = 0;
    let manualCount = 0;
    let emergencyCount = 0;

    trades.forEach(t => {
      const p = t.profit;
      if (p >= 0) {
        wins++;
        grossProfit += p;
      } else {
        losses++;
        grossLoss += Math.abs(p);
      }

      if (t.side === 'LONG') longs++;
      else if (t.side === 'SHORT') shorts++;

      if (t.exitReason === 'TP') tpCount++;
      else if (t.exitReason === 'SL') slCount++;
      else if (t.exitReason === 'MANUAL') manualCount++;
      else if (t.exitReason === 'EMERGENCY') emergencyCount++;
    });

    const totalTrades = trades.length;
    const winRate = totalTrades === 0 ? 0 : (wins / totalTrades) * 100;
    const netPnl = grossProfit - grossLoss;
    const avgWin = wins === 0 ? 0 : grossProfit / wins;
    const avgLoss = losses === 0 ? 0 : grossLoss / losses;

    return {
      totalTrades,
      wins,
      losses,
      winRate,
      netPnl,
      grossProfit,
      grossLoss,
      avgWin,
      avgLoss,
      longs,
      shorts,
      tpCount,
      slCount,
      manualCount,
      emergencyCount
    };
  }, [trades]);

  return (
    <div className="sleek-card overflow-hidden shadow-2xl flex flex-col h-[280px] font-mono text-xs" id="log-terminal">
      {/* Terminal Title Header */}
      <div className="flex justify-between items-center border-b border-slate-800 px-4 py-2 text-slate-400 select-none bg-transparent">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-sky-400 animate-pulse" />
            <span className="font-semibold text-slate-200 hidden sm:inline">Workspace Operational Terminal</span>
            <span className="font-semibold text-slate-200 sm:hidden">Terminal</span>
          </div>

          {/* Tab selectors inside terminal header wrapper */}
          <div className="flex bg-slate-950/80 p-0.5 rounded border border-slate-850">
            <button
              onClick={() => setActiveSubTab('logs')}
              className={`px-2.5 py-0.5 rounded-sm text-[10px] font-bold border-0 transition-all cursor-pointer flex items-center gap-1 ${
                activeSubTab === 'logs'
                  ? 'bg-slate-800 text-sky-400'
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <Terminal className="h-3 w-3" /> STREAMS
            </button>
            <button
              onClick={() => setActiveSubTab('pnl')}
              className={`px-2.5 py-0.5 rounded-sm text-[10px] font-bold border-0 transition-all cursor-pointer flex items-center gap-1 ${
                activeSubTab === 'pnl'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <BarChart3 className="h-3 w-3" /> P&L ANALYTICS
            </button>
          </div>
        </div>
        
        {/* Terminal toolbar actions */}
        <div className="flex items-center gap-3">
          {activeSubTab === 'logs' ? (
            <>
              {/* Internal search filter bar */}
              <div className="relative flex items-center hidden md:flex">
                <Search className="h-3.5 w-3.5 absolute left-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded px-2 pl-7 py-0.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-700 w-40 font-mono"
                  id="terminal-search-input"
                />
              </div>

              <button
                onClick={onClearLogs}
                className="text-slate-500 hover:text-rose-450 p-1 rounded transition-colors border-0 bg-transparent cursor-pointer"
                title="Clear Log Screen"
                id="clear-logs-btn"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 font-bold uppercase tracking-wider">
              <Activity className="h-2.5 w-2.5 animate-spin duration-3000" /> Live Audit Stream active
            </div>
          )}
        </div>
      </div>

      {/* Real content display area */}
      {activeSubTab === 'pnl' ? (
        <div className="p-3.5 overflow-y-auto flex-grow space-y-3 scrollbar-thin select-none">
          {/* Quick Metrics display row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left font-mono">
            
            {/* Net realized pnl */}
            <div className="bg-[#02050e] border border-slate-900 p-2 rounded-lg flex flex-col justify-between">
              <span className="text-[8.5px] text-slate-500 uppercase tracking-widest font-bold">NET REALIZED PNL</span>
              <span className={`text-sm font-black ${pnlStats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pnlStats.netPnl >= 0 ? '+' : ''}${pnlStats.netPnl.toFixed(2)} USDT
              </span>
            </div>

            {/* Win rate */}
            <div className="bg-[#02050e] border border-slate-900 p-2 rounded-lg flex flex-col justify-between">
              <span className="text-[8.5px] text-slate-500 uppercase tracking-widest font-bold">WIN RATIO</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-sm font-black ${pnlStats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-500'}`}>
                  {pnlStats.winRate.toFixed(1)}%
                </span>
                <span className="text-[8.5px] text-slate-500">
                  ({pnlStats.wins}W - {pnlStats.losses}L)
                </span>
              </div>
            </div>

            {/* Average Profit margins */}
            <div className="bg-[#02050e] border border-slate-900 p-2 rounded-lg flex flex-col justify-between">
              <span className="text-[8.5px] text-slate-500 uppercase tracking-widest font-bold">AVG WIN / LOSS</span>
              <div className="flex flex-col text-[8.5px] leading-snug font-bold">
                <span className="text-emerald-400">WIN: +${pnlStats.avgWin.toFixed(1)}</span>
                <span className="text-rose-450">LOSS: -${pnlStats.avgLoss.toFixed(1)}</span>
              </div>
            </div>

            {/* Execution stats */}
            <div className="bg-[#02050e] border border-slate-900 p-2 rounded-lg flex flex-col justify-between">
              <span className="text-[8.5px] text-slate-500 uppercase tracking-widest font-bold">QUANT RUNS</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-black text-indigo-400">{pnlStats.totalTrades}</span>
                <span className="text-[8.5px] text-slate-500 font-bold">({pnlStats.longs}L | {pnlStats.shorts}S)</span>
              </div>
            </div>

          </div>

          {/* Consolidated graphical progress bar */}
          <div className="bg-slate-950/60 border border-slate-900 px-3 py-2 rounded-lg space-y-1.5 text-left font-mono">
            <div className="flex justify-between items-center text-[9px]">
              <span className="text-slate-400 uppercase tracking-widest font-black">Performance Spectrum Matrix</span>
              <span className="text-slate-500 font-bold">Consolidated profits ratio</span>
            </div>
            
            <div className="w-full bg-[#02050e] h-3 rounded overflow-hidden flex border border-slate-900">
              {pnlStats.totalTrades > 0 ? (
                <>
                  <div 
                    style={{ width: `${pnlStats.winRate}%` }} 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full flex items-center justify-center text-[7.5px] font-black text-slate-950 truncate select-none shadow-inner"
                    title={`${pnlStats.winRate.toFixed(1)}% Wins`}
                  >
                    {pnlStats.winRate >= 15 ? `${pnlStats.winRate.toFixed(0)}% WINS` : ''}
                  </div>
                  <div 
                    style={{ width: `${100 - pnlStats.winRate}%` }} 
                    className="bg-gradient-to-r from-rose-500 to-rose-600 h-full flex items-center justify-center text-[7.5px] font-black text-white truncate select-none"
                    title={`${(100 - pnlStats.winRate).toFixed(1)}% Losses`}
                  >
                    {(100 - pnlStats.winRate) >= 15 ? `${(100 - pnlStats.winRate).toFixed(0)}% LOSS` : ''}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-600 italic">
                  -- Awaiting trade ledger entries to compile performance matrix --
                </div>
              )}
            </div>
          </div>

          {/* Dual details sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left font-mono select-text">
            
            {/* Outcome Sparkline */}
            <div className="bg-[#02050e]/60 border border-slate-900 p-2.5 rounded-lg flex flex-col justify-between space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wide font-black block">Closed Transaction Sparkline</span>
              <div className="flex flex-wrap items-center gap-1 min-h-[22px] pt-0.5">
                {trades && trades.length > 0 ? (
                  trades.slice(-18).map((t, idx) => (
                    <span 
                      key={t.id || idx} 
                      className={`text-[9px] px-1 py-0.2 rounded font-black font-mono transition-all hover:scale-110 select-none ${
                        t.profit >= 0 
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' 
                          : 'bg-rose-950/80 text-rose-450 border border-rose-900/40'
                      }`}
                      title={`Profit: $${t.profit.toFixed(2)} [${t.exitReason}] @ ${t.symbol}`}
                    >
                      {t.profit >= 0 ? '▲' : '▼'}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] text-slate-600 italic">No historical runs recorded yet.</span>
                )}
              </div>
              <p className="text-[8px] text-slate-500 font-bold">
                Last 18 executions (Green ▲ = Profit, Red ▼ = Loss). Hover index for exact margin.
              </p>
            </div>

            {/* Exit Triggers allocation specs */}
            <div className="bg-[#02050e]/60 border border-slate-900 p-2.5 rounded-lg flex flex-col justify-between space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wide font-black block">Trigger allocation specs</span>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[9px] uppercase">
                <div className="p-0.5 rounded bg-emerald-950/20 border border-emerald-900/30">
                  <span className="block text-emerald-400 font-extrabold">{pnlStats.tpCount}</span>
                  <span className="text-[7.5px] text-slate-500 font-bold">TP</span>
                </div>
                <div className="p-0.5 rounded bg-rose-950/20 border border-rose-900/30">
                  <span className="block text-rose-450 font-extrabold">{pnlStats.slCount}</span>
                  <span className="text-[7.5px] text-slate-500 font-bold">SL</span>
                </div>
                <div className="p-0.5 rounded bg-amber-950/20 border border-amber-900/30">
                  <span className="block text-amber-500 font-extrabold">{pnlStats.manualCount}</span>
                  <span className="text-[7.5px] text-slate-500 font-bold">MAN</span>
                </div>
                <div className="p-0.5 rounded bg-purple-950/20 border border-purple-900/30">
                  <span className="block text-purple-400 font-extrabold">{pnlStats.emergencyCount}</span>
                  <span className="text-[7.5px] text-slate-500 font-bold">ABRT</span>
                </div>
              </div>
              <p className="text-[8px] text-slate-500 font-bold">
                TP = Take-Profit, SL = Stop-Loss, MAN = Manual exit, ABRT = Emergency safety hold.
              </p>
            </div>

          </div>

        </div>
      ) : (
        /* Real logs listing area */
        <div className="p-3 overflow-y-auto flex-grow space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredLogs.length === 0 ? (
            <div className="text-slate-600 italic text-center py-10 select-none" id="empty-logs-indicator">
              -- Engine is idle. No logs captured yet --
            </div>
          ) : (
            filteredLogs.map(log => {
              let typeColor = 'text-sky-400'; // info
              let prefix = 'ℹ️ [INFO]';
              if (log.type === 'success') {
                typeColor = 'text-emerald-400 font-medium';
                prefix = '🟢 [SUCCESS]';
              } else if (log.type === 'warn') {
                typeColor = 'text-amber-400';
                prefix = '⚠️ [WARN/FILTER]';
              } else if (log.type === 'error') {
                typeColor = 'text-rose-500 font-bold';
                prefix = '🚨 [CRITICAL ERROR]';
              } else if (log.type === 'system') {
                typeColor = 'text-purple-400';
                prefix = '⚙️ [SYSTEM]';
              }

              return (
                <div
                  key={log.id}
                  className="hover:bg-slate-900/40 px-2 py-0.5 rounded transition-colors flex items-start leading-relaxed text-slate-300"
                  id={`log-entry-${log.id}`}
                >
                  <span className="text-slate-600 pr-3 select-none flex-shrink-0">
                    {log.timestamp}
                  </span>
                  <span className={`${typeColor} pr-2 flex-shrink-0`}>
                    {prefix}
                  </span>
                  <span className="break-all whitespace-pre-wrap">
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Terminal Footer status info */}
      <div className="bg-slate-950/90 px-4 py-1.5 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 select-none">
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3 text-emerald-500/80" /> Encryption: Enabled (AES-256 local encrypted cache buffer)
        </span>
        <span className="flex items-center gap-1">
          <RefreshCw className="h-2.5 w-2.5 animate-spin text-slate-600" /> Active ticker feed: ONLINE
        </span>
      </div>
    </div>
  );
}
