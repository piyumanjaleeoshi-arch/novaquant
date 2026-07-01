/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle } from '../types';

// Approximate base prices for different symbols to make simulation realistic
const SYMBOL_BASE_PRICES: Record<string, number> = {
  BTCUSDT: 68500,
  ETHUSDT: 3450,
  SOLUSDT: 165,
  DOGEUSDT: 0.145,
  BNBUSDT: 580,
  XRPUSDT: 0.52,
  ADAUSDT: 0.46,
  LINKUSDT: 15.40,
  LTCUSDT: 81.50,
  AVAXUSDT: 32.80,
  DOTUSDT: 6.20,
  NEARUSDT: 5.75,
  SUIUSDT: 1.15,
};

/**
 * Generates realistic mock kline data using random-walk with volatility and trends
 */
export function generateMockKlines(
  symbol: string,
  interval: string,
  limit: number = 100,
  customBasePrice?: number
): Candle[] {
  const basePrice = customBasePrice || SYMBOL_BASE_PRICES[symbol.toUpperCase()] || 100;
  const candles: Candle[] = [];
  
  // Set time spacing based on interval
  let spacingMs = 60 * 1000; // 1m default
  if (interval === '5m') spacingMs = 5 * 60 * 1000;
  else if (interval === '15m') spacingMs = 15 * 60 * 1000;
  else if (interval === '1h') spacingMs = 60 * 60 * 1000;
  else if (interval === '4h') spacingMs = 4 * 60 * 60 * 1000;
  else if (interval === '1d') spacingMs = 24 * 60 * 60 * 1000;

  const now = Date.now();
  let currentPrice = basePrice * (0.9 + Math.random() * 0.2); // Start with slight variation
  let currentTime = now - limit * spacingMs;
  let runningVolumeAvg = basePrice > 1000 ? 50 : 5000;

  // Generate trend cycles to allow technical signals (crossings) to trigger realistically
  for (let i = 0; i < limit; i++) {
    const cyclePos = (i / limit) * Math.PI * 6; // ~3 full sine wave cycles
    const trendEffect = Math.sin(cyclePos) * (basePrice * 0.003) + (Math.random() - 0.49) * (basePrice * 0.008); 
    
    // Add periodic volume surges
    const isVolumeSurge = Math.random() > 0.85 || (i > 30 && i < 35) || (i > 70 && i < 75);
    const volume = runningVolumeAvg * (isVolumeSurge ? (1.5 + Math.random() * 2) : (0.5 + Math.random()));

    const open = currentPrice;
    const close = currentPrice + trendEffect;
    
    // Determine high and low
    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);
    const volatilityPct = isVolumeSurge ? 0.015 : 0.005;
    const high = maxOC * (1 + Math.random() * volatilityPct);
    const low = minOC * (1 - Math.random() * volatilityPct);

    candles.push({
      time: currentTime,
      open: parseFloat(open.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      volume: parseFloat(volume.toFixed(2)),
    });

    currentPrice = close;
    currentTime += spacingMs;
  }

  return candles;
}

/**
 * Procedurally generates the next candle based on previous candle data.
 * Used for live streaming ticks in Paper-Trading Simulated Mode.
 */
export function generateNextCandle(prev: Candle, interval: string, trendBias: number = 0): Candle {
  let spacingMs = 60 * 1000;
  if (interval === '5m') spacingMs = 5 * 60 * 1000;
  else if (interval === '15m') spacingMs = 15 * 60 * 1000;
  else if (interval === '1h') spacingMs = 60 * 60 * 1000;
  else if (interval === '4h') spacingMs = 4 * 60 * 60 * 1000;
  else if (interval === '1d') spacingMs = 24 * 60 * 60 * 1000;

  const open = prev.close;
  // Dynamic random walk with customizable drift (trend bias)
  // trendBias is positive for bullish drift, negative for bearish drift
  const randomDrift = (Math.random() - 0.5 + trendBias) * (open * 0.004);
  const close = open + randomDrift;

  const maxOC = Math.max(open, close);
  const minOC = Math.min(open, close);
  
  // Decide volume surge randomly
  const isVolumeSurge = Math.random() > 0.9;
  const volume = prev.volume * (isVolumeSurge ? (1.3 + Math.random() * 1.5) : (0.6 + Math.random() * 0.7));

  const high = maxOC * (1 + Math.random() * (isVolumeSurge ? 0.008 : 0.003));
  const low = minOC * (1 - Math.random() * (isVolumeSurge ? 0.008 : 0.003));

  return {
    time: prev.time + spacingMs,
    open: parseFloat(open.toFixed(4)),
    high: parseFloat(high.toFixed(4)),
    low: parseFloat(low.toFixed(4)),
    close: parseFloat(close.toFixed(4)),
    volume: parseFloat(volume.toFixed(2)),
  };
}

/**
 * Fetches klines from Binance API with robust fallbacks
 */
export async function fetchKlinesFromBinance(
  symbol: string,
  interval: string,
  limit: number = 200,
  customBasePrice?: number,
  isTestnet: boolean = true
): Promise<Candle[]> {
  const cleanSymbol = symbol.toUpperCase().replace('/', '');
  
  // Array of endpoints to try:
  // 1. Binance Futures API (as requested by user "Binance Futures")
  // 2. Binance Spot API (public, often less geo-restricted)
  const urls = isTestnet
    ? [
        `https://testnet.binancefuture.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`,
        `https://testnet.binance.vision/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`,
      ]
    : [
        `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`,
        `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`,
      ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        // Parse Binance Candle data format:
        // [
        //   [
        //     1499040000000,      // Open time
        //     "0.01634790",       // Open
        //     "0.80000000",       // High
        //     "0.01575800",       // Low
        //     "0.01577100",       // Close
        //     "148976.11427815",  // Volume
        //     1499644799999,      // Close time
        //     "2434.19055334",    // Quote asset volume
        //     ...
        //   ]
        // ]
        return data.map((item: any) => ({
          time: Number(item[0]),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        }));
      }
    } catch (e) {
      console.warn(`Failed fetching from binance endpoint ${url}:`, e);
    }
  }

  // If both endpoints fail, return mock data procedurally generated
  console.log(`Falling back to simulated price feed for ${cleanSymbol}`);
  return generateMockKlines(cleanSymbol, interval, limit, customBasePrice);
}
