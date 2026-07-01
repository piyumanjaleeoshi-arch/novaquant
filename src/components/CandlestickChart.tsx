/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Candle, Position } from '../types';
import { ZoomIn, ZoomOut, Maximize2, MoveRight } from 'lucide-react';

interface ChartProps {
  candles: Candle[];
  symbol: string;
  activePosition?: Position | null;
  buySignals?: number[]; // indices or timestamps of buy signals
  sellSignals?: number[]; // indices or timestamps of sell signals
}

export default function CandlestickChart({
  candles,
  symbol,
  activePosition,
  buySignals = [],
  sellSignals = [],
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Interactive Zoom / Scroll constraints
  const [zoomLevel, setZoomLevel] = useState<number>(30); // number of candles visible
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      drawChart();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [candles, zoomLevel, hoverIndex, activePosition, mousePos, buySignals, sellSignals]);

  // Handle zoom bounds
  const changeZoom = (amount: number) => {
    setZoomLevel(prev => Math.max(10, Math.min(150, prev + amount)));
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions with high-DPI scale compensation
    const rect = canvas.parentElement?.getBoundingClientRect() || { width: 800, height: 450 };
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background
    ctx.fillStyle = '#011715'; // dark teal green chart background
    ctx.fillRect(0, 0, width, height);

    // Margins and Panes
    const rightAxisWidth = 65;
    const bottomAxisHeight = 25;
    const mainChartHeight = height * 0.58; // 58% for candles + EMAs
    const rsiChartHeight = height * 0.20;  // 20% for RSI
    const volumeChartHeight = height * 0.12; // 12% for Volume
    
    // Space between panels
    const mainRsiGap = 12;
    const rsiVolGap = 12;

    const mainTop = 15;
    const rsiTop = mainTop + mainChartHeight + mainRsiGap;
    const volTop = rsiTop + rsiChartHeight + rsiVolGap;

    const chartWidth = width - rightAxisWidth - 10;

    // Filter which candles are visible
    const totalCandles = candles.length;
    const visibleCount = Math.min(totalCandles, zoomLevel);
    const startIdx = Math.max(0, totalCandles - visibleCount);
    const visibleCandles = candles.slice(startIdx);

    // Compute candle coordinates
    const numCandles = visibleCandles.length;
    const candleWidth = chartWidth / numCandles;
    const spacing = Math.max(1, candleWidth * 0.15);
    const innerCandleWidth = Math.max(1, candleWidth - spacing);

    // Get min and max prices
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 1;

    visibleCandles.forEach(candle => {
      minPrice = Math.min(minPrice, candle.low);
      maxPrice = Math.max(maxPrice, candle.high);
      
      // Also account for EMAs in scale if they exist
      if (candle.ema9) {
        minPrice = Math.min(minPrice, candle.ema9);
        maxPrice = Math.max(maxPrice, candle.ema9);
      }
      if (candle.ema21) {
        minPrice = Math.min(minPrice, candle.ema21);
        maxPrice = Math.max(maxPrice, candle.ema21);
      }
      maxVolume = Math.max(maxVolume, candle.volume);
    });

    // Padding on price scale to avoid clipping
    const priceDiff = maxPrice - minPrice || 1;
    maxPrice += priceDiff * 0.08;
    minPrice -= priceDiff * 0.08;

    // Helper functions for scaling coordinates
    const getPriceY = (val: number) => {
      return mainTop + mainChartHeight - ((val - minPrice) / (maxPrice - minPrice)) * mainChartHeight;
    };

    const getRsiY = (val: number) => {
      // RSI is strictly 0 to 100
      return rsiTop + rsiChartHeight - (val / 100) * rsiChartHeight;
    };

    const getVolY = (val: number) => {
      return volTop + volumeChartHeight - (val / maxVolume) * volumeChartHeight;
    };

    const getX = (idx: number) => {
      return idx * candleWidth + candleWidth / 2;
    };

    // Draw grid horizontal lines for Main/Candle Chart
    ctx.strokeStyle = '#053b35'; // elegant dark teal grid lines
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Draw Price grid lines
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const priceVal = minPrice + (i / gridCount) * (maxPrice - minPrice);
      const y = getPriceY(priceVal);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Write price scale label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`$${priceVal.toFixed(2)}`, chartWidth + 5, y + 3);
    }

    // Draw RSI guidelines (30, 45, 55, 70)
    ctx.setLineDash([2, 4]);
    const rsiLevels = [30, 45, 55, 70];
    rsiLevels.forEach(level => {
      const y = getRsiY(level);
      ctx.strokeStyle = level === 45 || level === 55 ? '#053b35' : '#07473f';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // RSI Label
      ctx.fillStyle = level === 45 || level === 55 ? '#64748b' : '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`${level}`, chartWidth + 5, y + 3);
    });
    ctx.setLineDash([]);

    // DRAW CANDLESTICKS & SIGNALS & VOLUME
    visibleCandles.forEach((candle, idx) => {
      const x = getX(idx);
      const isBullish = candle.close >= candle.open;
      const primaryColor = isBullish ? '#10b981' : '#f43f5e'; // Emerald vs Rose
      const subtleWickColor = isBullish ? '#34d399' : '#fb7185';

      // 1. Draw volume bar
      ctx.fillStyle = isBullish ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
      const vy = getVolY(candle.volume);
      ctx.fillRect(x - innerCandleWidth / 2, vy, innerCandleWidth, volTop + volumeChartHeight - vy);

      // 2. Draw candlesticks
      ctx.strokeStyle = subtleWickColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, getPriceY(candle.high));
      ctx.lineTo(x, getPriceY(candle.low));
      ctx.stroke();

      ctx.fillStyle = primaryColor;
      const bodyY = getPriceY(Math.max(candle.open, candle.close));
      const bodyH = Math.max(1, Math.abs(getPriceY(candle.close) - getPriceY(candle.open)));
      ctx.fillRect(x - innerCandleWidth / 2, bodyY, innerCandleWidth, bodyH);

      // 3. Draw Entry Indicators (Arrows) if a buy or sell signal happened on this candle
      // We look up buySignals & sellSignals timestamps
      const originalIdx = startIdx + idx;
      
      const hasBuy = buySignals.some(ts => Math.abs(ts - candle.time) < spacingMsForRef(candles) / 2);
      const hasSell = sellSignals.some(ts => Math.abs(ts - candle.time) < spacingMsForRef(candles) / 2);

      if (hasBuy) {
        // Draw green up-arrow
        const arrowY = getPriceY(candle.low) + 12;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(x, arrowY);
        ctx.lineTo(x - 5, arrowY + 8);
        ctx.lineTo(x - 2, arrowY + 8);
        ctx.lineTo(x - 2, arrowY + 14);
        ctx.lineTo(x + 2, arrowY + 14);
        ctx.lineTo(x + 2, arrowY + 8);
        ctx.lineTo(x + 5, arrowY + 8);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('BUY', x - 9, arrowY + 24);
      }

      if (hasSell) {
        // Draw red down-arrow
        const arrowY = getPriceY(candle.high) - 12;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(x, arrowY);
        ctx.lineTo(x - 5, arrowY - 8);
        ctx.lineTo(x - 2, arrowY - 8);
        ctx.lineTo(x - 2, arrowY - 14);
        ctx.lineTo(x + 2, arrowY - 14);
        ctx.lineTo(x + 2, arrowY - 8);
        ctx.lineTo(x + 5, arrowY - 8);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('SELL', x - 11, arrowY - 18);
      }
    });

    // DRAW EMA LINES (Ema 9 & Ema 21)
    // 1. Draw EMA 9
    ctx.strokeStyle = '#3b82f6'; // bright blue
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let hasEma9Started = false;
    visibleCandles.forEach((candle, idx) => {
      if (candle.ema9) {
        const x = getX(idx);
        const y = getPriceY(candle.ema9);
        if (!hasEma9Started) {
          ctx.moveTo(x, y);
          hasEma9Started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // 2. Draw EMA 21
    ctx.strokeStyle = '#f59e0b'; // amber orange
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let hasEma21Started = false;
    visibleCandles.forEach((candle, idx) => {
      if (candle.ema21) {
        const x = getX(idx);
        const y = getPriceY(candle.ema21);
        if (!hasEma21Started) {
          ctx.moveTo(x, y);
          hasEma21Started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // DRAW RSI LINE
    ctx.strokeStyle = '#a855f7'; // purple
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    let hasRsiStarted = false;
    visibleCandles.forEach((candle, idx) => {
      if (candle.rsi !== undefined) {
        const x = getX(idx);
        const y = getRsiY(candle.rsi);
        if (!hasRsiStarted) {
          ctx.moveTo(x, y);
          hasRsiStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // DRAW ACTIVE POSITION SL/TP REFERENCE LINES
    if (activePosition && activePosition.symbol === symbol) {
      // Draw stop loss
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      
      const slY = getPriceY(activePosition.stopLoss);
      ctx.strokeStyle = '#ef4444'; // Red dash
      ctx.beginPath();
      ctx.moveTo(0, slY);
      ctx.lineTo(chartWidth, slY);
      ctx.stroke();
      
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`SL: $${activePosition.stopLoss.toFixed(2)}`, 10, slY - 5);

      // Draw take profit
      const tpY = getPriceY(activePosition.takeProfit);
      ctx.strokeStyle = '#10b981'; // Green dash
      ctx.beginPath();
      ctx.moveTo(0, tpY);
      ctx.lineTo(chartWidth, tpY);
      ctx.stroke();
      
      ctx.fillStyle = '#10b981';
      ctx.fillText(`TP: $${activePosition.takeProfit.toFixed(2)}`, 10, tpY - 5);

      // Draw entry price
      const entryY = getPriceY(activePosition.entryPrice);
      ctx.strokeStyle = '#eab308'; // Yellow dash
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();
      
      ctx.fillStyle = '#eab308';
      ctx.fillText(`ENTRY: $${activePosition.entryPrice.toFixed(2)}`, 10, entryY - 5);

      ctx.setLineDash([]);
    }

    // DRAW MOUSE CROSSHAIR AND HUD TOOLTIP
    if (mousePos && mousePos.x >= 0 && mousePos.x <= chartWidth) {
      // Find the candle index the user is hovering over
      const hIdx = Math.floor(mousePos.x / candleWidth);
      if (hIdx >= 0 && hIdx < visibleCandles.length) {
        const valC = visibleCandles[hIdx];
        const x = getX(hIdx);

        // Draw vertical crosshair line
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Draw horizontal crosshair line at mouse price
        ctx.beginPath();
        ctx.moveTo(0, mousePos.y);
        ctx.lineTo(chartWidth, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Display current hover value on axes
        // Y Price value
        if (mousePos.y >= mainTop && mousePos.y <= mainTop + mainChartHeight) {
          const hoverPrice = minPrice + ((mainTop + mainChartHeight - mousePos.y) / mainChartHeight) * (maxPrice - minPrice);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(chartWidth, mousePos.y - 8, rightAxisWidth, 16);
          ctx.fillStyle = '#f1f5f9';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`$${hoverPrice.toFixed(2)}`, chartWidth + 5, mousePos.y + 3);
        }

        // HUD Dashboard Overlay (Top Left of canvas)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.fillRect(10, mainTop, 360, 24);
        ctx.strokeRect(10, mainTop, 360, 24);

        // Date, O, H, L, C, V parameters
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        const dateStr = new Date(valC.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`[${dateStr}]`, 15, mainTop + 15);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`O:`, 68, mainTop + 15);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(`${valC.open.toFixed(2)}`, 80, mainTop + 15);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`H:`, 130, mainTop + 15);
        ctx.fillStyle = '#10b981';
        ctx.fillText(`${valC.high.toFixed(2)}`, 142, mainTop + 15);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`L:`, 192, mainTop + 15);
        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`${valC.low.toFixed(2)}`, 204, mainTop + 15);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`C:`, 254, mainTop + 15);
        ctx.fillStyle = valC.close >= valC.open ? '#10b981' : '#f43f5e';
        ctx.fillText(`${valC.close.toFixed(2)}`, 266, mainTop + 15);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`V:`, 316, mainTop + 15);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`${valC.volume.toFixed(0)}`, 328, mainTop + 15);

        // Indicators HUD inside charts
        // EMA values top edge
        ctx.fillStyle = '#3b82f6';
        ctx.fillText(`EMA(9): ${valC.ema9 ? '$' + valC.ema9.toFixed(2) : '-'}`, 15, mainTop + 40);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`EMA(21): ${valC.ema21 ? '$' + valC.ema21.toFixed(2) : '-'}`, 120, mainTop + 40);

        // RSI values above rsiChart
        ctx.fillStyle = '#ee82ee';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`RSI(14): ${valC.rsi ? valC.rsi.toFixed(2) : '-'}`, 15, rsiTop - 4);
      }
    }
  };

  // Helper helper spacing
  const spacingMsForRef = (candleList: Candle[]) => {
    if (candleList.length < 2) return 60 * 1000;
    return candleList[1].time - candleList[0].time;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = canvas.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div className="flex flex-col sleek-card overflow-hidden shadow-2xl h-full p-4 relative" id="chart-panel">
      {/* Header controls */}
      <div className="flex flex-wrap justify-between items-center pb-2 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center p-2 rounded-lg bg-green-505/10 text-emerald-400">
            <Maximize2 className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h2 className="font-sans font-semibold text-white tracking-tight text-sm md:text-md uppercase flex items-center gap-2">
              <span>{symbol}</span>
              <span className="text-[10px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-800">USDT-MARGINED</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Indicators: EMA(9) blue • EMA(21) Orange • RSI(14) Purple
            </p>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/50 p-1 border border-slate-800 rounded-lg">
          <button
            onClick={() => changeZoom(10)}
            className="p-1 px-1.5 rounded text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-1 border-0 cursor-pointer"
            title="Zoom Out (Show More Candles)"
            id="zoom-out-btn"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] text-slate-400 px-1 font-mono">{zoomLevel}c</span>
          <button
            onClick={() => changeZoom(-10)}
            className="p-1 px-1.5 rounded text-xs bg-slate-850 hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-1 border-0 cursor-pointer"
            title="Zoom In (Show Fewer Candles)"
            id="zoom-in-btn"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Canvas Container */}
      <div className="flex-grow mt-3 min-h-[300px] h-[400px]" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair select-none rounded bg-slate-950"
          id="canvas-candle-chart"
        />
      </div>

      {/* Chart controls helper info */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800/50">
        <span className="flex items-center gap-1">
          <MoveRight className="h-3 w-3" /> Hover mouse for values & price action HUD
        </span>
        <span>Binance public WebSocket stream simulated live</span>
      </div>
    </div>
  );
}
