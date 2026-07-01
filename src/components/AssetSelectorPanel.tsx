/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Position } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Zap, 
  CheckSquare, 
  Square,
  Sparkles,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Crown,
  Layers,
  Flame,
  Cpu,
  Check,
  SlidersHorizontal,
  Filter,
  Briefcase
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface AssetSelectorPanelProps {
  activeSymbol: string;
  activePositions: Position[];
  enabledCoins: string[];
  onSelectSymbol: (symbol: string) => void;
  onToggleCoin: (symbol: string) => void;
  onManualTrade: (symbol: string, side: 'LONG' | 'SHORT') => void;
  coinRegistry: Record<string, { name: string; iconColor: string; basePrice: number; marketType?: 'spot' | 'future' }>;
  onAddCustomCoin: (symbol: string, name: string, basePrice: number) => void;
  onEnableAllCoins: () => void;
  onDisableAllCoins: () => void;
  onSimulateNewCoinListing?: () => void;
  upcomingCoinsCount?: number;
  onSetEnabledCoins?: (symbols: string[]) => void;
}

export default function AssetSelectorPanel({
  activeSymbol,
  activePositions,
  enabledCoins,
  onSelectSymbol,
  onToggleCoin,
  onManualTrade,
  coinRegistry,
  onAddCustomCoin,
  onEnableAllCoins,
  onDisableAllCoins,
  onSimulateNewCoinListing,
  upcomingCoinsCount = 0,
  onSetEnabledCoins,
}: AssetSelectorPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCoin, setIsAddingCoin] = useState(false);
  const [selectedSector, setSelectedSector] = useState<'all' | 'major' | 'l1' | 'meme' | 'defi'>('all');
  
  // Persisted last 5 searched coin symbols
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('novaquant_recent_searches');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === 'string').slice(0, 5);
        }
      }
    } catch (e) {
      console.warn("Could not parse recent searches from localStorage", e);
    }
    return [];
  });

  const addToRecentSearches = (symbol: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== symbol);
      const updated = [symbol, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('novaquant_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not save recent searches to localStorage", e);
      }
      return updated;
    });
  };

  const handleSelectSymbol = (symbol: string) => {
    onSelectSymbol(symbol);
    addToRecentSearches(symbol);
  };
  
  // Custom coin register form state
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newBasePrice, setNewBasePrice] = useState('1.00');
  const [activeMarketTab, setActiveMarketTab] = useState<'all' | 'spot' | 'future'>('all');

  const getCoinSector = (symbol: string): 'major' | 'l1' | 'meme' | 'defi' => {
    const sym = symbol.toUpperCase().replace('USDT', '').replace('-PERP', '').trim();
    if (['BTC', 'ETH', 'BNB'].includes(sym)) return 'major';
    if (['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'NOT', 'BONK', 'WIF', 'MEME'].includes(sym)) return 'meme';
    if (['SOL', 'ADA', 'AVAX', 'DOT', 'NEAR', 'SUI', 'TRX', 'ATOM', 'LTC', 'FTM'].includes(sym)) return 'l1';
    return 'defi';
  };

  const symbols = Object.keys(coinRegistry);

  const spotCount = symbols.filter(sym => {
    const meta = coinRegistry[sym];
    const type = meta?.marketType || (sym.toUpperCase().endsWith('-PERP') ? 'future' : 'spot');
    return type === 'spot';
  }).length;

  const futureCount = symbols.filter(sym => {
    const meta = coinRegistry[sym];
    const type = meta?.marketType || (sym.toUpperCase().endsWith('-PERP') ? 'future' : 'spot');
    return type === 'future';
  }).length;

  const sectorCounts = {
    all: symbols.length,
    major: symbols.filter(sym => getCoinSector(sym) === 'major').length,
    l1: symbols.filter(sym => getCoinSector(sym) === 'l1').length,
    meme: symbols.filter(sym => getCoinSector(sym) === 'meme').length,
    defi: symbols.filter(sym => getCoinSector(sym) === 'defi').length,
  };

  const sectorEnabledCounts = {
    major: enabledCoins.filter(sym => getCoinSector(sym) === 'major').length,
    l1: enabledCoins.filter(sym => getCoinSector(sym) === 'l1').length,
    meme: enabledCoins.filter(sym => getCoinSector(sym) === 'meme').length,
    defi: enabledCoins.filter(sym => getCoinSector(sym) === 'defi').length,
  };

  const filteredSymbols = symbols.filter(sym => {
    const meta = coinRegistry[sym];
    if (!meta) return false;

    const type = meta.marketType || (sym.toUpperCase().endsWith('-PERP') ? 'future' : 'spot');
    if (activeMarketTab !== 'all' && type !== activeMarketTab) {
      return false;
    }

    if (selectedSector !== 'all' && getCoinSector(sym) !== selectedSector) {
      return false;
    }

    return sym.toLowerCase().includes(searchQuery.toLowerCase()) || 
           meta.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSectorAutopilotToggle = (sectorId: 'major' | 'l1' | 'meme' | 'defi', action: 'enable' | 'disable') => {
    const sectorCoins = symbols.filter(sym => getCoinSector(sym) === sectorId);
    if (sectorCoins.length === 0) return;

    if (action === 'enable') {
      const updated = Array.from(new Set([...enabledCoins, ...sectorCoins]));
      if (onSetEnabledCoins) {
        onSetEnabledCoins(updated);
      } else {
        sectorCoins.forEach(coin => {
          if (!enabledCoins.includes(coin)) onToggleCoin(coin);
        });
      }
    } else {
      let updated = enabledCoins.filter(coin => !sectorCoins.includes(coin));
      if (updated.length === 0) {
        const fallback = activeSymbol || 'BTCUSDT';
        updated = [fallback];
      }
      if (onSetEnabledCoins) {
        onSetEnabledCoins(updated);
      } else {
        sectorCoins.forEach(coin => {
          if (enabledCoins.includes(coin)) onToggleCoin(coin);
        });
      }
    }
  };

  const sectorsList = [
    {
      id: 'major' as const,
      name: 'Major Blue-Chips',
      label: 'Majors',
      icon: Crown,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      bgColor: 'bg-amber-950/20',
      desc: 'BTC, ETH, BNB standards'
    },
    {
      id: 'l1' as const,
      name: 'Layer-1 Giants',
      label: 'Layer-1s',
      icon: Layers,
      color: 'text-sky-400',
      borderColor: 'border-sky-500/20',
      bgColor: 'bg-sky-950/20',
      desc: 'SOL, AVAX, SUI, ADA...'
    },
    {
      id: 'meme' as const,
      name: 'Meme Hotspots',
      label: 'Memes',
      icon: Flame,
      color: 'text-orange-400',
      borderColor: 'border-orange-500/20',
      bgColor: 'bg-orange-950/20',
      desc: 'PEPE, DOGE, SHIB community runs'
    },
    {
      id: 'defi' as const,
      name: 'DeFi & AI Infra',
      label: 'DeFi/AI',
      icon: Cpu,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      bgColor: 'bg-purple-955/20 border border-purple-900/30',
      desc: 'LINK, UNI, RENDER web3 primitives'
    }
  ];

  const handleCreateCoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    
    // Ticker standard: ensure it ends with USDT for default test configurations if user type only short forms
    let cleanSymbol = newSymbol.toUpperCase().trim();
    if (!cleanSymbol.endsWith('USDT')) {
      cleanSymbol = `${cleanSymbol}USDT`;
    }

    const cleanName = newName.trim() || `${cleanSymbol.replace('USDT', '')} Protocol`;
    const priceNum = parseFloat(newBasePrice) || 1.0;

    onAddCustomCoin(cleanSymbol, cleanName, priceNum);
    
    // Reset inputs
    setNewSymbol('');
    setNewName('');
    setNewBasePrice('1.00');
    setIsAddingCoin(false);
  };

  return (
    <div className="sleek-card p-4 space-y-4 shadow-xl select-none" id="coin-selector-widget">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-sky-450" />
            <span className="font-sans font-bold text-white text-xs uppercase tracking-tight">
              SaaS Asset Registries
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Configure sweep lists & initialize manual quick dispatches.
          </p>
        </div>
        
        {/* Toggle Summary Indicator */}
        <div className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-sky-400 font-mono font-bold flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
          </span>
          {enabledCoins.length} / {symbols.length} AUTOPILOTS
        </div>
      </div>

      {/* Dynamic Search Input - Placed Prominently at the Top */}
      <div className="space-y-2.5">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-500" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter Binance coins & perps (e.g. BTC, SOL, XRP)..."
            className="w-full bg-[#030712]/95 border border-slate-800 focus:border-sky-500 focus:outline-none rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 transition-colors shadow-inner"
            id="coin-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-350 bg-transparent border-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Binance Spot & Perpetual Futures Interactive Segment Control */}
        <div className="grid grid-cols-3 gap-1 bg-[#020617] p-1 rounded-lg border border-slate-850 text-xs shadow-inner" id="market-segment-controls">
          <button
            type="button"
            onClick={() => setActiveMarketTab('all')}
            className={`py-1.5 px-1 rounded-md font-sans text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border-0 ${
              activeMarketTab === 'all'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-450 hover:text-slate-250 hover:bg-slate-900/40'
            }`}
            id="segment-tab-all"
          >
            <span>All</span>
            <span className="bg-[#030712] px-1 py-0.2 rounded font-mono text-[9px] text-slate-500">{symbols.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMarketTab('spot')}
            className={`py-1.5 px-1 rounded-md font-sans text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border-0 ${
              activeMarketTab === 'spot'
                ? 'bg-amber-950/40 text-amber-400 border border-amber-800/20 border-solid'
                : 'text-slate-450 hover:text-slate-250 hover:bg-slate-900/40'
            }`}
            id="segment-tab-spot"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            <span>Spot</span>
            <span className="bg-[#030712] px-1 py-0.2 rounded font-mono text-[9px] text-amber-500/80">{spotCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMarketTab('future')}
            className={`py-1.5 px-1 rounded-md font-sans text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all border-0 ${
              activeMarketTab === 'future'
                ? 'bg-indigo-950/45 text-indigo-400 border border-indigo-800/20 border-solid'
                : 'text-slate-450 hover:text-slate-250 hover:bg-slate-900/40'
            }`}
            id="segment-tab-futures"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 animate-pulse"></span>
            <span>Perp</span>
            <span className="bg-[#030712] px-1 py-0.2 rounded font-mono text-[9px] text-indigo-400">{futureCount}</span>
          </button>
        </div>

        {/* Recent Searches Row */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400 select-none animate-fade-in" id="recent-searches-row">
            <span className="text-slate-550 flex items-center gap-1 shrink-0">
              <RotateCcw className="h-2.5 w-2.5 text-slate-550" /> Recents:
            </span>
            <div className="flex flex-wrap gap-1 items-center">
              {recentSearches.map((sym) => {
                const isSelected = activeSymbol === sym;
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      handleSelectSymbol(sym);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] hover:text-sky-350 hover:bg-sky-950/20 hover:border-sky-800 transition-all cursor-pointer border ${
                      isSelected 
                        ? 'border-sky-500/40 bg-sky-950/20 text-sky-450 font-bold' 
                        : 'border-slate-850 bg-[#020617]/50 text-slate-400'
                    }`}
                  >
                    {sym.replace('USDT', '')}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setRecentSearches([]);
                  try {
                    localStorage.removeItem('novaquant_recent_searches');
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className="text-[9px] text-slate-500 hover:text-rose-400 hover:underline border-0 bg-transparent cursor-pointer font-bold px-1 py-0.5 shrink-0"
                title="Wipe recent search list history"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📁 COIN PARTS & MARKET CLUSTERS */}
      <div className="bg-slate-950/25 border border-slate-900 rounded-lg p-3 space-y-2.5" id="coin-parts-segmentation">
        <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-900 pb-1.5 leading-none">
          <span className="text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
            <SlidersHorizontal className="h-3 w-3 text-sky-400" /> Coin Parts & Segments
          </span>
          <span className="text-slate-500 font-bold">Quick Sweep Dispatch</span>
        </div>

        <div className="grid grid-cols-2 gap-2" id="sectors-bento-grid">
          {sectorsList.map((sector) => {
            const IconComponent = sector.icon;
            const isFilterSelected = selectedSector === sector.id;
            const size = sectorCounts[sector.id];
            const activeCount = sectorEnabledCounts[sector.id];

            return (
              <div 
                key={sector.id}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isFilterSelected 
                    ? 'border-sky-500/40 bg-sky-950/20 shadow-md' 
                    : 'border-slate-850 hover:border-slate-800 bg-[#02050e]/60 hover:bg-[#030712]'
                }`}
                onClick={() => setSelectedSector(prev => prev === sector.id ? 'all' : sector.id)}
                title={`Filter list by ${sector.name}. Double tap to reset.`}
              >
                <div className="flex justify-between items-start gap-1">
                  <div className="flex items-center gap-1">
                    <IconComponent className={`h-3.5 w-3.5 ${sector.color}`} />
                    <span className="text-[10px] font-sans font-bold text-slate-250 shrink-0">{sector.label}</span>
                  </div>
                  {/* Enabled status meter flag */}
                  <span className={`text-[8.5px] font-mono font-black rounded px-1.5 py-0.2 shrink-0 ${
                    activeCount === size 
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                      : activeCount > 0 
                      ? 'bg-amber-955/35 text-amber-500 border border-amber-900/30'
                      : 'bg-[#02050e]/95 text-slate-550 border border-slate-900'
                  }`}>
                    {activeCount}/{size}
                  </span>
                </div>

                <p className="text-[8.5px] text-slate-500 font-sans leading-tight mt-1 truncate">
                  {sector.desc}
                </p>

                {/* Micro operational actions */}
                <div className="flex items-center justify-between gap-1 mt-2 pt-1 border-t border-slate-900/40" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleSectorAutopilotToggle(sector.id, 'enable')}
                    className="flex-grow py-0.5 text-[8.5px] font-mono font-bold text-center bg-sky-950/20 hover:bg-sky-950/60 text-[#38bdf8] hover:text-white border-0 transition-all rounded cursor-pointer max-h-5"
                    title={`Instantly activate all ${size} ${sector.label} in the Autopilot sweeps`}
                  >
                    Run {sector.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectorAutopilotToggle(sector.id, 'disable')}
                    className="px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-center hover:bg-rose-955/20 text-slate-500 hover:text-rose-450 border-0 transition-all rounded cursor-pointer max-h-5"
                    title={`Stop and disable Autopilot sweeps for all ${sector.label}`}
                  >
                    Hold
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global reset button info if sector filtered */}
        {selectedSector !== 'all' && (
          <div className="flex items-center justify-between bg-sky-950/15 border border-sky-900/35 rounded-lg px-2 py-1 select-none animate-fade-in text-[9.5px]">
            <span className="text-sky-400 font-mono font-bold flex items-center gap-1.5">
              <Filter className="h-3 w-3 animate-pulse" /> Active portion view: {selectedSector.toUpperCase()}
            </span>
            <button
              onClick={() => setSelectedSector('all')}
              className="text-[9px] font-mono font-extrabold text-[#38bdf8] hover:text-white hover:underline bg-transparent border-0 cursor-pointer p-0 shrink-0 border-none"
            >
              Reset Filters [Show {symbols.length}]
            </button>
          </div>
        )}
      </div>

      {/* Bulk Sweep Controller Actions */}
      <div className="bg-[#020617]/50 rounded-lg p-2 border border-slate-850 flex flex-wrap gap-2 items-center justify-between text-[11px]">
        <span className="text-slate-400 font-sans font-medium text-[10px] uppercase tracking-wider">Bulk Runs Rules:</span>
        <div className="flex gap-2">
          <button
            onClick={onEnableAllCoins}
            className="px-2 py-1 bg-sky-950/60 hover:bg-sky-905 border border-sky-850 hover:border-sky-700 text-[#38bdf8] hover:text-white font-mono font-semibold rounded text-[10px] transition-all cursor-pointer"
            id="bulk-enable-all"
            title="Add ALL registered coins directly to the active Autopilot Trade runs sweeping"
          >
            ⚡ Run All Coins
          </button>
          <button
            onClick={onDisableAllCoins}
            className="px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-mono font-semibold rounded text-[10px] transition-all cursor-pointer"
            id="bulk-disable-all"
            title="Limit Autopilot trade runs: focuses on focused chart coin only"
          >
            🔒 Deactivate Bulks
          </button>
        </div>
      </div>

      {/* Auto-listing Status and Simulator Button */}
      <div className="bg-[#0f172a]/30 border border-indigo-950/65 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Market Listing Agent:</span>
            <span className="text-emerald-400 font-bold uppercase">Auto-Active</span>
          </div>
          <span className="text-slate-500 text-[10px]">
            {upcomingCoinsCount > 0 ? `${upcomingCoinsCount} incoming` : 'all active'}
          </span>
        </div>
        <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
          The system actively monitors and auto-connects newly listed crypto contracts to active multi-tenant workspace dispatches.
        </p>
        {onSimulateNewCoinListing && upcomingCoinsCount > 0 ? (
          <button
            type="button"
            onClick={onSimulateNewCoinListing}
            className="w-full py-1.5 bg-gradient-to-r from-indigo-900 to-indigo-750 hover:from-indigo-850 hover:to-indigo-700 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 hover:text-white font-mono font-bold text-[10px] rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98]"
            id="force-auto-listing-btn"
          >
            🚀 Simulate New Coin Launch ({upcomingCoinsCount} remaining)
          </button>
        ) : (
          <div className="text-[9.5px] text-center text-slate-500 font-mono italic p-1 bg-slate-900/30 rounded border border-slate-850">
            🎉 All scheduled market listings are successfully running!
          </div>
        )}
      </div>

      {/* Dynamic Accordion to ADD Dynamic Custom Asset Coins */}
      <div className="border border-slate-850 rounded-lg bg-[#020617]/20 overflow-hidden">
        <button
          onClick={() => setIsAddingCoin(!isAddingCoin)}
          className="w-full flex justify-between items-center p-2 text-left bg-slate-900/60 hover:bg-slate-900 transition-colors cursor-pointer border-0 text-white"
          id="toggle-add-coin-accordion"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans text-slate-250">
            <Plus className="h-3.5 w-3.5 text-sky-400" /> Manually Add Custom Coin
          </span>
          {isAddingCoin ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>

        {isAddingCoin && (
          <form onSubmit={handleCreateCoinSubmit} className="p-3 bg-[#020617]/80 space-y-3.5 border-t border-slate-850">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Coin Ticker</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SOL, PEPE, SUI"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 focus:border-sky-500 rounded p-1.5 text-xs text-white uppercase focus:outline-none"
                  id="add-coin-ticker"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Base Price (USDT)</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 150.25"
                  value={newBasePrice}
                  onChange={(e) => setNewBasePrice(e.target.value)}
                  className="w-full bg-[#030712] border border-slate-800 focus:border-sky-500 rounded p-1.5 text-xs text-white focus:outline-none"
                  id="add-coin-price"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Display name / Project title</label>
              <input
                type="text"
                placeholder="e.g. Solana Ecosystem"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#030712] border border-slate-800 focus:border-sky-500 rounded p-1.5 text-xs text-white focus:outline-none"
                id="add-coin-name"
              />
            </div>

            <button
              type="submit"
              className="w-full py-1.5 bg-gradient-to-r from-sky-550 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-[10px] rounded uppercase tracking-widest cursor-pointer transition-all border-0 shadow-lg shadow-sky-950/40"
              id="submit-custom-coin-btn"
            >
              + Register Custom Asset
            </button>
          </form>
        )}
      </div>

      {/* Scrollable Asset List */}
      <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-850/60 pr-1 select-none space-y-1.5">
        {filteredSymbols.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            No integrated assets matched query.
          </div>
        ) : (
          filteredSymbols.map((symbol) => {
            const meta = coinRegistry[symbol];
            if (!meta) return null;
            const isSelected = activeSymbol === symbol;
            const openPosition = activePositions.find(p => p.symbol === symbol);
            const isEnabledForAutopilot = enabledCoins.includes(symbol);

            return (
              <div
                key={symbol}
                className={`p-2 rounded-lg flex items-center justify-between transition-all ${
                  isSelected 
                    ? 'bg-sky-950/20 border border-sky-900/60 shadow-inner' 
                    : 'bg-transparent border border-transparent hover:bg-slate-850/15'
                }`}
                id={`asset-row-${symbol}`}
              >
                {/* Asset Identifiers */}
                <div 
                  className="flex items-center gap-2 cursor-pointer flex-grow min-w-0 mr-2"
                  onClick={() => handleSelectSymbol(symbol)}
                  title="Select to view candlestick market chart"
                >
                  {/* Visual Label Coin Avatar */}
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[9px] font-extrabold flex-shrink-0 ${meta.iconColor}`}>
                    {symbol.substring(0, 3)}
                  </span>
                  <div className="truncate text-left space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-100">{symbol}</span>
                      <span className={`text-[8px] font-mono font-extrabold px-1 py-0.1 rounded shrink-0 ${
                        (meta.marketType || (symbol.toUpperCase().endsWith('-PERP') ? 'future' : 'spot')) === 'spot'
                          ? 'bg-amber-950/50 text-amber-500/90 border border-amber-900/30'
                          : 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/30'
                      }`}>
                        {(meta.marketType || (symbol.toUpperCase().endsWith('-PERP') ? 'future' : 'spot')).toUpperCase() === 'SPOT' ? 'SPOT' : 'FUTURES'}
                      </span>
                      {openPosition && (
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                          openPosition.side === 'LONG' ? 'bg-emerald-400' : 'bg-rose-400'
                        } animate-pulse`} title={`Heartbeat: Active ${openPosition.side} position`} />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-400 block truncate">{meta.name}</span>
                      <span className="text-[8px] font-mono text-slate-500 block">(${meta.basePrice?.toLocaleString()})</span>
                    </div>
                  </div>
                </div>

                {/* Autopilot Toggler checkbox, Position badges, and Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* 1. Toggle Sweeping checkbox */}
                  <button
                    onClick={() => onToggleCoin(symbol)}
                    className={`p-1 rounded cursor-pointer transition-all ${
                      isEnabledForAutopilot 
                        ? 'text-sky-400 hover:text-sky-300 bg-sky-950/40 border border-sky-800/40' 
                        : 'text-slate-500 hover:text-slate-300 bg-slate-900/40 border border-slate-800/40'
                    }`}
                    title={isEnabledForAutopilot ? 'Enabled for Autopilot Multi-Symbol Sweep trade runs' : 'Disabled for Autopilot. Click to enable.'}
                    id={`toggle-sweep-btn-${symbol}`}
                  >
                    {isEnabledForAutopilot ? (
                      <CheckSquare className="h-3.5 w-3.5" />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* 2. Position Badge or View Marker */}
                  {openPosition ? (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      openPosition.side === 'LONG' 
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 border-solid' 
                        : 'bg-rose-950/60 text-rose-400 border border-rose-800/40 border-solid'
                    }`}>
                      {openPosition.side === 'LONG' ? 'LONG' : 'SHORT'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSelectSymbol(symbol)}
                      className="p-1 text-slate-500 hover:text-sky-400 transition-colors hover:bg-slate-800/40 rounded border-0 bg-transparent cursor-pointer"
                      title="View chart"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* 3. Fast Manual Entry Trigger Buttons */}
                  <div className="flex gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800">
                    <button
                      onClick={() => onManualTrade(symbol, 'LONG')}
                      disabled={!!openPosition}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-transparent hover:bg-emerald-950 text-emerald-500 disabled:text-slate-650 disabled:hover:bg-transparent font-bold cursor-pointer transition-colors border-0"
                      title={`Instantly open manual LONG position on ${symbol}`}
                      id={`fast-long-${symbol}`}
                    >
                      L
                    </button>
                    <button
                      onClick={() => onManualTrade(symbol, 'SHORT')}
                      disabled={!!openPosition}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-transparent hover:bg-rose-950 text-rose-500 disabled:text-slate-650 disabled:hover:bg-transparent font-bold cursor-pointer transition-colors border-0"
                      title={`Instantly open manual SHORT position on ${symbol}`}
                      id={`fast-short-${symbol}`}
                    >
                      S
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Explanatory Footer */}
      <div className="text-[9px] text-slate-500 leading-normal border-t border-slate-850 pt-2.5 flex items-start gap-1">
        <Zap className="h-3 w-3 text-sky-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <span>
          Auto sweep active rules: Checking the box locks the coin into the **Autopilot Sweep Run**. The bot dynamically evaluates the strategy on candle closes. Manual buttons instantly launch standalone trades.
        </span>
      </div>
    </div>
  );
}
