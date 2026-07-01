/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Candle {
  time: number; // timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9?: number;
  ema21?: number;
  rsi?: number;
  atr?: number;
  volSma?: number;
}

export type TradeSide = 'LONG' | 'SHORT';

export interface PositionAnalysis {
  patternId: string;
  patternName: string;
  matchedTemplate: string;
  historicalWinRate: number;
  confidenceScore: number;
  leverageAdvisory: string;
  riskRating: 'LOW' | 'MODERATE' | 'HIGH' | 'EXPERT';
  trendAngle: string;
  volumeSurgeRatio: number;
  rsiStrength: string;
  recommendationText: string;
  triggeredBy: 'AUTOPILOT_SWEEP' | 'MANUAL_DISPATCH';
}

export interface Position {
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  currentPrice: number;
  size: number; // in cryptocurrency units
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  margin: number;
  pnl: number;
  pnlPercent: number;
  entryTime: number;
  analysis?: PositionAnalysis;
}

export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  exitPrice: number;
  size: number;
  profit: number;
  exitReason: 'TP' | 'SL' | 'EMERGENCY' | 'MANUAL';
  entryTime: number;
  exitTime: number;
}

export interface BotConfig {
  isLive: boolean;
  paperBalance: number;
  binanceApiKey: string;
  binanceApiSecret: string;
  telegramToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
  riskPerTrade: number; // percentage of balance, e.g. 1
  slAtrMultiplier: number; // e.g. 1.5
  tpAtrMultiplier: number; // e.g. 3
  maxTradesPerDay: number; // e.g. 3
  symbol: string; // e.g. 'BTCUSDT'
  timeframe: string; // '1m' | '5m' | '15m' | '1h'
  emaShort: number; // e.g. 9
  emaLong: number; // e.g. 21
  rsiPeriod: number; // e.g. 14
  rsiBuyThreshold: number; // e.g. 55
  rsiSellThreshold: number; // e.g. 45
  volSmaPeriod: number; // e.g. 20
  avoidNews: boolean;
  // Capital Protection Parameters
  mode: 'GUARDIAN' | 'EQUILIBRIUM' | 'APEX';
  maxDailyLossLimit: number; // Max daily loss percentage, e.g. 3% (hard halt)
  enableTrailingStop: boolean;
  trailingActivationMult: number; // ATR multiplier to activate trailing stop (e.g., 1.5x)
  leverageCeiling: number; // max leverage allowed
  exchange?: 'Binance' | 'Bybit' | 'Bitget' | 'OKX' | 'dYdX' | 'Coinbase';
  enableAudioNotifications?: boolean;
  positionSizingMode?: 'RISK' | 'FIXED';
  initialPositionAmount?: number;
  aiTradingEnabled?: boolean;
  aiConfidenceThreshold?: number;
  aiTradingMode?: 'MANUAL' | 'AUTOMATIC';
}

export interface NewsEvent {
  id: string;
  event: string;
  time: number; // timestamp
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  restrictionMinutesBefore: number;
  restrictionMinutesAfter: number;
  active: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'system';
  message: string;
}

export interface BotStats {
  initialBalance: number;
  currentBalance: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  unrealizedPnl: number;
  totalProfit: number;
  maxDrawdown: number;
}
