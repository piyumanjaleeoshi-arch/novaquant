/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionTier = 'BASIC' | 'PRO' | 'ENTERPRISE';

export interface Workspace {
  id: string;
  name: string;
  plan: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  binanceApiKey: string;
  binanceApiSecret: string;
  exchange?: 'Binance' | 'Bybit' | 'Bitget' | 'OKX' | 'dYdX' | 'Coinbase';
  telegramEnabled: boolean;
  telegramChatId: string;
  telegramToken?: string;
  emailAlertsEnabled: boolean;
  emailAddress: string;
  isLive: boolean; // paper vs live trade execution
  riskPerTrade: number;
  gasBalance: number; // Gas fuel units
  audioNotificationsEnabled?: boolean;
  positionSizingMode?: 'RISK' | 'FIXED';
  initialPositionAmount?: number;
}

export interface GasTransaction {
  id: string;
  timestamp: string;
  workspaceName: string;
  symbol: string;
  amount: number; // e.g. -1.5 Fuel or +500 Fuel
  type: 'CONSUMPTION' | 'PURCHASE' | 'BONUS';
  details: string;
}

export interface SaaSUser {
  id: string;
  email: string;
  name: string;
  authProvider: 'EMAIL' | 'GOOGLE' | 'TELEGRAM';
  joinedDate: string;
  workspacesCount: number;
  totalGasSpent: number;
  plan: SubscriptionTier;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface SaaSMetrics {
  totalRevenue: number;
  subscriptionRevenue: number;
  gasRevenue: number;
  totalGasSpent: number;
  activeUsersCount: number;
  totalWorkspacesCount: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  ipAddress: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

export interface ReferralPayout {
  id: string;
  timestamp: string;
  referrer: string;
  referredUser: string;
  amountUSDT: number;
  commissionUSDT: number;
}

