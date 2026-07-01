/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle } from '../types';

/**
 * Calculates EMA for a series of values
 */
export function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = new Array(values.length).fill(0);
  if (values.length === 0) return ema;

  const k = 2 / (period + 1);
  
  // Start with simple average or initial value
  let sum = 0;
  const startLength = Math.min(period, values.length);
  for (let i = 0; i < startLength; i++) {
    sum += values[i];
  }
  let prevEma = sum / startLength;
  ema[startLength - 1] = prevEma;

  // Pre-fill indices before period with their values or rolling average
  for (let i = 0; i < startLength - 1; i++) {
    ema[i] = values[i];
  }

  for (let i = startLength; i < values.length; i++) {
    const currentEma = (values[i] * k) + (prevEma * (1 - k));
    ema[i] = currentEma;
    prevEma = currentEma;
  }

  return ema;
}

/**
 * Calculates RSI (Relative Strength Index) with Wilder's Smoothing
 */
export function calculateRSI(closes: number[], period: number): number[] {
  const rsi: number[] = new Array(closes.length).fill(50); // default to 50
  if (closes.length <= period) return rsi;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // First average gain/loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const currentGain = gains[i - 1];
    const currentLoss = losses[i - 1];

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

/**
 * Calculates ATR (Average True Range) using Wilder's smoothing
 */
export function calculateATR(candles: Candle[], period: number): number[] {
  const atr: number[] = new Array(candles.length).fill(0);
  if (candles.length === 0) return atr;

  const tr: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const highLow = candles[i].high - candles[i].low;
    const highPrevClose = Math.abs(candles[i].high - candles[i - 1].close);
    const lowPrevClose = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  let sum = 0;
  const startLength = Math.min(period, tr.length);
  for (let i = 0; i < startLength; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / startLength;
  atr[startLength - 1] = prevAtr;

  // Pre-fill indices
  for (let i = 0; i < startLength - 1; i++) {
    atr[i] = tr[i];
  }

  for (let i = startLength; i < candles.length; i++) {
    const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
    atr[i] = currentAtr;
    prevAtr = currentAtr;
  }

  return atr;
}

/**
 * Calculates SMA (Simple Moving Average)
 */
export function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = new Array(values.length).fill(0);
  if (values.length === 0) return sma;

  let sum = 0;
  const startLength = Math.min(period, values.length);
  for (let i = 0; i < startLength; i++) {
    sum += values[i];
  }
  sma[startLength - 1] = sum / startLength;

  for (let i = 0; i < startLength - 1; i++) {
    sma[i] = values[i];
  }

  for (let i = startLength; i < values.length; i++) {
    sum = sum - values[i - period] + values[i];
    sma[i] = sum / period;
  }

  return sma;
}

/**
 * Enriches candle objects with specified technical indicators
 */
export function calculateIndicators(
  candles: Candle[],
  emaShortPeriod: number,
  emaLongPeriod: number,
  rsiPeriod: number,
  atrPeriod: number,
  volSmaPeriod: number
): Candle[] {
  if (candles.length === 0) return [];

  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);

  const emaShort = calculateEMA(closes, emaShortPeriod);
  const emaLong = calculateEMA(closes, emaLongPeriod);
  const rsi = calculateRSI(closes, rsiPeriod);
  const atr = calculateATR(candles, atrPeriod);
  const volSma = calculateSMA(volumes, volSmaPeriod);

  return candles.map((candle, idx) => ({
    ...candle,
    ema9: emaShort[idx],
    ema21: emaLong[idx],
    rsi: rsi[idx],
    atr: atr[idx],
    volSma: volSma[idx],
  }));
}
