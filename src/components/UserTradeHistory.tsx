/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  CheckCircle2, 
  ExternalLink,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert
} from 'lucide-react';
import { Workspace } from '../saasTypes';

interface TradeItem {
  tradeId: string;
  userId?: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  type: string;
  quantity: number;
  entryPrice: number;
  price: number;
  status: string;
  executedOnBinance?: boolean;
  source?: string;
  binanceOrderId?: string;
  timestamp: string;
}

interface UserTradeHistoryProps {
  activeWorkspace: Workspace;
  onAddLog?: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
}

export default function UserTradeHistory({
  activeWorkspace,
  onAddLog
}: UserTradeHistoryProps) {
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sideFilter, setSideFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'BINANCE' | 'PAPER'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('novaquant_token') || '';
      const res = await fetch('/api/v1/bot/trades', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trades && Array.isArray(data.trades)) {
          setTrades(data.trades);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch user trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 15000);
    return () => clearInterval(interval);
  }, [activeWorkspace.id]);

  const copyTradeId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTrades = trades.filter((t) => {
    const matchesSearch = 
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tradeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.source && t.source.toLowerCase().includes(searchQuery.toLowerCase()));

    const isBuy = t.side === 'BUY' || t.side === 'LONG';
    const isSell = t.side === 'SELL' || t.side === 'SHORT';

    const matchesSide = 
      sideFilter === 'ALL' ||
      (sideFilter === 'BUY' && isBuy) ||
      (sideFilter === 'SELL' && isSell);

    const matchesMode = 
      modeFilter === 'ALL' ||
      (modeFilter === 'BINANCE' && t.executedOnBinance) ||
      (modeFilter === 'PAPER' && !t.executedOnBinance);

    return matchesSearch && matchesSide && matchesMode;
  });

  const exportCSV = () => {
    if (trades.length === 0) return;
    const headers = ['Trade ID', 'Symbol', 'Side', 'Type', 'Quantity', 'Price', 'Execution Mode', 'Source', 'Timestamp'];
    const rows = trades.map(t => [
      t.tradeId,
      t.symbol,
      t.side,
      t.type,
      t.quantity,
      t.price || t.entryPrice,
      t.executedOnBinance ? 'Binance Live' : 'Paper Engine',
      t.source || 'Bot API',
      t.timestamp
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `novaquant_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5" id="user-trade-history-panel">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#020617]/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-white text-base">Bot & Webhook Trade Ledger</h3>
            <p className="text-xs text-slate-400">
              Real-time audit log of all trade signals executed via Webhook, Bot API, and automated strategies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTrades}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Refresh Trades"
            id="refresh-trades-btn"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={trades.length === 0}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            id="export-trades-btn"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Symbol (BTCUSDT), Trade ID, or Source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#020617]/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            id="search-trades-input"
          />
        </div>

        {/* Side Filter */}
        <div className="sm:col-span-3">
          <select
            value={sideFilter}
            onChange={(e: any) => setSideFilter(e.target.value)}
            className="w-full bg-[#020617]/90 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
            id="side-filter-select"
          >
            <option value="ALL">All Sides (BUY & SELL)</option>
            <option value="BUY">BUY / LONG Only</option>
            <option value="SELL">SELL / SHORT Only</option>
          </select>
        </div>

        {/* Mode Filter */}
        <div className="sm:col-span-3">
          <select
            value={modeFilter}
            onChange={(e: any) => setModeFilter(e.target.value)}
            className="w-full bg-[#020617]/90 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
            id="mode-filter-select"
          >
            <option value="ALL">All Modes (Live & Paper)</option>
            <option value="BINANCE">Binance Live Only</option>
            <option value="PAPER">Paper Engine Only</option>
          </select>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-[#020617]/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Side</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Exec Price</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Target / Mode</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Trade ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 space-y-2">
                    <p className="text-sm font-sans font-medium text-slate-300">No executed trades found</p>
                    <p className="text-xs text-slate-500">
                      Send a test signal from the Bot API & Webhook tab to see real-time trade logs appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isBuy = t.side === 'BUY' || t.side === 'LONG';
                  const price = t.price || t.entryPrice || 0;
                  const totalVal = price * (t.quantity || 0);

                  return (
                    <tr key={t.tradeId} className="hover:bg-slate-900/40 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Symbol */}
                      <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                        {t.symbol}
                      </td>

                      {/* Side Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy 
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' 
                            : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                        }`}>
                          {isBuy ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {t.side}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-slate-200 whitespace-nowrap">
                        {t.quantity}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-slate-200 whitespace-nowrap">
                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-4 text-sky-400 whitespace-nowrap">
                        ${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Target / Mode */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {t.executedOnBinance ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/60 text-sky-300 border border-sky-800/60">
                            <CheckCircle2 className="h-3 w-3 text-sky-400" />
                            Binance Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/60">
                            Paper Engine
                          </span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {t.source || 'Bot API'}
                      </td>

                      {/* Trade ID + Copy */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => copyTradeId(t.tradeId)}
                          className="text-[10px] text-slate-400 hover:text-white inline-flex items-center gap-1 bg-slate-800/60 hover:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 transition-colors"
                          title="Copy Trade ID"
                        >
                          <span>{t.tradeId.substring(0, 10)}...</span>
                          {copiedId === t.tradeId ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
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
