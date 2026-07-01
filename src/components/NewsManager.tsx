/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NewsEvent } from '../types';
import { CalendarRange, Trash } from 'lucide-react';

interface NewsManagerProps {
  newsEvents: NewsEvent[];
  avoidNews: boolean;
  onToggleAvoidNews: (val: boolean) => void;
  onAddNewsEvent: (event: NewsEvent) => void;
  onRemoveNewsEvent: (id: string) => void;
}

export default function NewsManager({
  newsEvents,
  avoidNews,
  onToggleAvoidNews,
  onAddNewsEvent,
  onRemoveNewsEvent,
}: NewsManagerProps) {

  const handleTriggerInstantHighImpactNews = () => {
    onAddNewsEvent({
      id: `news-event-${Date.now()}`,
      event: '🔥 FOMC Interest Rate Decision (PROXIMATE)',
      time: Date.now() + 2 * 60 * 1000, // 2 minutes from now, definitely blocks trade!
      impact: 'HIGH',
      restrictionMinutesBefore: 30,
      restrictionMinutesAfter: 30,
      active: true,
    });
  };

  return (
    <div className="sleek-card p-4 space-y-4 shadow-xl select-none" id="news-manager-panel">
      {/* Panel header title */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-[#38bdf8]" />
          <h3 className="font-sans font-bold text-white text-sm">
            Avoid Trading Strategy: Macro News Calendar Filters
          </h3>
        </div>

        {/* Global check */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={avoidNews}
            onChange={(e) => onToggleAvoidNews(e.target.checked)}
            className="sr-only peer"
            id="avoid-news-checkbox"
          />
          <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          <span className="ml-2 font-mono text-[10px] uppercase font-bold text-slate-400">
            {avoidNews ? 'Active' : 'Muted'}
          </span>
        </label>
      </div>

      <p className="text-xs text-slate-400 leading-normal">
        Avoid routing risky positions during high-volatility scheduled macroeconomic intervals. If active, the system halts trade triggers during restrictions.
      </p>

      {/* Main Single Column Container */}
      <div className="space-y-4">
        {/* Scheduled Event table */}
        <div className="space-y-3">
          <span className="block text-[10px] text-slate-500 font-bold uppercase font-mono tracking-wider">
            Calendar Filters Directory
          </span>

          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {newsEvents.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-600 italic border border-dashed border-slate-800 rounded-lg">
                No active macro calendar bans scheduled.
              </div>
            ) : (
              newsEvents.map(event => {
                const now = Date.now();
                const minutesLeft = Math.round((event.time - now) / (60 * 1000));
                
                // Check if current moment is inside blocked window
                const minBeforeMs = event.restrictionMinutesBefore * 60 * 1000;
                const minAfterMs = event.restrictionMinutesAfter * 60 * 1000;
                const windowStart = event.time - minBeforeMs;
                const windowEnd = event.time + minAfterMs;
                const isCurrentlyBlocked = now >= windowStart && now <= windowEnd;

                return (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border flex justify-between items-center transition-all ${
                      isCurrentlyBlocked
                        ? 'bg-rose-950/20 border-rose-900/50 text-rose-300 animate-pulse'
                        : 'bg-slate-950/60 border-slate-850 text-slate-300'
                    }`}
                    id={`event-item-${event.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                          event.impact === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-800/50'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-800/50'
                        }`}>
                          {event.impact}
                        </span>
                        <span className="font-semibold text-[11px] truncate max-w-[170px]">
                          {event.event}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono block">
                        {minutesLeft > 0
                          ? `Happening in ${minutesLeft} mins • Blocks: [${event.restrictionMinutesBefore}m before / ${event.restrictionMinutesAfter}m after]`
                          : `Happening now (${Math.abs(minutesLeft)}m ago) • Blocks: [-${event.restrictionMinutesBefore}m / +${event.restrictionMinutesAfter}m]`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrentlyBlocked && avoidNews && (
                        <span className="font-bold text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-900 animate-ping">
                          HALTED
                        </span>
                      )}
                      <button
                        onClick={() => onRemoveNewsEvent(event.id)}
                        className="p-1 rounded text-slate-550 hover:text-rose-450 transition-colors"
                        id={`delete-event-btn-${event.id}`}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick-simulate buttons */}
          <button
            type="button"
            onClick={handleTriggerInstantHighImpactNews}
            className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-slate-300 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all"
            id="simulate-news-btn"
          >
            ⚡ SIMULATE INSTANT HIGH IMPACT NEWS EVENT (FOMC)
          </button>
        </div>
      </div>
    </div>
  );
}
