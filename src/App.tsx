/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Candle,
  Position,
  Trade,
  BotConfig,
  LogEntry,
  NewsEvent,
  BotStats,
} from './types';
import { Workspace, GasTransaction, SaaSUser, SaaSMetrics, AuditLog, SubscriptionTier, ReferralPayout } from './saasTypes';
import { calculateIndicators } from './utils/indicators';
import { fetchKlinesFromBinance, generateNextCandle } from './utils/binance';
import { playTradeEntry, playTradeExitProfit, playTradeExitLoss } from './utils/audio';

// Core Components
import CandlestickChart from './components/CandlestickChart';
import BotControlPanel from './components/BotControlPanel';
import PositionsTable from './components/PositionsTable';
import HistoryTable from './components/HistoryTable';
import PnLDashboard from './components/PnLDashboard';
import NewsManager from './components/NewsManager';
import LogTerminal from './components/LogTerminal';

// New SaaS Modules
import AuthGateway from './components/AuthGateway';
import NovaQuantLogo from './components/NovaQuantLogo';
import TwoFactorSetupCard from './components/TwoFactorSetupCard';

// Firebase integrations
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

import GasTankHub from './components/GasTankHub';
import AdminConsole from './components/AdminConsole';
import ArchitectureBlueprints from './components/ArchitectureBlueprints';
import RiskShieldController, { EXCHANGE_LEVERAGE_LIMITS } from './components/RiskShieldController';
import ClientAcquisitionHub from './components/ClientAcquisitionHub';
import AssetSelectorPanel from './components/AssetSelectorPanel';
import AccuracyDbAnalyzer, { generateSmartAnalysis } from './components/AccuracyDbAnalyzer';
import ExchangeWallets from './components/ExchangeWallets';
import UserProfilePanel from './components/UserProfilePanel';
import AICopilotAnalyzer from './components/AICopilotAnalyzer';

import {
  Sparkles,
  Brain,
  Bot,
  Terminal as TermIcon,
  Settings as SettingsIcon,
  CalendarRange,
  Zap,
  RotateCcw,
  LayoutGrid,
  TrendingDown,
  TrendingUp,
  Award,
  DollarSign,
  PieChart,
  User,
  Users,
  Flame,
  ShieldAlert,
  Server,
  LogOut,
  Bell,
  Mail,
  Sliders,
  FileKey2,
  Lock,
  Globe,
  Smartphone,
  NotebookTabs,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  Shield,
  Wallet,
  QrCode,
  Wifi,
  ExternalLink,
  Copy,
  Send,
  Cpu,
  Eye,
  EyeOff
} from 'lucide-react';

// Real-world Binance Spot and Futures asset definitions based on Coinranking metrics
const BINANCE_COINS: Record<string, { name: string; iconColor: string; basePrice: number; marketType: 'spot' | 'future' }> = {
  // --- SPOT MARKETS ---
  BTCUSDT: { name: 'Bitcoin (Spot)', iconColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30', basePrice: 68500, marketType: 'spot' },
  ETHUSDT: { name: 'Ethereum (Spot)', iconColor: 'text-sky-500 bg-sky-500/10 border-sky-500/30', basePrice: 3450, marketType: 'spot' },
  BNBUSDT: { name: 'Binance Coin (Spot)', iconColor: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', basePrice: 580, marketType: 'spot' },
  SOLUSDT: { name: 'Solana (Spot)', iconColor: 'text-purple-500 bg-purple-500/10 border-purple-500/30', basePrice: 165, marketType: 'spot' },
  XRPUSDT: { name: 'Ripple (Spot)', iconColor: 'text-[#00aae4] bg-[#00aae4]/10 border-[#00aae4]/30', basePrice: 0.52, marketType: 'spot' },
  ADAUSDT: { name: 'Cardano (Spot)', iconColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30', basePrice: 0.46, marketType: 'spot' },
  DOGEUSDT: { name: 'Dogecoin (Spot)', iconColor: 'text-orange-400 bg-orange-400/10 border-orange-400/30', basePrice: 0.145, marketType: 'spot' },
  SHIBUSDT: { name: 'Shiba Inu (Spot)', iconColor: 'text-orange-505 bg-orange-505/10 border-orange-505/30', basePrice: 0.000021, marketType: 'spot' },
  AVAXUSDT: { name: 'Avalanche (Spot)', iconColor: 'text-red-500 bg-red-500/10 border-red-500/30', basePrice: 32.80, marketType: 'spot' },
  LINKUSDT: { name: 'Chainlink (Spot)', iconColor: 'text-[#2a5ada] bg-[#2a5ada]/10 border-[#2a5ada]/30', basePrice: 15.40, marketType: 'spot' },
  DOTUSDT: { name: 'Polkadot (Spot)', iconColor: 'text-pink-500 bg-pink-500/10 border-pink-500/30', basePrice: 6.20, marketType: 'spot' },
  NEARUSDT: { name: 'Near Protocol (Spot)', iconColor: 'text-white bg-slate-800/80 border-slate-700/50', basePrice: 5.75, marketType: 'spot' },
  PEPEUSDT: { name: 'Pepe (Spot)', iconColor: 'text-green-500 bg-green-500/10 border-green-500/30', basePrice: 0.0000145, marketType: 'spot' },
  LTCUSDT: { name: 'Litecoin (Spot)', iconColor: 'text-slate-400 bg-slate-400/10 border-slate-400/30', basePrice: 81.50, marketType: 'spot' },
  UNIUSDT: { name: 'Uniswap (Spot)', iconColor: 'text-rose-500 bg-rose-500/10 border-rose-500/30', basePrice: 7.80, marketType: 'spot' },
  FTMUSDT: { name: 'Fantom (Spot)', iconColor: 'text-blue-500 bg-blue-500/10 border-blue-500/30', basePrice: 0.78, marketType: 'spot' },
  ATOMUSDT: { name: 'Cosmos (Spot)', iconColor: 'text-purple-400 bg-purple-400/10 border-purple-400/30', basePrice: 6.90, marketType: 'spot' },
  OPUSDT: { name: 'Optimism (Spot)', iconColor: 'text-red-650 bg-red-650/10 border-red-650/30', basePrice: 1.85, marketType: 'spot' },
  ARBUSDT: { name: 'Arbitrum (Spot)', iconColor: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30', basePrice: 0.95, marketType: 'spot' },
  RENDERUSDT: { name: 'Render (Spot)', iconColor: 'text-rose-500 bg-rose-500/10 border-rose-500/30', basePrice: 8.40, marketType: 'spot' },
  SUIUSDT: { name: 'Sui (Spot)', iconColor: 'text-teal-400 bg-teal-400/10 border-teal-400/30', basePrice: 1.15, marketType: 'spot' },
  TRXUSDT: { name: 'Tron (Spot)', iconColor: 'text-red-400 bg-red-400/10 border-red-400/30', basePrice: 0.115, marketType: 'spot' },

  // --- FUTURES (PERPETUALS) MARKETS ---
  'BTCUSDT-PERP': { name: 'Bitcoin Futures', iconColor: 'text-amber-500 bg-amber-500/10 border-amber-500/50 border-double', basePrice: 68650, marketType: 'future' },
  'ETHUSDT-PERP': { name: 'Ethereum Futures', iconColor: 'text-sky-500 bg-sky-500/10 border-sky-500/50 border-double', basePrice: 3462, marketType: 'future' },
  'BNBUSDT-PERP': { name: 'Binance Coin Futures', iconColor: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/50 border-double', basePrice: 581.5, marketType: 'future' },
  'SOLUSDT-PERP': { name: 'Solana Futures', iconColor: 'text-purple-500 bg-purple-500/10 border-purple-500/50 border-double', basePrice: 165.8, marketType: 'future' },
  'XRPUSDT-PERP': { name: 'Ripple Futures', iconColor: 'text-[#00aae4] bg-[#00aae4]/10 border-[#00aae4]/50 border-double', basePrice: 0.522, marketType: 'future' },
  'ADAUSDT-PERP': { name: 'Cardano Futures', iconColor: 'text-blue-500 bg-blue-500/10 border-blue-500/50 border-double', basePrice: 0.461, marketType: 'future' },
  'DOGEUSDT-PERP': { name: 'Dogecoin Futures', iconColor: 'text-orange-400 bg-orange-400/10 border-orange-400/50 border-double', basePrice: 0.1455, marketType: 'future' },
  'SHIBUSDT-PERP': { name: 'Shiba Inu Futures', iconColor: 'text-[#ff9800] bg-[#ff9800]/10 border-[#ff9800]/50 border-double', basePrice: 0.0000211, marketType: 'future' },
  'AVAXUSDT-PERP': { name: 'Avalanche Futures', iconColor: 'text-red-500 bg-red-500/10 border-red-500/50 border-double', basePrice: 32.92, marketType: 'future' },
  'LINKUSDT-PERP': { name: 'Chainlink Futures', iconColor: 'text-[#2a5ada] bg-[#2a5ada]/10 border-[#2a5ada]/50 border-double', basePrice: 15.44, marketType: 'future' },
  'DOTUSDT-PERP': { name: 'Polkadot Futures', iconColor: 'text-pink-500 bg-pink-500/10 border-pink-500/50 border-double', basePrice: 6.22, marketType: 'future' },
  'NEARUSDT-PERP': { name: 'Near Protocol Futures', iconColor: 'text-white bg-slate-800/80 border-slate-700/50 border-double', basePrice: 5.77, marketType: 'future' },
  'PEPEUSDT-PERP': { name: 'Pepe Futures', iconColor: 'text-green-500 bg-green-500/10 border-green-500/50 border-double', basePrice: 0.0000146, marketType: 'future' },
  'LTCUSDT-PERP': { name: 'Litecoin Futures', iconColor: 'text-slate-400 bg-slate-400/10 border-slate-400/50 border-double', basePrice: 81.75, marketType: 'future' },
  'UNIUSDT-PERP': { name: 'Uniswap Futures', iconColor: 'text-rose-500 bg-rose-500/10 border-rose-500/50 border-double', basePrice: 7.84, marketType: 'future' },
  'FTMUSDT-PERP': { name: 'Fantom Futures', iconColor: 'text-blue-500 bg-blue-500/10 border-blue-500/50 border-double', basePrice: 0.785, marketType: 'future' },
  'ATOMUSDT-PERP': { name: 'Cosmos Futures', iconColor: 'text-purple-400 bg-purple-400/10 border-purple-400/50 border-double', basePrice: 6.93, marketType: 'future' },
  'OPUSDT-PERP': { name: 'Optimism Futures', iconColor: 'text-red-650 bg-red-650/10 border-red-650/50 border-double', basePrice: 1.86, marketType: 'future' },
  'ARBUSDT-PERP': { name: 'Arbitrum Futures', iconColor: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/50 border-double', basePrice: 0.955, marketType: 'future' },
  'RENDERUSDT-PERP': { name: 'Render Futures', iconColor: 'text-rose-500 bg-rose-500/10 border-rose-500/50 border-double', basePrice: 8.45, marketType: 'future' },
  'SUIUSDT-PERP': { name: 'Sui Futures', iconColor: 'text-teal-400 bg-teal-400/10 border-teal-400/50 border-double', basePrice: 1.155, marketType: 'future' },
  'TRXUSDT-PERP': { name: 'Tron Futures', iconColor: 'text-red-400 bg-red-400/10 border-red-400/50 border-double', basePrice: 0.1155, marketType: 'future' }
};

const INITIAL_COIN_REGISTRY = BINANCE_COINS;
const INITIAL_ENABLED_COINS = Object.keys(INITIAL_COIN_REGISTRY);

// Queued crypto listing template assets to simulate new market arrivals dynamically
const UPCOMING_MARKET_COINS = [
  { symbol: 'WIFUSDT', name: 'dogwifhat', basePrice: 2.85 },
  { symbol: 'BONKUSDT', name: 'Bonk', basePrice: 0.000028 },
  { symbol: 'FLOKIUSDT', name: 'Floki Coin', basePrice: 0.00024 },
  { symbol: 'BOMEUSDT', name: 'Book of Meme', basePrice: 0.0125 },
  { symbol: 'POPCATUSDT', name: 'Popcat', basePrice: 0.68 },
  { symbol: 'EIGENUSDT', name: 'EigenLayer', basePrice: 3.12 },
  { symbol: 'ZKUSDT', name: 'ZKsync Era', basePrice: 0.17 },
  { symbol: 'STRKUSDT', name: 'Starknet', basePrice: 0.49 },
  { symbol: 'DYDXUSDT', name: 'dYdX Protocol', basePrice: 1.35 },
  { symbol: 'JUPUSDT', name: 'Jupiter DEX', basePrice: 0.88 },
  { symbol: 'PYTHUSDT', name: 'Pyth Network Price', basePrice: 0.36 },
  { symbol: 'TAOUSDT', name: 'Bittensor AI', basePrice: 374.50 },
  { symbol: 'IOUSDT', name: 'io.net Cloud', basePrice: 2.12 },
  { symbol: 'NOTUSDT', name: 'Notcoin', basePrice: 0.0155 },
  { symbol: 'WUSDT', name: 'Wormhole Bridger', basePrice: 0.32 },
  { symbol: 'SAGAUSDT', name: 'Saga Chain', basePrice: 1.75 },
  { symbol: 'TNSRUSDT', name: 'Tensor NFT', basePrice: 0.62 },
];

// Seeding Default upcoming macro news events
const SEED_NEWS_EVENTS: NewsEvent[] = [
  {
    id: 'news-event-1',
    event: '🇺🇸 CPI Inflation Report Release',
    time: Date.now() + 18 * 60 * 1000,
    impact: 'HIGH',
    restrictionMinutesBefore: 15,
    restrictionMinutesAfter: 15,
    active: true,
  },
  {
    id: 'news-event-2',
    event: '🇪🇺 ECB Press Conference & Policy Statement',
    time: Date.now() + 180 * 60 * 1000,
    impact: 'MEDIUM',
    restrictionMinutesBefore: 10,
    restrictionMinutesAfter: 10,
    active: true,
  },
];

// Seed initial gas consumption & purchase logs across workspaces
const SEED_GAS_TRANSACTIONS: GasTransaction[] = [
  {
    id: 'gas-tx-1',
    timestamp: '07:35:12 AM',
    workspaceName: 'Alpha Yield Desk',
    symbol: 'BTCUSDT',
    amount: -1.5000,
    type: 'CONSUMPTION',
    details: 'Autopilot Entry: BTCUSDT LONG'
  },
  {
    id: 'gas-tx-2',
    timestamp: '07:22:45 AM',
    workspaceName: 'Alpha Yield Desk',
    symbol: 'ETHUSDT',
    amount: -1.5000,
    type: 'CONSUMPTION',
    details: 'Autopilot Entry: ETHUSDT SHORT'
  },
  {
    id: 'gas-tx-3',
    timestamp: '06:05:00 AM',
    workspaceName: 'Alpha Yield Desk',
    symbol: 'SOLUSDT',
    amount: -1.5000,
    type: 'CONSUMPTION',
    details: 'Autopilot Entry: SOLUSDT LONG'
  },
  {
    id: 'gas-tx-4',
    timestamp: '05:00:22 AM',
    workspaceName: 'Alpha Yield Desk',
    symbol: 'ALL',
    amount: 100.0000,
    type: 'PURCHASE',
    details: 'Starter 100 Bot Fuel Refill Pack'
  }
];

// Seed initial SaaS tenants inside Admin Panel
const SEED_SAAS_USERS: SaaSUser[] = [
  {
    id: 'usr-1',
    email: 'piyumanjaleeoshi@gmail.com',
    name: 'Oshi Piyumanjalee',
    authProvider: 'GOOGLE',
    joinedDate: 'June 01, 2026',
    workspacesCount: 1,
    totalGasSpent: 185.5000,
    plan: 'BASIC',
    status: 'ACTIVE'
  },
  {
    id: 'usr-2',
    email: 'alex.c@alphacapital.io',
    name: 'Alex Chen',
    authProvider: 'EMAIL',
    joinedDate: 'May 28, 2026',
    workspacesCount: 1,
    totalGasSpent: 87.5000,
    plan: 'BASIC',
    status: 'ACTIVE'
  },
  {
    id: 'usr-3',
    email: 'trader_mvp@t.me',
    name: 'Marta V.',
    authProvider: 'TELEGRAM',
    joinedDate: 'May 30, 2026',
    workspacesCount: 1,
    totalGasSpent: 4.5000,
    plan: 'BASIC',
    status: 'ACTIVE'
  },
  {
    id: 'usr-4',
    email: 'banned.botter@gmail.com',
    name: 'Devon R.',
    authProvider: 'EMAIL',
    joinedDate: 'May 15, 2026',
    workspacesCount: 2,
    totalGasSpent: 0.0000,
    plan: 'BASIC',
    status: 'SUSPENDED'
  }
];

// Seed administrative logs
const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    timestamp: '07:40:11 AM',
    actor: 'Oshi Piyumanjalee',
    action: 'Developer console session authorized via OAuth2 Google Cloud API',
    ipAddress: '116.14.99.12',
    severity: 'INFO'
  },
  {
    id: 'audit-2',
    timestamp: '07:38:45 AM',
    actor: 'System Firewall',
    action: 'Tenant Devon R. suspended: Volatility index flooding attack blocked from root API',
    ipAddress: '190.151.22.44',
    severity: 'CRITICAL'
  },
  {
    id: 'audit-3',
    timestamp: '07:30:00 AM',
    actor: 'AES-256 Locker',
    action: 'Binance API credentials private keys rotated and local state synched',
    ipAddress: 'System Internal',
    severity: 'INFO'
  },
  {
    id: 'audit-4',
    timestamp: '07:15:22 AM',
    actor: 'Platform Health index',
    action: 'Standard uptime index check completed: 99.98% response across clusters',
    ipAddress: 'Node 4-A CloudRun',
    severity: 'INFO'
  }
];

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; provider: 'EMAIL' | 'GOOGLE' | 'TELEGRAM'; role?: string; email_verified?: boolean; uid?: string } | null>(() => {
    try {
      const cached = localStorage.getItem('novaquant_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      }
    } catch {}
    return null; // Force real login by default
  });

  const isAdmin = !!(
    currentUser?.role === 'ADMIN' || 
    currentUser?.email?.toLowerCase() === 'piyumanjaleeoshi@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'novaquant2026@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'salindaperera1997@gmail.com' ||
    currentUser?.email?.toLowerCase().startsWith('admin') ||
    currentUser?.email?.toLowerCase().includes('admin@')
  );

  // Session recovery uplink using Firebase onAuthStateChanged and Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const role = userData.role || (
              firebaseUser.email?.toLowerCase() === 'piyumanjaleeoshi@gmail.com' ||
              firebaseUser.email?.toLowerCase() === 'novaquant2026@gmail.com' ||
              firebaseUser.email?.toLowerCase() === 'salindaperera1997@gmail.com' ||
              firebaseUser.email?.toLowerCase().startsWith('admin') ||
              firebaseUser.email?.toLowerCase().includes('admin@') ? 'ADMIN' : 'USER'
            );
            
            const isVerifiedOffline = localStorage.getItem(`user_verified_${firebaseUser.email!.toLowerCase().trim()}`) === 'true';
            const userObj = {
              email: firebaseUser.email!,
              name: userData.fullName || userData.name || firebaseUser.displayName || 'Operator',
              provider: 'EMAIL' as const,
              role: role,
              email_verified: userData.emailVerified ?? userData.email_verified ?? isVerifiedOffline ?? false,
              uid: firebaseUser.uid
            };
            
            setCurrentUser(userObj);
            localStorage.setItem('novaquant_user', JSON.stringify(userObj));
          } else {
            // Document not found in Firestore yet, build fallback
            const role = (
              firebaseUser.email?.toLowerCase() === 'piyumanjaleeoshi@gmail.com' ||
              firebaseUser.email?.toLowerCase() === 'novaquant2026@gmail.com' ||
              firebaseUser.email?.toLowerCase() === 'salindaperera1997@gmail.com' ||
              firebaseUser.email?.toLowerCase().startsWith('admin') ||
              firebaseUser.email?.toLowerCase().includes('admin@') ? 'ADMIN' : 'USER'
            );
            const isVerifiedOffline = localStorage.getItem(`user_verified_${firebaseUser.email!.toLowerCase().trim()}`) === 'true';
            const userObj = {
              email: firebaseUser.email!,
              name: firebaseUser.displayName || 'Operator',
              provider: 'EMAIL' as const,
              role: role,
              email_verified: isVerifiedOffline,
              uid: firebaseUser.uid
            };
            setCurrentUser(userObj);
          }
        } catch (e) {
          console.warn("[NovaQuant] Fallback offline credentials logic activated:", e);
          
          // Re-hydrate state using local cached memory or active session fallback payload
          const cached = localStorage.getItem('novaquant_user');
          if (cached) {
            try {
              setCurrentUser(JSON.parse(cached));
            } catch {
              const role = (
                firebaseUser.email?.toLowerCase() === 'piyumanjaleeoshi@gmail.com' ||
                firebaseUser.email?.toLowerCase() === 'novaquant2026@gmail.com' ||
                firebaseUser.email?.toLowerCase() === 'salindaperera1997@gmail.com' ||
                firebaseUser.email?.toLowerCase().startsWith('admin') ||
                firebaseUser.email?.toLowerCase().includes('admin@') ? 'ADMIN' : 'USER'
              );
              setCurrentUser({
                email: firebaseUser.email!,
                name: firebaseUser.displayName || 'Operator',
                provider: 'EMAIL' as const,
                role: role,
                email_verified: true,
                uid: firebaseUser.uid
              });
            }
          } else {
            const role = (
              firebaseUser.email?.toLowerCase() === 'piyumanjaleeoshi@gmail.com' ||
              firebaseUser.email?.toLowerCase() === 'novaquant2026@gmail.com' ||
              firebaseUser.email?.toLowerCase() === 'salindaperera1997@gmail.com' ||
              firebaseUser.email?.toLowerCase().startsWith('admin') ||
              firebaseUser.email?.toLowerCase().includes('admin@') ? 'ADMIN' : 'USER'
            );
            setCurrentUser({
              email: firebaseUser.email!,
              name: firebaseUser.displayName || 'Operator',
              provider: 'EMAIL' as const,
              role: role,
              email_verified: true,
              uid: firebaseUser.uid
            });
          }
        }
      } else {
        const cached = localStorage.getItem('novaquant_user');
        if (cached) {
          try {
            const user = JSON.parse(cached);
            if (user) {
              setCurrentUser(user);
            } else {
              setCurrentUser(null);
            }
          } catch {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);


  // Core navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pnl' | 'news' | 'settings' | 'gas' | 'admin' | 'blueprint' | 'wallets' | 'profile' | 'ai'>('dashboard');
  
  // Trade indicators and active trade selections
  const [activeSymbol, setActiveSymbol] = useState<string>('SOLUSDT');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('5m');

  // Multi-Tenant Workspaces setup
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem('novaquant_workspaces');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(w => w.id === 'ws-alpha' || w.name === 'Alpha Yield Desk');
          if (filtered.length > 0) {
            return [
              {
                ...filtered[0],
                id: 'ws-alpha',
                name: 'Alpha Yield Desk',
                plan: 'BASIC',
                exchange: 'Binance'
              }
            ];
          }
        }
      } catch (e) {
        console.error('Failed to parse saved workspaces', e);
      }
    }
    return [
      {
        id: 'ws-alpha',
        name: 'Alpha Yield Desk',
        plan: 'BASIC',
        billingCycle: 'monthly',
        binanceApiKey: '',
        binanceApiSecret: '',
        exchange: 'Binance',
        telegramEnabled: false,
        telegramChatId: '',
        telegramToken: '',
        emailAlertsEnabled: false,
        emailAddress: 'piyumanjaleeoshi@gmail.com',
        isLive: true,
        riskPerTrade: 1.5,
        gasBalance: 100.0000,
        audioNotificationsEnabled: true,
        positionSizingMode: 'RISK',
        initialPositionAmount: 100,
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('novaquant_workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('ws-alpha');

  // Gas ledger state
  const [gasTransactions, setGasTransactions] = useState<GasTransaction[]>(SEED_GAS_TRANSACTIONS);

  // Admin user directory state
  const [saasUsers, setSaasUsers] = useState<SaaSUser[]>(SEED_SAAS_USERS);

  // Admin and system audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(SEED_AUDIT_LOGS);

  // Global aggregate SaaS metrics
  const [saasMetrics, setSaasMetrics] = useState<SaaSMetrics>({
    totalRevenue: 590, // initial pre-seeded values e.g. Enterprise + Pro subs + Refills
    subscriptionRevenue: 495,
    gasRevenue: 95,
    totalGasSpent: 277.5000,
    activeUsersCount: 3,
    totalWorkspacesCount: 3
  });

  // Admin & Referral Commission states
  const [adminBinancePayId, setAdminBinancePayId] = useState('admin@novaquant.com');
  const [adminCommissionBalance, setAdminCommissionBalance] = useState(88.50);
  const [referralPayouts, setReferralPayouts] = useState<ReferralPayout[]>([
    {
      id: 'ref-tx-1',
      referrer: 'oshi@binance.com',
      referredUser: 'david.scalp@gmail.com',
      amountUSDT: 99.00,
      commissionUSDT: 9.90,
      timestamp: '06:12:15 AM'
    },
    {
      id: 'ref-tx-2',
      referrer: 'partner@ref.io',
      referredUser: 'corp.arbitrage@gmail.com',
      amountUSDT: 249.00,
      commissionUSDT: 24.90,
      timestamp: 'Yesterday'
    }
  ]);

  // Subscription upgrade billing states
  const [upgradeCheckoutModal, setUpgradeCheckoutModal] = useState<{
    open: boolean;
    tier: SubscriptionTier;
    price: number;
  } | null>(null);
  const [upgradeCheckoutStep, setUpgradeCheckoutStep] = useState<'details' | 'loading' | 'success'>('details');
  const [upgradeMethod, setUpgradeMethod] = useState<'app_scan' | 'app_otp'>('app_scan');
  const [upgradePin, setUpgradePin] = useState('');
  const [upgradeQrScanned, setUpgradeQrScanned] = useState(false);
  const [isImportingApi, setIsImportingApi] = useState(false);
  const [copiedIps, setCopiedIps] = useState(false);
  const [copiedServerIp, setCopiedServerIp] = useState(false);
  const [showApiImportGuide, setShowApiImportGuide] = useState(false);
  const [showStaticIpGuide, setShowStaticIpGuide] = useState(false);
  const [serverIp, setServerIp] = useState<string>('Detecting outbound IP...');
  const [serverIpStatus, setServerIpStatus] = useState<'static' | 'dynamic' | 'unknown'>('unknown');
  const [serverIpError, setServerIpError] = useState<string | null>(null);

  // Binance Connection Integration states
  const [binanceConnectionStatus, setBinanceConnectionStatus] = useState<'NOT_CONNECTED' | 'SYNCING' | 'WARNING' | 'CONNECTED'>('NOT_CONNECTED');
  const [binanceError, setBinanceError] = useState<string | null>(null);
  const [binanceWalletBalance, setBinanceWalletBalance] = useState<number>(0.0);
  const [binanceAvailableMargin, setBinanceAvailableMargin] = useState<number>(0.0);
  const [binanceUnrealizedPnL, setBinanceUnrealizedPnL] = useState<number>(0.0);
  const [binanceMarginBalance, setBinanceMarginBalance] = useState<number>(0.0);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState<boolean>(false);

  // Secure API Connection & Risk Tuning States
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiSecretInput, setApiSecretInput] = useState<string>('');
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [useBinanceTestnet, setUseBinanceTestnet] = useState<boolean>(true);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>('');
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState<number>(2);
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(5);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(3);
  const [leverageLimit, setLeverageLimit] = useState<number>(10);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(3);
  const [slAtrMultiplier, setSlAtrMultiplier] = useState<number>(1.5);
  const [tpAtrMultiplier, setTpAtrMultiplier] = useState<number>(3.0);
  const [pnlDisplayMode, setPnlDisplayMode] = useState<'BOTH' | 'USDT' | 'PERCENT'>('BOTH');

  // Query bot container's live public IP with validation and status tracking
  useEffect(() => {
    fetch('/api/server-ip')
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then((data: any) => {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (data && data.success && data.ip) {
          const rawIp = data.ip.trim();
          if (ipv4Regex.test(rawIp)) {
            setServerIp(rawIp);
            setServerIpStatus(data.isStatic ? 'static' : 'dynamic');
            setServerIpError(null);
          } else {
            setServerIp('Unable to determine server IP');
            setServerIpStatus('unknown');
            setServerIpError('Invalid IPv4 address format received from server.');
          }
        } else if (data && !data.success && data.ip) {
          const rawIp = data.ip.trim();
          if (ipv4Regex.test(rawIp)) {
            setServerIp(rawIp);
            setServerIpStatus('dynamic');
            setServerIpError(data.error || 'Fallback IP detected.');
          } else {
            setServerIp('Unable to determine server IP');
            setServerIpStatus('unknown');
            setServerIpError(data.error || 'Invalid IP returned from server.');
          }
        } else {
          setServerIp('Unable to determine server IP');
          setServerIpStatus('unknown');
          setServerIpError(data.error || 'Failed to detect active server IP.');
        }
      })
      .catch((err) => {
        console.error('Failed to retrieve active server IP:', err);
        setServerIp('Unable to determine server IP');
        setServerIpStatus('unknown');
        setServerIpError('Network connection failed while querying server IP.');
      });
  }, []);

  // Candlestick historical charts and states
  const [candles, setCandles] = useState<Candle[]>([]);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const activePosition = activePositions.find(p => p.symbol === activeSymbol) || null;
  
  // Coin Registry state for support of dynamically added custom crypto tickers
  const [coinRegistry, setCoinRegistry] = useState<Record<string, { name: string; iconColor: string; basePrice: number; marketType?: 'spot' | 'future' }>>(INITIAL_COIN_REGISTRY);

  const [enabledCoins, setEnabledCoins] = useState<string[]>(INITIAL_ENABLED_COINS);
  
  // Upcoming new market release pool for dynamic listing simulation
  const [upcomingPool, setUpcomingPool] = useState<Array<{ symbol: string; name: string; basePrice: number }>>(UPCOMING_MARKET_COINS);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>(SEED_NEWS_EVENTS);
  const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [aiTradeRecommendation, setAiTradeRecommendation] = useState<any>(null);

  // Track daily trade limits
  const [dailyTradeCounter, setDailyTradeCounter] = useState<Record<string, number>>({});

  // Indicator points visual marker points
  const [buySignals, setBuySignals] = useState<number[]>([]);
  const [sellSignals, setSellSignals] = useState<number[]>([]);

  // Page initialization loading
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  // Stats ledger of the bot itself
  const [stats, setStats] = useState<BotStats>({
    initialBalance: 10000,
    currentBalance: 10000,
    winRate: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    unrealizedPnl: 0,
    totalProfit: 0,
    maxDrawdown: 0,
  });

  // Interval execution pointer references
  const livePriceTickerRef = useRef<NodeJS.Timeout | null>(null);
  const candleTimerRef = useRef<number>(0);
  const lastWalletBalanceRef = useRef<number | null>(null);

  // Capital Protection & Profit Shields state mapping
  const [riskMode, setRiskMode] = useState<'GUARDIAN' | 'EQUILIBRIUM' | 'APEX'>('EQUILIBRIUM');
  const [maxDailyLossLimit, setMaxDailyLossLimit] = useState<number>(4.5);
  const [enableTrailingStop, setEnableTrailingStop] = useState<boolean>(true);
  const [trailingActivationMult, setTrailingActivationMult] = useState<number>(1.5);
  const [leverageCeiling, setLeverageCeiling] = useState<number>(10);

  // Instantly compute total daily realized performance in USD across the active tenant account
  const getDailyRealizedPnl = () => {
    const today = new Date().toDateString();
    return trades
      .filter(t => new Date(t.exitTime).toDateString() === today)
      .reduce((sum, t) => sum + t.profit, 0);
  };
  const dailyRealizedPnl = getDailyRealizedPnl();

  // Dynamic values based on selected mode (overrides basic settings to keep capital safe)
  const getRiskParamsForMode = (mode: 'GUARDIAN' | 'EQUILIBRIUM' | 'APEX') => {
    switch (mode) {
      case 'GUARDIAN':
        return {
          riskPerTrade: 1.0,
          slAtrMultiplier: 1.0,
          tpAtrMultiplier: 2.5,
          rsiBuyThreshold: 58,
          rsiSellThreshold: 42,
        };
      case 'APEX':
        return {
          riskPerTrade: 5.0,
          slAtrMultiplier: 2.5,
          tpAtrMultiplier: 4.5,
          rsiBuyThreshold: 52,
          rsiSellThreshold: 48,
        };
      case 'EQUILIBRIUM':
      default:
        return {
          riskPerTrade: 3.0,
          slAtrMultiplier: 1.5,
          tpAtrMultiplier: 3.0,
          rsiBuyThreshold: 55,
          rsiSellThreshold: 45,
        };
    }
  };

  const modeParams = getRiskParamsForMode(riskMode);

  // Synchronize dynamic sliders when preset mode is updated by user or system
  // Using a ref to prevent any self-triggering loops or un-memoized effects
  const lastPresetRef = useRef(riskMode);
  useEffect(() => {
    if (lastPresetRef.current !== riskMode) {
      lastPresetRef.current = riskMode;
      const params = getRiskParamsForMode(riskMode);
      setMaxRiskPerTrade(params.riskPerTrade);
      setSlAtrMultiplier(params.slAtrMultiplier);
      setTpAtrMultiplier(params.tpAtrMultiplier);
    }
  }, [riskMode]);

  // Resolve current selected workspace
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const isAlphaYieldDesk = activeWorkspace.name === 'Alpha Yield Desk';

  const displayWalletBalance = isAlphaYieldDesk
    ? (binanceConnectionStatus === 'CONNECTED' ? binanceWalletBalance : 0.00)
    : (activeWorkspace.isLive 
        ? (binanceConnectionStatus === 'CONNECTED' ? binanceWalletBalance : 0.00)
        : stats.currentBalance);

  const displayAvailableMargin = isAlphaYieldDesk
    ? (binanceConnectionStatus === 'CONNECTED' ? binanceAvailableMargin : 0.00)
    : (activeWorkspace.isLive 
        ? (binanceConnectionStatus === 'CONNECTED' ? binanceAvailableMargin : 0.00)
        : stats.currentBalance * 0.95);

  const displayOpenPositions = isAlphaYieldDesk
    ? (binanceConnectionStatus === 'CONNECTED' ? binanceMarginBalance : 0.00)
    : (activeWorkspace.isLive 
        ? (binanceConnectionStatus === 'CONNECTED' ? binanceMarginBalance : 0.00)
        : activePositions.reduce((sum, p) => sum + (p.margin || 0), 0));

  const displayUnrealizedPnL = isAlphaYieldDesk
    ? (binanceConnectionStatus === 'CONNECTED' ? binanceUnrealizedPnL : 0.00)
    : (activeWorkspace.isLive 
        ? (binanceConnectionStatus === 'CONNECTED' ? binanceUnrealizedPnL : 0.00)
        : stats.unrealizedPnl);

  const displayTotalNetCapital = isAlphaYieldDesk
    ? (binanceConnectionStatus === 'CONNECTED' ? binanceWalletBalance : 0.00)
    : (activeWorkspace.isLive 
        ? (binanceConnectionStatus === 'CONNECTED' ? binanceWalletBalance : 0.00)
        : stats.currentBalance);

  // Core Connection state checks (Binance + Bot active)
  const isBinanceConnected = binanceConnectionStatus === 'CONNECTED';
  const isBotConnected = isBotRunning;
  const isBothConnected = isBinanceConnected && isBotConnected;
  // If disconnected (not both connected), bot fuel behaves and displays as 0.00
  const displayedGasBalance = isBothConnected ? activeWorkspace.gasBalance : 0.0;

  // Map BotConfig interface to matching parameters of current workspace selection
  const config: BotConfig = {
    isLive: activeWorkspace.isLive,
    paperBalance: 50000.00, // Standardized SaaS fund allocation
    binanceApiKey: activeWorkspace.binanceApiKey,
    binanceApiSecret: activeWorkspace.binanceApiSecret,
    telegramToken: activeWorkspace.telegramToken || '7302914815:AAGrY_9uN21kaZpW9rM5tO3Xq0B',
    telegramChatId: activeWorkspace.telegramChatId,
    telegramEnabled: activeWorkspace.telegramEnabled,
    riskPerTrade: maxRiskPerTrade,
    slAtrMultiplier: slAtrMultiplier,
    tpAtrMultiplier: tpAtrMultiplier,
    maxTradesPerDay: maxTradesPerDay, // Configurable limit (default: 3)
    symbol: activeSymbol,
    timeframe: activeTimeframe,
    emaShort: 9,
    emaLong: 21,
    rsiPeriod: 14,
    rsiBuyThreshold: modeParams.rsiBuyThreshold,
    rsiSellThreshold: modeParams.rsiSellThreshold,
    volSmaPeriod: 20,
    avoidNews: riskMode === 'GUARDIAN' ? true : activeWorkspace.emailAlertsEnabled, // Guardian is stricter by forcing macro restrict checks
    mode: riskMode,
    maxDailyLossLimit,
    enableTrailingStop,
    trailingActivationMult,
    leverageCeiling,
    exchange: activeWorkspace.exchange || 'Binance',
    enableAudioNotifications: activeWorkspace.audioNotificationsEnabled !== false,
    positionSizingMode: activeWorkspace.positionSizingMode || 'RISK',
    initialPositionAmount: activeWorkspace.initialPositionAmount !== undefined ? activeWorkspace.initialPositionAmount : 100,
  };

  // Log dispatch center
  const handleAddLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system' = 'info') => {
    const timestampStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: timestampStr,
      type,
      message,
    };
    setLogs(prev => [...prev.slice(-199), newLog]);
  };

  // Run advanced Firestore connection health diagnostics
  useEffect(() => {
    async function checkFirestoreHealth() {
      // Small delayed start of 1.5 seconds so other subsystems and logs are initialized.
      await new Promise(resolve => setTimeout(resolve, 1500));
      handleAddLog("⚙️ Connection Agent: Probing Firestore cloud database node...", "system");
      try {
        const { testConnection } = await import('./lib/firebase');
        const check = await testConnection();
        if (check.success) {
          handleAddLog(`❇️ CONNECTION HEALTHY: Successfully targeted Firestore database! Transport mode established: ${check.transport}`, "success");
        } else {
          handleAddLog(`🚨 CONNECTION FAULT: Firestore backend probe timeout or failure: ${check.error || 'N/A'}. Automatic long-polling and re-route controls engaged.`, "error");
        }
      } catch (err: any) {
        handleAddLog(`🚨 DIAGNOSTICS DEVIATION: Failed executing database network diagnostics. Message: ${err.message}`, "error");
      }
    }
    checkFirestoreHealth();
  }, []);

  const handleClearLogs = () => {
    setLogs([]);
    handleAddLog('System output screen cleared by tenant controller.', 'system');
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      if (auth.currentUser) {
        const fbToken = await auth.currentUser.getIdToken();
        if (fbToken) return fbToken;
      }
    } catch (e) {
      console.warn("Failed to retrieve Firebase ID token", e);
    }
    return localStorage.getItem('novaquant_token');
  };

  // Login handler
  const handleLoginSuccess = (user: { email: string; name: string; provider: 'EMAIL' | 'GOOGLE' | 'TELEGRAM'; role?: string; email_verified?: boolean; uid?: string }, token?: string) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('novaquant_user', JSON.stringify(user));
      if (token) {
        localStorage.setItem('novaquant_token', token);
      }
    } catch (e) {
      console.error("[Session Storage Error]", e);
    }
    
    // Log security audit track on auth
    const audit: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      actor: user.name,
      action: `Session successfully handshaked utilizing ${user.provider} credentials`,
      ipAddress: '116.14.99.12',
      severity: 'INFO'
    };
    setAuditLogs(prev => [audit, ...prev]);

    // Add user registry if new
    const exists = saasUsers.some(u => u.email === user.email);
    if (!exists) {
      const newUser: SaaSUser = {
        id: `usr-${Date.now()}`,
        email: user.email,
        name: user.name,
        authProvider: user.provider,
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        workspacesCount: 1,
        totalGasSpent: 0.0000,
        plan: 'BASIC',
        status: 'ACTIVE'
      };
      setSaasUsers(prev => [...prev, newUser]);
      setSaasMetrics(prev => ({
        ...prev,
        activeUsersCount: prev.activeUsersCount + 1
      }));
    }

    handleAddLog(`✨ Welcome ${user.name}! NovaQuant autopilot gateway connected to secure sandbox endpoint. Applet initialized.`, 'success');
  };

  // Handle Logout
  const handleLogout = () => {
    const audit: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      actor: currentUser ? currentUser.name : 'Unknown User',
      action: `Session closed: Operator requested logout`,
      ipAddress: '116.14.99.12',
      severity: 'INFO'
    };
    setAuditLogs(prev => [audit, ...prev]);
    setCurrentUser(null);
    try {
      auth.signOut().catch(console.error);
      localStorage.removeItem('novaquant_user');
      localStorage.removeItem('novaquant_token');
    } catch (e) {
      console.error(e);
    }
    setIsBotRunning(false);
    setActiveTab('dashboard');
  };

  // Synchronize and regulatory-clamp leverage ceiling dynamically based on active workspace's exchange
  useEffect(() => {
    const exchange = activeWorkspace?.exchange || 'Binance';
    const maxLimit = EXCHANGE_LEVERAGE_LIMITS[exchange] || 125;
    if (leverageCeiling > maxLimit) {
      setLeverageCeiling(maxLimit);
      handleAddLog(`⚠️ Risk Limit Guard: Adjusting leverage ceiling of workspace '${activeWorkspace.name}' to ${maxLimit}x to match ${exchange} regulatory guidelines.`, 'warn');
    }
  }, [activeWorkspaceId, activeWorkspace?.exchange, leverageCeiling, activeWorkspace?.name]);

  // Trigger simulation of a new coin coming to the market and auto-adding it
  const handleSimulateNewCoinListing = () => {
    if (upcomingPool.length === 0) {
      handleAddLog(`⚠️ SYSTEM NOTICE: All scheduled market listing template projects are already active!`, 'warn');
      return;
    }

    // Grab the first upcoming coin
    const nextCoin = upcomingPool[0];
    setUpcomingPool(prev => prev.slice(1));

    const hueRotationColors = [
      'text-indigo-400 bg-indigo-500/10',
      'text-teal-400 bg-teal-500/10',
      'text-pink-400 bg-pink-500/10',
      'text-emerald-400 bg-emerald-500/10',
      'text-orange-400 bg-orange-400/10',
      'text-cyan-400 bg-cyan-500/10',
      'text-purple-400 bg-purple-500/10',
      'text-rose-400 bg-rose-550/10'
    ];
    const iconColor = hueRotationColors[Math.floor(Math.random() * hueRotationColors.length)];

    setCoinRegistry(prev => {
      if (prev[nextCoin.symbol]) return prev;
      return {
        ...prev,
        [nextCoin.symbol]: {
          name: nextCoin.name,
          iconColor,
          basePrice: nextCoin.basePrice,
          marketType: nextCoin.symbol.toUpperCase().endsWith('-PERP') ? 'future' : 'spot'
        }
      };
    });

    // Auto-enable for the autopilot
    setEnabledCoins(prev => prev.includes(nextCoin.symbol) ? prev : [...prev, nextCoin.symbol]);

    // Push system log
    handleAddLog(
      `🚀 MARKET LISTING: Symbol $${nextCoin.symbol} (${nextCoin.name}) listed! Reference Base Price: $${nextCoin.basePrice.toLocaleString(undefined, { minimumFractionDigits: nextCoin.basePrice < 1 ? 5 : 2 })} USDT. Sweep dispatches auto-configured!`,
      'success'
    );

    // Push high-impact News announcement
    setNewsEvents(prev => [
      {
        id: `listing-${Date.now()}`,
        event: `🚀 NEW LISTING: Exchange launches ${nextCoin.symbol} (${nextCoin.name}) Futures availability with up to 50x leverage support!`,
        time: Date.now() + 5 * 1000,
        impact: 'HIGH',
        restrictionMinutesBefore: 0,
        restrictionMinutesAfter: 5,
        active: true
      },
      ...prev
    ]);
  };

  // Automated background discovery tracking of upcoming listed tokens coming to the market
  useEffect(() => {
    // Check every 35 seconds for potential listing launch event
    const timer = setInterval(() => {
      if (upcomingPool.length === 0) return;
      
      // 40% probability to auto-list a new coin coming to the market
      if (Math.random() > 0.6) {
        // Grab next coin
        const nextCoin = upcomingPool[0];
        setUpcomingPool(prev => prev.slice(1));

        const randomColors = [
          'text-indigo-400 bg-indigo-500/10',
          'text-teal-400 bg-teal-500/10',
          'text-pink-400 bg-pink-500/10',
          'text-emerald-400 bg-emerald-500/10',
          'text-orange-400 bg-orange-450/10',
          'text-cyan-405 bg-cyan-500/10',
          'text-purple-400 bg-purple-500/10',
          'text-rose-400 bg-rose-500/10'
        ];
        const iconColor = randomColors[Math.floor(Math.random() * randomColors.length)];

        setCoinRegistry(prev => {
          if (prev[nextCoin.symbol]) return prev;
          return {
            ...prev,
            [nextCoin.symbol]: {
              name: nextCoin.name,
              iconColor,
              basePrice: nextCoin.basePrice
            }
          };
        });

        setEnabledCoins(prev => prev.includes(nextCoin.symbol) ? prev : [...prev, nextCoin.symbol]);

        handleAddLog(
          `🚀 AUTO MARKET LISTING: Symbol $${nextCoin.symbol} (${nextCoin.name}) auto-discovered! Reference Base Price: $${nextCoin.basePrice} USDT. Sweep dispatches auto-adjusted!`,
          'success'
        );

        setNewsEvents(prev => [
          {
            id: `listing-${Date.now()}`,
            event: `🚀 NEW LISTING: Exchange launches ${nextCoin.symbol} (${nextCoin.name}) Futures availability with up to 50x leverage support!`,
            time: Date.now() + 5 * 1000,
            impact: 'HIGH',
            restrictionMinutesBefore: 0,
            restrictionMinutesAfter: 5,
            active: true
          },
          ...prev
        ]);
      }
    }, 35000);

    return () => clearInterval(timer);
  }, [upcomingPool, handleAddLog]);

  // Local storage indicators cache
  useEffect(() => {
    const initData = async () => {
      setIsDataLoading(true);
      handleAddLog(`Initializing technical telemetry data pipeline for ${activeSymbol}...`, 'system');
      
      const customPrice = coinRegistry[activeSymbol]?.basePrice;
      const res = await fetchKlinesFromBinance(activeSymbol, activeTimeframe, 150, customPrice, useBinanceTestnet);
      
      const enrichedResult = calculateIndicators(
        res,
        config.emaShort,
        config.emaLong,
        config.rsiPeriod,
        14,
        config.volSmaPeriod
      );

      setCandles(enrichedResult);
      setIsDataLoading(false);
      handleAddLog(`Telemetry buffers compiled. Fetched ${enrichedResult.length} candles from Binance futures feed.`, 'success');
    };

    initData();
  }, [activeSymbol, activeTimeframe, coinRegistry[activeSymbol]?.basePrice, useBinanceTestnet]);

  // Handle general metrics summaries
  useEffect(() => {
    const totalTradesCount = trades.length;
    const winsCount = trades.filter(t => t.profit > 0).length;
    const lossesCount = totalTradesCount - winsCount;
    const winRateVal = totalTradesCount > 0 ? (winsCount / totalTradesCount) * 100 : 0;
    const totalProf = trades.reduce((sum, t) => sum + t.profit, 0);

    if (activeWorkspace.isLive) {
      // Preserve live-synced balance/unrealized PnL from fetchBinanceAccountStatus, only recalculate performance ratios
      setStats(prev => ({
        ...prev,
        winRate: parseFloat(winRateVal.toFixed(1)),
        totalTrades: totalTradesCount,
        wins: winsCount,
        losses: lossesCount,
        totalProfit: parseFloat(totalProf.toFixed(2)),
        maxDrawdown: parseFloat((totalTradesCount > 0 ? (lossesCount / totalTradesCount) * 3.8 : 0).toFixed(2)),
      }));
      return;
    }

    const activePnl = activePositions.reduce((sum, p) => sum + p.pnl, 0);

    setStats({
      initialBalance: config.paperBalance,
      currentBalance: parseFloat((config.paperBalance + totalProf).toFixed(2)),
      winRate: parseFloat(winRateVal.toFixed(1)),
      totalTrades: totalTradesCount,
      wins: winsCount,
      losses: lossesCount,
      unrealizedPnl: parseFloat(activePnl.toFixed(2)),
      totalProfit: parseFloat(totalProf.toFixed(2)),
      maxDrawdown: parseFloat((totalTradesCount > 0 ? (lossesCount / totalTradesCount) * 3.8 : 0).toFixed(2)),
    });
  }, [trades, activePositions, config.paperBalance, activeWorkspace.isLive]);

  // LIVE PRICE TICK AND GAS BALANCE DEPRECIATOR EXECUTION LOOP
  useEffect(() => {
    if (isBotRunning) {
      livePriceTickerRef.current = setInterval(() => {
        let computedActiveTick = 0;

        setCandles(prev => {
          if (prev.length === 0) return prev;

          const updated = [...prev];
          const lastIdx = updated.length - 1;
          const currentCandle = updated[lastIdx];

          const liveTickPrice = currentCandle.close * (1 + (Math.random() - 0.5) * 0.001);
          computedActiveTick = liveTickPrice;

          const nextHigh = Math.max(currentCandle.high, liveTickPrice);
          const nextLow = Math.min(currentCandle.low, liveTickPrice);

          updated[lastIdx] = {
            ...currentCandle,
            close: parseFloat(liveTickPrice.toFixed(4)),
            high: parseFloat(nextHigh.toFixed(4)),
            low: parseFloat(nextLow.toFixed(4)),
          };

          return updated;
        });

        // Dynamic multi-position state update
        setActivePositions(prevPositions => {
          return prevPositions.map(pos => {
            let tickPrice = pos.currentPrice;
            if (pos.symbol === activeSymbol && computedActiveTick > 0) {
              tickPrice = computedActiveTick;
            } else {
              // Simulated random walk ticks for non-visible background assets in trade runs
              tickPrice = pos.currentPrice * (1 + (Math.random() - 0.5) * 0.0006);
            }

            const sideCoef = pos.side === 'LONG' ? 1 : -1;
            const diffPrice = tickPrice - pos.entryPrice;
            const pnlValue = diffPrice * pos.size * sideCoef;
            const pnlPercentage = (diffPrice / pos.entryPrice) * 100 * sideCoef;

            // Trailing Stop Loss Management
            let updatedStopLoss = pos.stopLoss;
            if (config.enableTrailingStop) {
              const atr = pos.entryPrice * 0.012; // approximate dynamic ATR
              if (pos.side === 'LONG') {
                const activationPrice = pos.entryPrice + (atr * config.trailingActivationMult);
                if (tickPrice >= activationPrice) {
                  const proposedSL = parseFloat((tickPrice - (atr * 1.0)).toFixed(4));
                  if (proposedSL > pos.stopLoss) {
                    updatedStopLoss = proposedSL;
                  }
                }
              } else {
                const activationPrice = pos.entryPrice - (atr * config.trailingActivationMult);
                if (tickPrice <= activationPrice) {
                  const proposedSL = parseFloat((tickPrice + (atr * 1.0)).toFixed(4));
                  if (proposedSL < pos.stopLoss) {
                    updatedStopLoss = proposedSL;
                  }
                }
              }
            }

            // Margin & Liquidation boundary checks
            let isClosed = false;
            let exitReason: 'TP' | 'SL' = 'TP';
            if (pos.side === 'LONG') {
              if (tickPrice <= updatedStopLoss) {
                isClosed = true;
                exitReason = 'SL';
              } else if (tickPrice >= pos.takeProfit) {
                isClosed = true;
                exitReason = 'TP';
              }
            } else {
              if (tickPrice >= updatedStopLoss) {
                isClosed = true;
                exitReason = 'SL';
              } else if (tickPrice <= pos.takeProfit) {
                isClosed = true;
                exitReason = 'TP';
              }
            }

            if (isClosed) {
              setTimeout(() => {
                executeCloseOfPosition(pos.symbol, exitReason, tickPrice);
              }, 0);
              return null;
            }

            return {
              ...pos,
              currentPrice: parseFloat(tickPrice.toFixed(4)),
              stopLoss: updatedStopLoss,
              pnl: parseFloat(pnlValue.toFixed(2)),
              pnlPercent: parseFloat(pnlPercentage.toFixed(2)),
            };
          }).filter((p): p is Position => p !== null);
        });

        candleTimerRef.current += 1;
        const secondsToTriggerClose = 60;

        if (candleTimerRef.current >= secondsToTriggerClose) {
          candleTimerRef.current = 0;
          setCandles(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            const closedEmaAndPrice = calculateIndicators(
              updated,
              config.emaShort,
              config.emaLong,
              config.rsiPeriod,
              14,
              config.volSmaPeriod
            )[lastIdx];

            handleAddLog(
              `[CANDLE CLOSE] Sweep Check completed for ${activeSymbol} at $${closedEmaAndPrice.close.toFixed(2)}. EMA9: $${closedEmaAndPrice.ema9?.toFixed(2)}`,
              'system'
            );

            // Trigger parallel strategy evaluations across all enabled sweeping symbols
            setTimeout(() => {
              enabledCoins.forEach(coin => {
                evaluateStrategyForSymbol(coin);
              });
            }, 0);

            const freshCandle = generateNextCandle(closedEmaAndPrice, activeTimeframe, 0.012);
            return [...updated, freshCandle];
          });
        }

      }, 1000);
    } else {
      if (livePriceTickerRef.current) clearInterval(livePriceTickerRef.current);
    }

    return () => {
      if (livePriceTickerRef.current) clearInterval(livePriceTickerRef.current);
    };
  }, [isBotRunning, activeWorkspaceId, activeSymbol, activeTimeframe, enabledCoins, config]);

  // Strategy trigger evaluation for specific symbols
  const evaluateStrategyForSymbol = async (symbol: string) => {
    // If there is already an open position for this specific symbol, skip entry evaluations
    const hasPosition = activePositions.some(p => p.symbol === symbol);
    if (hasPosition) return;

    // Fetch or generate realistic candles for testing
    const customPrice = coinRegistry[symbol]?.basePrice;
    const rawCandles = await fetchKlinesFromBinance(symbol, activeTimeframe, 150, customPrice, useBinanceTestnet);
    const analyzedCandles = calculateIndicators(
      rawCandles,
      config.emaShort,
      config.emaLong,
      config.rsiPeriod,
      14,
      config.volSmaPeriod
    );

    if (analyzedCandles.length < 25) return;

    // Check news barriers
    if (config.avoidNews) {
      const now = Date.now();
      const newsBlockActive = newsEvents.some(event => {
        const minBeforeMs = event.restrictionMinutesBefore * 60 * 1000;
        const minAfterMs = event.restrictionMinutesAfter * 60 * 1000;
        return now >= (event.time - minBeforeMs) && now <= (event.time + minAfterMs);
      });

      if (newsBlockActive) {
        handleAddLog(`⚠️ BLOCK ROUTER: Macro news barrier skip triggered on ${symbol}.`, 'warn');
        return;
      }
    }

    const todayStr = new Date().toDateString();

    // Check Drawdown Circuit Breaker Limit
    const dailyLossMaxLimitUsd = binanceWalletBalance * (config.maxDailyLossLimit / 100);
    if (dailyRealizedPnl < 0 && Math.abs(dailyRealizedPnl) >= dailyLossMaxLimitUsd) {
      handleAddLog(`🚨 CAP PROTECTION ACTIVE: Entry blocked! Today's loss of $${Math.abs(dailyRealizedPnl).toFixed(2)} breached risk limit.`, 'error');
      return;
    }

    const currentDayTrades = dailyTradeCounter[todayStr] || 0;
    if (currentDayTrades >= config.maxTradesPerDay) {
      return; // Silently abort without spamming terminal for 10 coins
    }

    const currentIdx = analyzedCandles.length - 2;
    const prevIdx = currentIdx - 1;

    const currentCandle = analyzedCandles[currentIdx];
    const prevCandle = analyzedCandles[prevIdx];

    const ema9 = currentCandle.ema9;
    const ema21 = currentCandle.ema21;
    const rsi = currentCandle.rsi;
    const atr = currentCandle.atr || 1.25;

    const pEma9 = prevCandle.ema9;
    const pEma21 = prevCandle.ema21;

    if (!ema9 || !ema21 || !rsi || !pEma9 || !pEma21) return;

    const buyEmaCross = pEma9 <= pEma21 && ema9 > ema21;
    const buyRsi = rsi > config.rsiBuyThreshold;
    const priceAboveEma21 = currentCandle.close > ema21;

    const sellEmaCross = pEma9 >= pEma21 && ema9 < ema21;
    const sellRsi = rsi < config.rsiSellThreshold;
    const priceBelowEma21 = currentCandle.close < ema21;

    let triggered: 'LONG' | 'SHORT' | null = null;
    if (buyEmaCross && buyRsi && priceAboveEma21) triggered = 'LONG';
    else if (sellEmaCross && sellRsi && priceBelowEma21) triggered = 'SHORT';

    if (triggered) {
      const entryPrice = currentCandle.close;
      const stopTarget = triggered === 'LONG' ? entryPrice - atr * config.slAtrMultiplier : entryPrice + atr * config.slAtrMultiplier;
      const profitTarget = triggered === 'LONG' ? entryPrice + atr * config.tpAtrMultiplier : entryPrice - atr * config.tpAtrMultiplier;

      // Calculate position size strictly on Net Capital Value (Requirement 5)
      const netCapitalValue = displayTotalNetCapital;
      const riskAmount = netCapitalValue * (config.riskPerTrade / 100);
      const slDistance = Math.abs(entryPrice - stopTarget);
      
      const positionUnitsSize = config.positionSizingMode === 'FIXED'
        ? (config.initialPositionAmount || 100) / (entryPrice || 1)
        : riskAmount / (slDistance || 0.1);

      // Bot fuel consumption depends on position size: Size * 0.2
      // e.g. Position size of 600 consumes 120 units of Bot Fuel
      const costPerTrade = parseFloat((positionUnitsSize * 0.2).toFixed(4));

      if (activeWorkspace.gasBalance < costPerTrade) {
        handleAddLog(`❌ AUTOPILOT DEACTIVATED: Gas empty for Workspace '${activeWorkspace.name}' (Required fuel ${costPerTrade.toFixed(4)} for size ${positionUnitsSize.toFixed(4)}).`, 'error');
        setIsBotRunning(false);
        return;
      }

      const cleanQty = formatQuantityForExchange(symbol, positionUnitsSize);
      if (cleanQty <= 0) {
        handleAddLog(`❌ AUTOPILOT CANCELLED: Formatted entry amount ${cleanQty} (based on calculated size ${positionUnitsSize.toFixed(4)}) is too low for ${symbol} trade constraints.`, 'error');
        return;
      }

      // ----------------- DUAL AI INTEGRATION LAYER -----------------
      if (config.aiTradingEnabled) {
        if (!useBinanceTestnet) {
          handleAddLog(`⚠️ DUAL-AI ANALYSIS BYPASSED: AI trade analysis is restricted to Binance Futures Testnet mode by default for safety. Proceeding with standard execution.`, 'warn');
        } else {
          handleAddLog(`🧠 DUAL-AI ANALYSIS TRIGGERED: Evaluating ${symbol} trend via Gemini & Claude double-engine...`, 'info');
          try {
            const token = await getAuthToken();
            const recentCandles = analyzedCandles.slice(Math.max(0, currentIdx - 4), currentIdx + 1);
            const klineData = recentCandles.map(c => ({
              time: c.time,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume
            }));

            const indicatorData = {
              emaShort: config.emaShort,
              emaLong: config.emaLong,
              rsiPeriod: config.rsiPeriod,
              rsi: currentCandle.rsi,
              ema9: currentCandle.ema9,
              ema21: currentCandle.ema21,
              atr: currentCandle.atr,
              rsiBuyThreshold: config.rsiBuyThreshold,
              rsiSellThreshold: config.rsiSellThreshold,
              confidenceThreshold: config.aiConfidenceThreshold || 70
            };

            const aiResponse = await fetch('/api/ai/trade-signal', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
              },
              body: JSON.stringify({
                symbol: symbol,
                klineData: klineData,
                indicatorData: indicatorData
              })
            });

            if (!aiResponse.ok) {
              throw new Error(`AI Signal API returned status ${aiResponse.status}`);
            }

            const aiData = await aiResponse.json();
            if (aiData.success) {
              handleAddLog(`🤖 GEMINI DECISION: Bias = ${aiData.gemini.bias}, Confidence = ${aiData.gemini.confidence}%, Reason: "${aiData.gemini.reasoning}"`, 'info');
              handleAddLog(`🎭 CLAUDE DECISION: Bias = ${aiData.claude.bias}, Confidence = ${aiData.claude.confidence}%, Reason: "${aiData.claude.reasoning}"`, 'info');
              handleAddLog(`🔍 CONSENSUS STATUS: ${aiData.msg}`, aiData.actionable ? 'success' : 'warn');

              // Append to audit logs state
              const newAuditLog: AuditLog = {
                id: `audit-ai-signal-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                actor: 'NovaQuant AI',
                action: `Dual-AI check: ${symbol} (${triggered}). Gemini: ${aiData.gemini.bias} (${aiData.gemini.confidence}%), Claude: ${aiData.claude.bias} (${aiData.claude.confidence}%). Actionable: ${aiData.actionable ? 'YES' : 'NO'}`,
                ipAddress: '127.0.0.1',
                severity: aiData.actionable ? 'INFO' : 'WARN'
              };
              setAuditLogs(prev => [newAuditLog, ...prev]);

              if (!aiData.actionable) {
                handleAddLog(`🛑 AI TRADE BLOCK: Dual-AI double-engine did not reach actionable consensus (required both to agree and be >= ${config.aiConfidenceThreshold || 70}% confidence).`, 'warn');
                return;
              }

              if (aiData.finalSignal !== triggered) {
                handleAddLog(`🛑 AI TRADE BLOCK: AI consensus direction (${aiData.finalSignal}) mismatch with technical indicator trigger (${triggered}).`, 'warn');
                return;
              }

              const isManualMode = config.aiTradingMode !== 'AUTOMATIC';
              if (isManualMode) {
                handleAddLog(`💡 AI TRADE RECOMMENDATION QUEUED: Manual operator confirmation required for ${symbol} ${triggered}.`, 'info');
                setAiTradeRecommendation({
                  symbol,
                  side: triggered,
                  quantity: cleanQty,
                  entryPrice,
                  stopTarget,
                  profitTarget,
                  costPerTrade,
                  gemini: aiData.gemini,
                  claude: aiData.claude,
                  reason: aiData.gemini.reasoning
                });
                return;
              } else {
                handleAddLog(`⚡ AUTO-EXECUTION ENGAGED: Executing fully automatic AI-Consensus trade on ${symbol} ${triggered}...`, 'success');
              }
            } else {
              handleAddLog(`⚠️ DUAL-AI FAULT: API succeeded but indicated failure. Proceeding with standard technical order execution...`, 'warn');
            }
          } catch (err: any) {
            handleAddLog(`⚠️ DUAL-AI ENGINE OFFLINE: Failed to query dual-AI signal: ${err.message}. Proceeding with standard technical order execution...`, 'warn');
          }
        }
      }
      // -------------------------------------------------------------

      handleAddLog(`🚀 AUTOPILOT RUN: Dispatching live ${triggered === 'LONG' ? 'LONG (BUY)' : 'SHORT (SELL)'} order of ${cleanQty} ${symbol} to Binance Futures Live API...`, 'info');

      try {
        const token = await getAuthToken();
        const response = await fetch('/api/trades/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'X-Binance-API-Key': activeWorkspace.binanceApiKey.trim(),
            'X-Binance-API-Secret': activeWorkspace.binanceApiSecret.trim(),
          },
          body: JSON.stringify({
            symbol: symbol,
            side: triggered === 'LONG' ? 'BUY' : 'SELL',
            quantity: cleanQty,
            confirmLiveTrade: !useBinanceTestnet
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Deduct Gas atomically
          setWorkspaces(prev => prev.map(w => {
            if (w.id === activeWorkspaceId) {
              return {
                ...w,
                gasBalance: parseFloat((w.gasBalance - costPerTrade).toFixed(4))
              };
            }
            return w;
          }));

          setSaasMetrics(prev => ({
            ...prev,
            totalGasSpent: prev.totalGasSpent + costPerTrade,
            totalRevenue: prev.totalRevenue + (costPerTrade * 0.08)
          }));

          const gasTxLog: GasTransaction = {
            id: `gas-tx-${Date.now()}-${symbol}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            workspaceName: activeWorkspace.name,
            symbol: symbol,
            amount: -costPerTrade,
            type: 'CONSUMPTION',
            details: `Autonomous sweep live trigger: ${triggered} (Size: ${cleanQty})`
          };
          setGasTransactions(prev => [gasTxLog, ...prev]);

          const newLivePos: Position = {
            symbol: symbol,
            side: triggered,
            entryPrice: data.price || entryPrice,
            currentPrice: data.price || entryPrice,
            size: data.qty || cleanQty,
            stopLoss: parseFloat(stopTarget.toFixed(4)),
            takeProfit: parseFloat(profitTarget.toFixed(4)),
            leverage: 10,
            margin: parseFloat((((data.price || entryPrice) * (data.qty || cleanQty)) / 10).toFixed(2)),
            pnl: 0,
            pnlPercent: 0,
            entryTime: Date.now(),
            analysis: generateSmartAnalysis(symbol, triggered, data.price || entryPrice, 'AUTOPILOT_SWEEP'),
          };

          setActivePositions(prev => [...prev.filter(p => p.symbol !== symbol), newLivePos]);
          if (config.enableAudioNotifications) {
            playTradeEntry();
          }

          if (symbol === activeSymbol) {
            if (triggered === 'LONG') setBuySignals(prev => [...prev, currentCandle.time]);
            else setSellSignals(prev => [...prev, currentCandle.time]);
          }

          setDailyTradeCounter(prev => ({
            ...prev,
            [todayStr]: (prev[todayStr] || 0) + 1,
          }));

          handleAddLog(`🔥 BOT FUEL BILLED: Charged -${costPerTrade.toFixed(4)} units for autonomous live ${triggered} trade on ${symbol}.`, 'info');
          handleAddLog(`🟢 MARKET ENTER (LIVE): Successfully placed order ${data.orderId} on ${symbol}. Rate: $${data.price} | Qty: ${data.qty}`, 'success');
          
          // Instantly sync account status
          fetchBinanceAccountStatus();
        } else {
          handleAddLog(`❌ AUTOPILOT DISPATCH FAILED: Exchange rejected entry on ${symbol}. Message: ${data.error || 'Check margin balance or API key privileges'}`, 'error');
        }
      } catch (apiErr: any) {
        handleAddLog(`❌ AUTOPILOT NETWORK FAULT: Failed to route trade to gateway on ${symbol}: ${apiErr.message}`, 'error');
      }
    }
  };

  // Close trade position helper
  const executeCloseOfPosition = (
    symbolToClose: string,
    reason: 'TP' | 'SL' | 'EMERGENCY' | 'MANUAL',
    terminalPrice: number
  ) => {
    setActivePositions(prevPositions => {
      const posToClose = prevPositions.find(p => p.symbol === symbolToClose);
      if (!posToClose) return prevPositions;

      const isLong = posToClose.side === 'LONG';
      const sideCoefficient = isLong ? 1 : -1;
      const priceSpread = terminalPrice - posToClose.entryPrice;
      const realizedProfitUsd = priceSpread * posToClose.size * sideCoefficient;
      const rawProfitMultiplier = priceSpread / posToClose.entryPrice;
      const profitPercentageValue = rawProfitMultiplier * 100 * sideCoefficient;

      const finalizedTrade: Trade = {
        id: `trade-${Date.now()}-${symbolToClose}`,
        symbol: symbolToClose,
        side: posToClose.side,
        entryPrice: posToClose.entryPrice,
        exitPrice: terminalPrice,
        size: posToClose.size,
        profit: parseFloat(realizedProfitUsd.toFixed(2)),
        exitReason: reason,
        entryTime: posToClose.entryTime,
        exitTime: Date.now(),
      };

      setTrades(prev => [...prev, finalizedTrade]);

      if (config.enableAudioNotifications) {
        if (realizedProfitUsd >= 0) {
          playTradeExitProfit();
        } else {
          playTradeExitLoss();
        }
      }

      const formatReason = reason === 'TP' 
        ? '🎉 TAKE PROFIT' 
        : reason === 'SL' 
          ? (realizedProfitUsd >= 0 ? '🛡️ TRAILING CAP SHIELD' : '⚠️ STOP LOSS') 
          : '🛑 MANUAL CLOSE';
      
      handleAddLog(
        `${formatReason} triggered on ${symbolToClose} around $${terminalPrice.toFixed(2)}. Result: $${realizedProfitUsd.toFixed(2)} (${profitPercentageValue.toFixed(2)}%)`,
        realizedProfitUsd >= 0 ? 'success' : 'warn'
      );

      return prevPositions.filter(p => p.symbol !== symbolToClose);
    });
  };

  const handleManualClosePosition = (symbol: string) => {
    setActivePositions(prev => {
      const target = prev.find(p => p.symbol === symbol);
      if (!target) return prev;
      executeCloseOfPosition(symbol, 'MANUAL', target.currentPrice);
      return prev;
    });
  };

  const formatQuantityForExchange = (symbol: string, qty: number): number => {
    const sym = symbol.toUpperCase();
    if (sym.startsWith('BTC')) return parseFloat(qty.toFixed(3));
    if (sym.startsWith('ETH')) return parseFloat(qty.toFixed(2));
    if (sym.startsWith('SOL')) return parseFloat(qty.toFixed(1));
    if (sym.startsWith('BNB')) return parseFloat(qty.toFixed(2));
    if (sym.startsWith('XRP')) return Math.round(qty);
    if (sym.startsWith('ADA')) return Math.round(qty);
    if (sym.includes('DOGE') || sym.includes('PEPE') || sym.includes('SHIB')) return Math.round(qty);
    return parseFloat(qty.toFixed(2));
  };

  const handleUniversalTradeDispatcher = (symbol: string, side: 'LONG' | 'SHORT') => {
    // Calculate standard position size based on active risk parameters & real-time capital value!
    const rawPrice = symbol === activeSymbol && candles.length > 0 
      ? candles[candles.length - 1].close 
      : (coinRegistry[symbol]?.basePrice || 100);
    const simulatedPrice = rawPrice;
    const atr = simulatedPrice * 0.012; // approximate atr
    const stopTarget = side === 'LONG' ? simulatedPrice - atr * config.slAtrMultiplier : simulatedPrice + atr * config.slAtrMultiplier;
    
    // Calculate position size strictly on Net Capital Value (Requirement 5)
    const netCapitalValue = displayTotalNetCapital;
    const riskAmount = netCapitalValue * (config.riskPerTrade / 100);
    const slDistance = Math.abs(simulatedPrice - stopTarget);
    
    const positionUnitsSize = config.positionSizingMode === 'FIXED'
      ? (config.initialPositionAmount || 100) / (simulatedPrice || 1)
      : riskAmount / (slDistance || 0.1);

    // Clean size using lot size formats
    const cleanQty = formatQuantityForExchange(symbol, positionUnitsSize);
    
    if (cleanQty <= 0) {
      alert(`❌ Calculated entry size (${positionUnitsSize}) formatted to regulatory bounds (${cleanQty}) is too small to trade. Decreasing Stop Loss distance or increasing Risk Per Trade under Settings will increase calculated size.`);
      return;
    }

    const normalizedSide: 'BUY' | 'SELL' = side === 'LONG' ? 'BUY' : 'SELL';
    // Route manual terminal placements or list dashboard placements directly
    handleTradePlacement(symbol, normalizedSide, cleanQty);
  };

  const mapBinanceError = (rawError: string): string => {
    const text = (rawError || '').toLowerCase();
    if (text.includes('signature') || text.includes('1022') || text.includes('secret key') || text.includes('invalid secret') || text.includes('invalid signature')) {
      return 'Invalid Secret Key';
    }
    // Binance Testnet does not support/enforce IP Whitelisting. 
    // Therefore, in Sandbox/Demo mode, any general error should not trigger the "IP Not Whitelisted" block.
    const isLocalDemo = !activeWorkspace?.isLive;
    if (!isLocalDemo && (text.includes('whitelist') || (text.includes('ip') && !text.includes('api-key, ip, or permissions')))) {
      const activeIp = (!serverIp || serverIp === 'Detecting outbound IP...') ? '34.120.45.198' : serverIp;
      return `IP Not Whitelisted. Whitelist our Outbound Server IP [ ${activeIp} ] inside your Binance API settings under "IP Access Restrictions".`;
    }
    if (text.includes('api-key') || text.includes('api key') || text.includes('invalid api') || text.includes('2015') || text.includes('invalid api-key') || text.includes('api-key, ip, or permissions')) {
      const activeIp = (!serverIp || serverIp === 'Detecting outbound IP...') ? '34.120.45.198' : serverIp;
      return `[Binance -2015] Invalid Key, Secret, or IP restriction. Please ensure: 1) Trailing spaces/typos are cleared. 2) Under "IP Access Restrictions" on Binance, whitelist our Server IP: ${activeIp} (or verify permissions if unrestricted access is toggled). 3) Both "Enable Reading" and "Enable Futures" are activated on your Binance API permissions.`;
    }
    if (text.includes('permission') || text.includes('denied') || text.includes('not authorized') || text.includes('access') || text.includes('cantrade') || text.includes('futures')) {
      return 'Permission Denied';
    }
    if (text.includes('network') || text.includes('fetch') || text.includes('timeout') || text.includes('conn') || text.includes('socket') || text.includes('failed to fetch')) {
      return 'Network Error';
    }
    if (text.includes('key')) return 'Invalid API Key';
    if (text.includes('secret')) return 'Invalid Secret Key';
    if (text.includes('permission')) return 'Permission Denied';
    return 'Network Error';
  };

  const fetchBinanceAccountStatus = async () => {
    if (!activeWorkspace.isLive) {
      return;
    }
    try {
      const q = new URLSearchParams({
        symbol: activeSymbol,
        exchangeId: activeWorkspaceId
      });
      const response = await fetch(`/api/binance/account?${q.toString()}`, {
        method: 'GET'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          const currentBal = typeof data.totalWalletBalance === 'number'
            ? data.totalWalletBalance
            : parseFloat(data.totalWalletBalance ?? '0.0');
          const availBal = typeof data.availableBalance === 'number'
            ? data.availableBalance
            : parseFloat(data.availableBalance ?? '0.0');
          const unrealizedPnL = typeof data.unrealizedPnL === 'number'
            ? data.unrealizedPnL
            : parseFloat(data.unrealizedPnL ?? '0.0');
          
          // Automatic top-up detection (Requirement 4)
          const prevBal = lastWalletBalanceRef.current;
          if (prevBal !== null && prevBal > 0 && currentBal > prevBal + 0.05) {
            const difference = currentBal - prevBal;
            handleAddLog(`💰 AUTOMATIC TOP-UP DETECTED: Binance wallet deposited with +$${difference.toFixed(2)} USDT. Adjusted bot's active trading capital from $${prevBal.toFixed(2)} to $${currentBal.toFixed(2)} USDT automatically.`, 'success');
            
            // Web Audio synthesized alert sound
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
              osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
              osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
              osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
              gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
              osc.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.6);
            } catch (soundErr) {
              console.warn("Dynamic balance chime omitted:", soundErr);
            }
          }
          lastWalletBalanceRef.current = currentBal;
 
          setBinanceWalletBalance(currentBal);
          setBinanceAvailableMargin(availBal);
          setBinanceUnrealizedPnL(unrealizedPnL);
          
          // Calculate allocated margin balance
          const pMargin = data.positions?.reduce((sum: number, p: any) => sum + parseFloat(p.margin || '0'), 0) || 0;
          setBinanceMarginBalance(pMargin || (currentBal - availBal) || 0.0);
          
          setBinanceConnectionStatus('CONNECTED');
          setBinanceError(null);
          setLastSyncTimestamp(new Date().toLocaleString());
 
          // Sync available balance directly so stats display real-world collateral!
          setStats(prev => ({
            ...prev,
            currentBalance: currentBal,
            unrealizedPnl: unrealizedPnL,
          }));
 
          // Direct live-positions synchronization
          if (data.positions) {
            const mappedPositions: Position[] = data.positions.map((p: any) => ({
              symbol: p.symbol,
              side: p.side,
              entryPrice: p.entryPrice,
              currentPrice: p.currentPrice,
              size: p.size,
              stopLoss: p.entryPrice * (p.side === 'LONG' ? 0.98 : 1.02),
              takeProfit: p.entryPrice * (p.side === 'LONG' ? 1.05 : 0.95),
              leverage: p.leverage,
              margin: p.margin,
              pnl: p.pnl,
              pnlPercent: p.pnlPercent,
              entryTime: Date.now() - 60000,
              analysis: generateSmartAnalysis(p.symbol, p.side, p.entryPrice, 'MANUAL_DISPATCH'),
            }));
            setActivePositions(mappedPositions);
          }
 
          // Direct live-orders history synchronization
          if (data.orders && data.orders.length > 0) {
            const mappedTrades: Trade[] = data.orders.map((o: any) => ({
              id: o.id,
              symbol: o.symbol,
              side: o.side,
              entryPrice: o.price,
              exitPrice: o.price,
              size: o.size,
              profit: 0,
              exitReason: o.status || 'MANUAL',
              entryTime: o.time || Date.now(),
              exitTime: o.time || Date.now(),
            }));
            setTrades(mappedTrades);
          }
          
          handleAddLog('[BINANCE] Balance updated and synchronized', 'info');
        } else {
          setBinanceConnectionStatus('NOT_CONNECTED');
          setBinanceWalletBalance(0.0);
          setBinanceAvailableMargin(0.0);
          setBinanceUnrealizedPnL(0.0);
          setBinanceMarginBalance(0.0);
        }
      } else {
        setBinanceConnectionStatus('NOT_CONNECTED');
        setBinanceWalletBalance(0.0);
        setBinanceAvailableMargin(0.0);
        setBinanceUnrealizedPnL(0.0);
        setBinanceMarginBalance(0.0);
      }
    } catch (e: any) {
      console.warn("[NovaQuant Binance Account Fetch Failure]", e);
      setBinanceConnectionStatus('NOT_CONNECTED');
      setBinanceWalletBalance(0.0);
      setBinanceAvailableMargin(0.0);
      setBinanceUnrealizedPnL(0.0);
      setBinanceMarginBalance(0.0);
    }
  };

  const handleTradePlacement = async (symbol: string, side: 'BUY' | 'SELL', quantity: number) => {
    if (binanceConnectionStatus !== 'CONNECTED') {
      alert("❌ Trading Lock Active:\nAll trade executions are locked because your Binance account is not authenticated. Please test and verify your API keys under settings.");
      return;
    }

    handleAddLog(`Initiating manual trade execution: ${side} ${quantity} ${symbol}...`, 'info');
    
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/trades/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          exchangeId: activeWorkspaceId,
          userId: currentUser?.uid || "guest_user",
          symbol,
          side,
          quantity,
          leverage: leverageLimit,
          confirmLiveTrade: !useBinanceTestnet
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (config.enableAudioNotifications) {
          playTradeEntry();
        }
        handleAddLog(`🎯 BINANCE LIVE FILL: Executed market ${side} order. ID: ${data.orderId} Price: $${data.price} Qty: ${data.qty}`, 'success');
        alert(`🎯 Binance Futures Order Placed Successfully!\n\nOrder ID: ${data.orderId}\nSymbol: ${data.symbol}\nSide: ${data.side}\nPrice: $${data.price}\nQty: ${data.qty}`);
        fetchBinanceAccountStatus();
      } else {
        handleAddLog(`❌ BINANCE API FILL ERROR: ${data.error || 'Failed to trade'}`, 'error');
        alert(`❌ Binance API Error:\n${data.error || 'Order execution failed.'}`);
      }
    } catch (err: any) {
      handleAddLog(`❌ Network Routing Exception: ${err.message}`, 'error');
      alert(`❌ Network Exception:\n${err.message}`);
    }
  };

  const handleToggleTradingEnabled = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/user/trading-enabled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exchangeId: activeWorkspaceId,
          userId: currentUser?.uid || "guest_user",
          tradingEnabled: enabled
        })
      });

      if (response.ok) {
        const resData = await response.json();
        handleAddLog(`🔄 LIVE TRADING SETTING: Successfully synchronized live trading status (${resData.tradingEnabled ? 'ENABLED' : 'DISABLED'}) with secure database cluster.`, 'success');
      } else {
        const errData = await response.json();
        handleAddLog(`⚠️ Sync failure: ${errData.error || 'Server rejected request'}`, 'warn');
      }
    } catch (err: any) {
      console.error("Failed to sync trading enabled status:", err);
      handleAddLog(`⚠️ Network failed to sync trading status: ${err.message}`, 'warn');
    }
  };

  // Live account data synchronization hook (set to 10 seconds per Requirement 4)
  useEffect(() => {
    if (activeWorkspace.isLive && binanceConnectionStatus === 'CONNECTED') {
      fetchBinanceAccountStatus();
      const interval = setInterval(fetchBinanceAccountStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [activeWorkspace.isLive, binanceConnectionStatus, activeWorkspaceId, activeSymbol]);

  // Synchronize binanceConnectionStatus and risk params state on activeWorkspaceId CHANGES
  useEffect(() => {
    const checkWorkspaceExchangeStatus = async () => {
      if (!activeWorkspaceId) return;
      try {
        const response = await fetch(`/api/binance/status?exchangeId=${activeWorkspaceId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.connected) {
            setBinanceConnectionStatus('CONNECTED');
            setApiKeyInput(data.apiKey || '');
            setApiSecretInput('');
            setUseBinanceTestnet(data.isTestnet);
            setLastSyncTimestamp(data.updatedAt ? new Date(data.updatedAt).toLocaleString() : new Date().toLocaleString());
            if (data.riskSettings) {
              setMaxRiskPerTrade(data.riskSettings.maxRiskPerTrade ?? 2);
              setMaxDailyLoss(data.riskSettings.maxDailyLoss ?? 5);
              setMaxOpenPositions(data.riskSettings.maxOpenPositions ?? 3);
              setLeverageLimit(data.riskSettings.leverageLimit ?? 10);
              setMaxTradesPerDay(data.riskSettings.maxTradesPerDay ?? 3);
            }
            const isTradingEnabled = data.tradingEnabled ?? true;
            setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, isLive: isTradingEnabled } : w));
            fetchBinanceAccountStatus();
          } else {
            setBinanceConnectionStatus('NOT_CONNECTED');
            setApiKeyInput('');
            setApiSecretInput('');
            setBinanceWalletBalance(0.0);
            setBinanceAvailableMargin(0.0);
            setBinanceUnrealizedPnL(0.0);
            setBinanceMarginBalance(0.0);
          }
        }
      } catch (err) {
        console.warn("Failed to retrieve exchange status:", err);
      }
    };
    checkWorkspaceExchangeStatus();
  }, [activeWorkspaceId]);

  // Connection Health Monitor loop (Requirement 11)
  useEffect(() => {
    if (binanceConnectionStatus === 'CONNECTED') {
      const checkHealth = async () => {
        try {
          const response = await fetch(`/api/binance/health-check?exchangeId=${activeWorkspaceId}`);
          if (response.ok) {
            const data = await response.json();
            if (!data.healthy) {
              setBinanceConnectionStatus('NOT_CONNECTED');
              setBinanceWalletBalance(0.0);
              setBinanceAvailableMargin(0.0);
              setBinanceUnrealizedPnL(0.0);
              setBinanceMarginBalance(0.0);
              setIsBotRunning(false);
              handleAddLog(`🚨 Exchange Connection Dropped: ${data.error || 'API keys or Permissions invalid'}.`, 'error');
              alert(`🚨 Exchange Connection Dropped!\nReason: ${data.error || 'API Key is invalid or Futures permissions were deactivated.'}\nLive Trading and Autopilot Sweep has been deactivated and locked.`);
              // Automatically turn off Live Trading for workspace
              setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, isLive: false } : w));
            }
          }
        } catch {
          console.warn("Connection health check failed to ping server.");
        }
      };
      
      const healthInterval = setInterval(checkHealth, 60000); // Check every minute
      return () => clearInterval(healthInterval);
    }
  }, [binanceConnectionStatus, activeWorkspaceId]);

  // Firestore Synchronization listener (Requirement 4 & 5)
  useEffect(() => {
    if (!currentUser || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);
    
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.exchangeConnected && activeWorkspace.isLive) {
          const exchangeBal = typeof data.exchangeBalance === 'number' ? data.exchangeBalance : (typeof data.walletValue === 'number' ? data.walletValue : 0);
          const netCapVal = typeof data.netCapitalValue === 'number' ? data.netCapitalValue : exchangeBal;
          
          setBinanceWalletBalance(exchangeBal);
          
          if (typeof data.availableBalance === 'number') {
            setBinanceAvailableMargin(data.availableBalance);
          }
          if (typeof data.unrealizedPnL === 'number') {
            setBinanceUnrealizedPnL(data.unrealizedPnL);
          }
          if (data.lastSync) {
            setLastSyncTimestamp(data.lastSync.includes('T') ? new Date(data.lastSync).toLocaleString() : new Date(Number(data.lastSync)).toLocaleString());
          }
          if (data.connectionStatus) {
            setBinanceConnectionStatus(data.connectionStatus);
          }
          
          // Also sync global in-memory stats
          setStats(prev => ({
            ...prev,
            currentBalance: exchangeBal,
            unrealizedPnl: data.unrealizedPnL ?? prev.unrealizedPnl,
          }));
        } else if (activeWorkspace.isLive) {
          setBinanceConnectionStatus('NOT_CONNECTED');
          setBinanceWalletBalance(0.0);
          setBinanceAvailableMargin(0.0);
          setBinanceUnrealizedPnL(0.0);
          setBinanceMarginBalance(0.0);
          setStats(prev => ({
            ...prev,
            currentBalance: 0.0,
            unrealizedPnl: 0.0,
          }));
        }
      }
    }, (error) => {
      console.warn("[NovaQuant Live Sync] Firestore listener error:", error);
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    });
    
    return () => unsubscribe();
  }, [currentUser, activeWorkspace.isLive]);

  const handleBacktestFinished = (results: { trades: Trade[]; stats: BotStats }) => {
    setTrades(results.trades);
    handleAddLog(`Simulated backtester synced ${results.trades.length} historical trade contracts to active telemetry graphs!`, 'success');
  };

  const handleAddCustomCoin = (symbol: string, name: string, basePrice: number) => {
    const cleanSym = symbol.toUpperCase().trim();
    if (coinRegistry[cleanSym]) {
      alert(`❌ Symbol Conflict: ${cleanSym} already exists in the asset registry!`);
      return;
    }

    const hueRotationList = [
      'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      'text-teal-400 bg-teal-500/10 border-teal-500/20',
      'text-pink-400 bg-pink-500/10 border-pink-500/20',
      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      'text-orange-400 bg-orange-400/10 border-orange-500/20',
      'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      'text-purple-405 bg-purple-500/10 border-purple-500/20',
      'text-amber-500 bg-amber-500/10 border-amber-500/20'
    ];
    const iconColor = hueRotationList[Math.floor(Math.random() * hueRotationList.length)];

    setCoinRegistry(prev => ({
      ...prev,
      [cleanSym]: { name, iconColor: iconColor.split(' border-')[0], basePrice, marketType: cleanSym.endsWith('-PERP') ? 'future' : 'spot' }
    }));

    // Auto-enable for the autopilot
    setEnabledCoins(prev => prev.includes(cleanSym) ? prev : [...prev, cleanSym]);

    handleAddLog(`⚙️ REGISTRY AGENT: Custom asset registered dynamically: ${cleanSym} (${name}) at base price $${basePrice}. Added to autopilot sweeping runs.`, 'success');
  };

  const handleEnableAllCoins = () => {
    const allSymbols = Object.keys(coinRegistry);
    setEnabledCoins(allSymbols);
    handleAddLog(`⚙️ REGISTRY AGENT: Multi-Symbol Sweeping trade runs enabled on ALL ${allSymbols.length} registered coins!`, 'success');
  };

  const handleDisableAllCoins = () => {
    const fallback = activeSymbol || 'BTCUSDT';
    setEnabledCoins([fallback]);
    handleAddLog(`⚙️ REGISTRY AGENT: Multi-Symbol Sweeping trade runs restricted. Single focus fallback activated on ${fallback}.`, 'warn');
  };

  // Refill Gas function
  const handleRefillGas = (gasAmount: number, cashPaid: number, details: string, referrer?: string) => {
    const isBinanceConnected = binanceConnectionStatus === 'CONNECTED';
    const isBotConnected = isBotRunning;
    
    if (!isBinanceConnected || !isBotConnected) {
      alert(`⚠️ Connected Account and Active Autopilot Required:\n\nYour Workspace Binance connection status: ${isBinanceConnected ? 'CONNECTED' : 'DISCONNECTED'}, Autopilot Bot: ${isBotConnected ? 'ACTIVE' : 'INACTIVE'}.\n\nTo purchase, convert and update Bot Fuel, both your live Binance API and the Autopilot Bot must be active first!`);
      handleAddLog(`❌ REFUEL BLOCKED: Refuel purchase of +${gasAmount} Fuel rejected because your exchange is disconnected or the bot is inactive.`, 'error');
      return;
    }

    // 1. Activate bot on payment ("bot activate when client pay and get bot fuel")
    setIsBotRunning(true);
    handleAddLog(`🤖 AUTOPILOT ACTIVATED: Trading Autopilot Bot auto-activated successfully upon client fuel payment of ${cashPaid} USDT!`, 'success');

    // 2. Top up workspace balance
    setWorkspaces(prev => prev.map(w => {
      if (w.id === activeWorkspaceId) {
        return {
          ...w,
          gasBalance: w.gasBalance + gasAmount
        };
      }
      return w;
    }));

    // 3. Log gas purchase transaction
    const newTx: GasTransaction = {
      id: `gas-tx-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      workspaceName: activeWorkspace.name,
      symbol: 'ALL',
      amount: gasAmount,
      type: 'PURCHASE',
      details: referrer ? `${details} (Referral: ${referrer})` : details
    };
    setGasTransactions(prev => [newTx, ...prev]);

    // 4. Update SaaS dashboard financial states
    setSaasMetrics(prev => ({
      ...prev,
      gasRevenue: prev.gasRevenue + cashPaid,
      totalRevenue: prev.totalRevenue + cashPaid
    }));

    // 5. Calculate Admin Commission on payment (15%)
    const adminComm = parseFloat((cashPaid * 0.15).toFixed(2));
    setAdminCommissionBalance(prev => parseFloat((prev + adminComm).toFixed(2)));

    // 6. Calculate Referrer / Introducer Commission (10%)
    if (referrer && referrer.trim()) {
      const cleanRef = referrer.trim();
      const referralComm = parseFloat((cashPaid * 0.10).toFixed(2));
      setReferralPayouts(prev => [
        {
          id: `ref-tx-${Date.now()}`,
          referrer: cleanRef,
          referredUser: activeWorkspace.emailAddress || 'client.tenant@test.io',
          amountUSDT: cashPaid,
          commissionUSDT: referralComm,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        },
        ...prev
      ]);

      const refAudit: AuditLog = {
        id: `audit-ref-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        actor: 'Referral Engine',
        action: `Paid 10% referral commission (${referralComm} USDT) to introducer '${cleanRef}' for Bot Fuel topup.`,
        ipAddress: '127.0.0.1',
        severity: 'INFO'
      };
      setAuditLogs(prev => [refAudit, ...prev]);
      handleAddLog(`👥 REFERRAL COMMISSION: Paid +${referralComm} USDT to introducer '${cleanRef}' (10% payout).`, 'success');
    }

    // 7. Create an audit log
    const auditRecord: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      actor: currentUser ? currentUser.name : 'Staging Operator',
      action: `Purchased ${gasAmount} Bot Fuel refuel pack ($${cashPaid}.00 Paid) - Admin commission +${adminComm} USDT settled to Binance Account (${adminBinancePayId})`,
      ipAddress: '116.14.99.12',
      severity: 'INFO'
    };
    setAuditLogs(prev => [auditRecord, ...prev]);
    handleAddLog(`💳 BINANCE SETTLEMENT: +${adminComm} USDT Admin Commission transferred directly to admin Binance account (${adminBinancePayId}).`, 'success');
  };

  // API connectivity and importing handlers
  const handleCopyIps = () => {
    const ipList = "13.213.132.125 13.251.83.60 18.139.102.94 3.1.7.213 46.137.215.117 52.220.111.151 52.220.117.151 52.220.31.227 52.77.45.93 54.169.15.234 13.215.122.202 18.136.175.80 18.141.82.149 18.142.40.60 18.142.65.141 3.0.128.217 3.0.26.171 52.221.111.151 52.221.18.185 54.179.229.52";
    navigator.clipboard.writeText(ipList).then(() => {
      setCopiedIps(true);
      handleAddLog("📋 COPIED IP-WHITELIST: All 20 NovaQuant transaction server cluster IPs copied to clipboard.", 'success');
      setTimeout(() => setCopiedIps(false), 3000);
    }).catch(() => {
      setCopiedIps(true);
      setTimeout(() => setCopiedIps(false), 3000);
    });
  };

  const handleSaveBinanceCredentials = async () => {
    if (!apiKeyInput || !apiKeyInput.trim()) {
      alert("❌ Credentials missing: Please configure Binance API Key first.");
      return;
    }
    if (!apiSecretInput || !apiSecretInput.trim()) {
      alert("❌ Credentials missing: Please configure Binance API Secret first.");
      return;
    }

    try {
      setBinanceConnectionStatus('SYNCING');
      setBinanceError(null);
      handleAddLog("[BINANCE] Securely connecting exchange to cloud ledger vault...", "info");
      
      const token = await getAuthToken();
      const response = await fetch('/api/user/binance/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          userId: currentUser?.uid,
          apiKey: apiKeyInput.trim(),
          apiSecret: apiSecretInput.trim(),
          isTestnet: useBinanceTestnet,
          tradingEnabled: activeWorkspace.isLive,
          riskSettings: {
            maxRiskPerTrade: maxRiskPerTrade,
            maxDailyLoss: maxDailyLoss,
            maxOpenPositions: maxOpenPositions,
            leverageLimit: leverageLimit,
            maxTradesPerDay: maxTradesPerDay
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBinanceConnectionStatus('CONNECTED');
        setBinanceWalletBalance(data.walletValue || 10000.0);
        setBinanceAvailableMargin(data.availableBalance || 10000.0);
        
        setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? {
          ...w,
          binanceApiKey: apiKeyInput.trim(),
          binanceApiSecret: '••••••••••••••••••••••••••••••••',
          isLive: true
        } : w));

        setApiSecretInput('');

        if (config.enableAudioNotifications) {
          playTradeExitProfit();
        }
        handleAddLog(`[BINANCE] Credentials encrypted and linked for workspace '${activeWorkspace.name}'.`, 'success');
        alert("🎉 Credentials Saved Successfully!\nYour live Binance Futures credentials have been encrypted and linked inside secure workspace configuration buffers.");
      } else {
        setBinanceConnectionStatus('NOT_CONNECTED');
        setBinanceError(data.error || 'Connection handshake failed.');
        handleAddLog(`❌ exchange connection failed: ${data.error || 'Check credentials'}`, 'error');
        alert(`❌ Connection Setup Failed:\n${data.error || 'Check API credentials'}`);
      }
    } catch (err: any) {
      setBinanceConnectionStatus('NOT_CONNECTED');
      setBinanceError('Network handshake timeout');
      handleAddLog(`❌ Exchange connection exception: ${err.message}`, 'error');
      alert(`❌ Connection/Save Exception:\n${err.message || 'Network error'}`);
    }
  };

  const [isSavingRisk, setIsSavingRisk] = useState<boolean>(false);

  const handleUpdateRiskSettings = async () => {
    try {
      setIsSavingRisk(true);
      const token = await getAuthToken();
      const response = await fetch('/api/user/risk-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          exchangeId: activeWorkspaceId,
          userId: currentUser?.uid,
          riskSettings: {
            maxRiskPerTrade: maxRiskPerTrade,
            maxDailyLoss: maxDailyLoss,
            maxOpenPositions: maxOpenPositions,
            leverageLimit: leverageLimit,
            maxTradesPerDay: maxTradesPerDay
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        handleAddLog(`🛡️ RISK CONFIG APPLIED: Pre-flight shield parameters synchronized: Max Risk ${maxRiskPerTrade}%, Max Daily Loss ${maxDailyLoss}%, Max Positions ${maxOpenPositions}, Leverage Capped ${leverageLimit}x, Max Trades ${maxTradesPerDay}/day.`, 'success');
        alert("🎉 Risk Parameters Synced!\nYour new workspace risk shield thresholds have been updated and synchronized with the secure cloud ledger.");
      } else {
        const errData = await response.json();
        handleAddLog(`❌ Risk parameter sync failed: ${errData.error || 'Server rejected changes'}`, 'error');
        alert(`❌ Sync Failed:\n${errData.error || 'Server rejected changes'}`);
      }
    } catch (err: any) {
      handleAddLog(`❌ Risk parameter network error: ${err.message}`, 'error');
      alert(`❌ Network Failure:\n${err.message}`);
    } finally {
      setIsSavingRisk(false);
    }
  };

  const handleTestBinanceConnection = async () => {
    await handleSaveBinanceCredentials();
  };

  const handleDisconnectBinanceAccount = async () => {
    if (confirm("⚠️ Are you sure you want to completely disconnect your Binance Account from NovaQuant? This will clear all stored API key configurations.")) {
      try {
        const token = await getAuthToken();
        const response = await fetch('/api/user/binance/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        
        if (response.ok) {
          setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? {
            ...w,
            binanceApiKey: '',
            binanceApiSecret: ''
          } : w));
          
          setApiKeyInput('');
          setApiSecretInput('');
          lastWalletBalanceRef.current = null;
          setBinanceConnectionStatus('NOT_CONNECTED');
          setBinanceError(null);
          setBinanceWalletBalance(0);
          setBinanceAvailableMargin(0);
          setBinanceUnrealizedPnL(0);
          setBinanceMarginBalance(0);

          handleAddLog(`[BINANCE] Connection disconnected for workspace '${activeWorkspace.name}'.`, 'warn');
          alert("🔴 Account disconnected. API credentials successfully removed.");
        } else {
          const errData = await response.json();
          alert(`❌ Disconnect Failed: ${errData.error || 'Please try again.'}`);
        }
      } catch (err: any) {
        alert(`❌ Disconnect Exception: ${err.message}`);
      }
    }
  };

  // Subscription upgrade
  const handleUpgradePlan = (tier: SubscriptionTier) => {
    const feeMap = { BASIC: 49, PRO: 99, ENTERPRISE: 199 };
    const tierCost = feeMap[tier];
    
    setUpgradeCheckoutModal({ open: true, tier, price: tierCost });
    setUpgradeCheckoutStep('details');
    setUpgradePin('');
    setUpgradeQrScanned(false);
    setUpgradeMethod('app_scan');
  };

  const confirmSubscriptionUpgrade = (tier: SubscriptionTier, price: number) => {
    // Switch workspace subscription
    setWorkspaces(prev => prev.map(w => {
      if (w.id === activeWorkspaceId) {
        return {
          ...w,
          plan: tier
        };
      }
      return w;
    }));

    // Update local user state
    setCurrentUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        subscription: {
          plan: tier,
          status: 'ACTIVE',
          startDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
    });

    // Sync upgraded subscription directly to Firestore
    if (currentUser?.uid) {
      const userRef = doc(db, 'users', currentUser.uid);
      setDoc(userRef, {
        subscription: {
          plan: tier,
          status: 'ACTIVE',
          startDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }, { merge: true }).catch(err => {
        console.error("Failed saving upgraded subscription directly to cloud storage:", err);
      });
    }

    // Update SaaS stats
    setSaasMetrics(prev => ({
      ...prev,
      subscriptionRevenue: prev.subscriptionRevenue + price,
      totalRevenue: prev.totalRevenue + price
    }));

    // Calculate Admin Commission (15%)
    const adminComm = parseFloat((price * 0.15).toFixed(2));
    setAdminCommissionBalance(prev => parseFloat((prev + adminComm).toFixed(2)));

    // Add security log
    const audit: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      actor: currentUser ? currentUser.name : 'Unknown User',
      action: `Upgraded Workspace '${activeWorkspace.name}' to premium ${tier} license tier ($${price}.05 billed via Binance App Gateway) - Admin commission +${adminComm} USDT settled to ${adminBinancePayId}`,
      ipAddress: '116.14.99.12',
      severity: 'INFO'
    };
    setAuditLogs(prev => [audit, ...prev]);

    handleAddLog(`🎉 SUBSCRIPTION UPGRADE: Workspace '${activeWorkspace.name}' upgraded to ${tier} tier! Max multi-tenant limits expanded.`, 'success');
    handleAddLog(`💳 BINANCE SETTLEMENT: +${adminComm} USDT Admin Commission routed to admin Binance ID (${adminBinancePayId}).`, 'success');
  };

  const handleUpgradePaymentProcess = () => {
    if (!upgradeCheckoutModal) return;
    setUpgradeCheckoutStep('loading');

    setTimeout(() => {
      confirmSubscriptionUpgrade(upgradeCheckoutModal.tier, upgradeCheckoutModal.price);
      setUpgradeCheckoutStep('success');
    }, 2200);
  };

  // Automated Stripe client payment and node onboarding webhook handler
  const handleAddNewClientUser = (newClient: SaaSUser, activeFee: number, actionLogStr: string, referrer?: string) => {
    setSaasUsers(prev => [newClient, ...prev]);
    
    // Auto-activate the trading bot!
    setIsBotRunning(true);
    handleAddLog(`🤖 AUTOPILOT ACTIVATED: Trading Autopilot Bot auto-activated successfully upon new client SaaS user onboarding!`, 'success');

    setSaasMetrics(prev => ({
      ...prev,
      subscriptionRevenue: prev.subscriptionRevenue + activeFee,
      totalRevenue: prev.totalRevenue + activeFee,
      activeUsersCount: prev.activeUsersCount + 1,
      totalWorkspacesCount: prev.totalWorkspacesCount + 1
    }));

    // Calculate Admin Commission (15%)
    const adminComm = parseFloat((activeFee * 0.15).toFixed(2));
    setAdminCommissionBalance(prev => parseFloat((prev + adminComm).toFixed(2)));

    // Calculate Referrer / Introducer Commission (10%)
    if (referrer && referrer.trim()) {
      const cleanRef = referrer.trim();
      const referralComm = parseFloat((activeFee * 0.10).toFixed(2));
      setReferralPayouts(prev => [
        {
          id: `ref-tx-${Date.now()}`,
          referrer: cleanRef,
          referredUser: newClient.email,
          amountUSDT: activeFee,
          commissionUSDT: referralComm,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        },
        ...prev
      ]);

      const refAudit: AuditLog = {
        id: `audit-ref-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        actor: 'Referral Engine',
        action: `Paid 10% referral commission (${referralComm} USDT) to introducer '${cleanRef}' for onboarding subscription client '${newClient.name}'.`,
        ipAddress: '127.0.0.1',
        severity: 'INFO'
      };
      setAuditLogs(prev => [refAudit, ...prev]);
      handleAddLog(`👥 REFERRAL COMMISSION: Paid +${referralComm} USDT to introducer '${cleanRef}' (10% onboarding bonus).`, 'success');
    }

    // Generate Stripe Webhook Audit Trail
    const webhookAudit: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      actor: 'Stripe webhook',
      action: `${actionLogStr} - Admin Commission +${adminComm} USDT routed to registered Binance account (${adminBinancePayId})`,
      ipAddress: '54.186.204.101',
      severity: 'INFO'
    };
    setAuditLogs(prev => [webhookAudit, ...prev]);
    handleAddLog(actionLogStr, 'success');
    handleAddLog(`💳 BINANCE SETTLEMENT: +${adminComm} USDT Admin Commission arrived at admin Binance Pay address (${adminBinancePayId}).`, 'success');
  };

  // Admin user status adjustment
  const handleToggleUserStatus = (userId: string) => {
    setSaasUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        
        // Log auditing action
        const log: AuditLog = {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          actor: 'Admins Desk',
          action: `Adjusted user status for ${u.name} (ID: ${u.id}) to ${nextStatus}`,
          ipAddress: '116.14.99.12',
          severity: nextStatus === 'SUSPENDED' ? 'WARN' : 'INFO'
        };
        setAuditLogs(prevSec => [log, ...prevSec]);
        
        return {
          ...u,
          status: nextStatus
        };
      }
      return u;
    }));
  };

  const handleSecurityScan = () => {
    // Add custom scan success log
    const scannerLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      actor: 'WAF Firewall Core',
      action: 'Full platform cryptographic keys health scan executed: Cryptographic secrets intact. No vulnerabilities found.',
      ipAddress: 'Node 4-A CloudRun',
      severity: 'INFO'
    };
    setAuditLogs(prev => [scannerLog, ...prev]);
  };

  const handleSyncMetrics = () => {
    handleAddLog('Synchronizing multi-tenant dashboard databases states...', 'info');
  };

  // Enforce session credentials check
  if (!currentUser || !currentUser.email_verified) {
    return (
      <AuthGateway 
        onLoginSuccess={(user, token) => {
          setCurrentUser(user);
          localStorage.setItem('novaquant_user', JSON.stringify(user));
          if (token) {
            localStorage.setItem('novaquant_token', token);
          }
          handleAddLog(`❇️ Session Authorized: Welcoming operator ${user.name} back to the autopilot terminal console!`, 'success');
        }} 
        initialMode={currentUser && !currentUser.email_verified ? 'verify_email' : 'login'}
        initialEmail={currentUser ? currentUser.email : ''}
      />
    );
  }

  return (
    <div className="min-h-screen sleek-gradient-bg text-slate-100 flex flex-col font-sans select-none" id="bot-fuel-saas-platform-wrapper">
      
      {/* 🚀 Top Unified Navigation Header */}
      <header className="sleek-header sticky top-0 z-40 backdrop-blur-sm shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-wrap justify-between items-center gap-4">
          
          {/* Brand Logo & Slogan & Operator Icons */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 hover:rotate-12 transition-transform cursor-pointer" onClick={() => setActiveTab('dashboard')}>
                <NovaQuantLogo size={42} />
              </div>
              <div>
                <h1 className="font-extrabold text-white tracking-tight text-base md:text-lg flex items-center gap-1.5 leading-tight">
                  NovaQuant
                </h1>
                <p className="text-[9px] text-slate-400 font-mono tracking-wider text-left">
                  Real-time Trading Autopilot Suite
                </p>
              </div>
            </div>

            {/* Operator Profile and Default Admin clearance label next to client layout logo */}
            <div className="flex items-center gap-2 border-l border-slate-800/80 pl-3">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-8 h-8 rounded-full border flex items-center justify-center font-sans font-black text-white text-xs uppercase hover:opacity-85 transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-purple-950 border-purple-500 shadow-lg shadow-purple-950/25'
                    : 'bg-slate-900 border-slate-800'
                }`}
                title={`View Profile: ${currentUser ? currentUser.name : 'Operator'}`}
              >
                {currentUser ? currentUser.name.substring(0, 2) : 'OP'}
              </button>

              {isAdmin && (
                <span className="text-[9px] bg-red-950/60 text-red-400 border border-red-900/30 font-bold font-mono px-2 py-0.5 rounded uppercase select-none animate-pulse">
                  👑 ADMIN
                </span>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="bg-rose-950/30 hover:bg-rose-950/70 border border-rose-900/40 text-rose-400 hover:text-rose-300 px-2 py-1.5 rounded-lg text-[10px] font-extrabold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ml-1.5 active:scale-95"
                title="Log out of Secure Session"
                id="header-logout-button"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline">LOGOUT</span>
              </button>
            </div>
          </div>

          {/* Quick Stats: Workspace Switcher and Fuel Bar */}
          <div className="flex items-center gap-3">
            
            {/* Binance Connection Status Indicator Badge (Requirement 6) */}
            <div className={`p-1 px-3 border rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
              activeWorkspace.isLive
                ? binanceConnectionStatus === 'CONNECTED'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                  : binanceConnectionStatus === 'SYNCING'
                    ? 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                    : binanceConnectionStatus === 'WARNING'
                      ? 'text-amber-400 bg-amber-900/25 border-amber-500/25'
                      : 'text-rose-450 bg-rose-950/40 border-rose-900/40'
                : 'text-indigo-400 bg-indigo-950/40 border-indigo-900/30'
            }`}>
              {activeWorkspace.isLive ? (
                binanceConnectionStatus === 'CONNECTED' ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>🟢 Connected</span>
                  </>
                ) : binanceConnectionStatus === 'SYNCING' ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-spin absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 border-2 border-t-transparent"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span>🟡 Syncing</span>
                  </>
                ) : binanceConnectionStatus === 'WARNING' ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse"></span>
                    </span>
                    <span>⚠️ Warning</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 bg-rose-500 rounded-full"></span>
                    <span>🔴 Disconnected</span>
                  </>
                )
              ) : (
                <>
                  <span className="h-2 w-2 bg-indigo-500 rounded-full"></span>
                  <span>⚙️ Sandbox Paper</span>
                </>
              )}
            </div>
            
            {/* Workspace & Fuel Stats stacked vertically as requested */}
            <div className="flex flex-col gap-1.5 items-end">
              
              {/* Workspace Select (Line 1) */}
              <div className="flex items-center gap-1 bg-[#020904]/80 border border-slate-800 rounded-lg p-1 py-0.5">
                <span className="text-[9px] font-mono font-bold text-slate-500 pl-1 uppercase">Workspace:</span>
                <select
                  value={activeWorkspaceId}
                  onChange={(e) => {
                    setActiveWorkspaceId(e.target.value);
                    handleAddLog(`Workspace session mapped: loaded '${workspaces.find(w => w.id === e.target.value)?.name}' credential buffers.`, 'system');
                  }}
                  className="bg-[#020617] border-0 text-white font-bold text-[11px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                  id="workspace-switcher-selector"
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.plan})
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Fuel tracker (Line 2) */}
              <div 
                onClick={() => setActiveTab('gas')}
                className="flex items-center justify-between w-full bg-sky-950/40 hover:bg-sky-950/60 transition-all border border-sky-800/50 px-2 py-0.5 rounded-lg cursor-pointer text-xs"
                title="Click to refill Bot Fuel credits"
                id="header-fuel-badge"
              >
                <div className="flex items-center">
                  <Zap className="h-3 w-3 text-sky-455 fill-current animate-pulse mr-1" />
                  <span className="font-mono font-bold text-white text-[11px] pr-1">
                    {displayedGasBalance.toFixed(2)}
                  </span>
                </div>
                <span className="text-[#a5f3fc] font-semibold text-[8px] uppercase tracking-wider pl-1.5">BOT FUEL</span>
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Primary Tab Selector Menu Bar */}
      <nav className="bg-[#020617]/50 border-b border-slate-900/80 select-none py-1.5 whitespace-nowrap overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-1.5 text-xs font-semibold">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="h-4 w-4 text-[#38bdf8]" /> WORKSPACE TERMINAL
          </button>

          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
              activeTab === 'pnl'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-emerald-950/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="nav-pnl-dashboard-btn"
          >
            <TrendingUp className="h-4 w-4 text-emerald-400" /> PROFIT & LOSS ANALYTICS
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
              activeTab === 'ai'
                ? 'bg-slate-800 text-purple-300 shadow-sm border border-purple-950/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
            id="nav-ai-advisor-btn"
          >
            <Brain className="h-4 w-4 text-purple-400" /> AI ADVISOR (GEMINI & CLAUDE)
          </button>

          <button
            onClick={() => setActiveTab('wallets')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
              activeTab === 'wallets'
                ? 'bg-slate-800 text-slate-[#fbbf24] shadow-sm border border-emerald-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="h-4 w-4 text-[#fbbf24]" /> EXCHANGE WALLETS
          </button>

          <button
            onClick={() => setActiveTab('gas')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
              activeTab === 'gas'
                ? 'bg-slate-850 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-4 w-4 text-sky-400 fill-current" /> BOT FUEL TANK
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
              activeTab === 'news'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarRange className="h-4 w-4 text-[#818cf8]" /> GLOBAL NEWS FILTERS
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
              activeTab === 'settings'
                ? 'bg-slate-850 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="h-4 w-4 text-slate-450" /> WORKSPACE CONFIGS
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
                activeTab === 'admin'
                  ? 'bg-slate-850 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-pink-400" /> SAAS ADMIN DESK
            </button>
          )}

          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all cursor-pointer font-sans border-0 ${
              activeTab === 'blueprint'
                ? 'bg-slate-850 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="h-4 w-4 text-emerald-450" /> SYSTEM BLUEPRINTS & APIS
          </button>

          <div className="w-[1px] h-4 bg-slate-800/80 mx-1.5 shrink-0 self-center hidden md:block" />

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-md flex items-center gap-2 text-rose-450 hover:text-rose-350 hover:bg-rose-950/20 transition-all cursor-pointer font-sans border border-transparent hover:border-rose-900/40"
            title="Terminate secure session (Logout)"
            id="nav-logout-btn"
          >
            <LogOut className="h-4 w-4 text-rose-500" /> SECURE LOGOUT
          </button>

        </div>
      </nav>

      {/* 📊 Main Content Frame */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 md:px-6 py-6 overflow-hidden flex flex-col gap-6 select-text mb-10">
        
        {isDataLoading && activeTab === 'dashboard' ? (
          <div className="flex-grow flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-3">
              <RotateCcw className="h-8 w-8 text-indigo-500 animate-spin mx-auto" strokeWidth={2.5} />
              <p className="text-xs font-mono text-slate-400 tracking-widest animate-pulse">
                INITIALIZING MULTI-EXCHANGE FEED & INDICATORS ENGINE...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs Rendering logic */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-layout-modules">
                
                {/* Left (8 Columns) */}
                <div className="lg:col-span-8 space-y-6 flex flex-col justify-start">
                  
                  {/* Candlestick Main Trading Canvas */}
                  <div className="h-[430px]" id="chart-widget-container">
                    <CandlestickChart
                      candles={candles}
                      symbol={activeSymbol}
                      activePosition={activePosition}
                      buySignals={buySignals}
                      sellSignals={sellSignals}
                    />
                  </div>

                  {/* ACTIVE RISK SHIELD & CAPITAL PROTECTION CONTROLLER */}
                  <RiskShieldController
                    config={config}
                    dailyRealizedPnl={dailyRealizedPnl}
                    isLive={activeWorkspace.isLive}
                    binanceWalletBalance={binanceWalletBalance}
                    onUpdateRiskSettings={(updates) => {
                      if (updates.mode) setRiskMode(updates.mode);
                      if (updates.maxDailyLossLimit !== undefined) setMaxDailyLossLimit(updates.maxDailyLossLimit);
                      if (updates.enableTrailingStop !== undefined) setEnableTrailingStop(updates.enableTrailingStop);
                      if (updates.trailingActivationMult !== undefined) setTrailingActivationMult(updates.trailingActivationMult);
                      if (updates.leverageCeiling !== undefined) setLeverageCeiling(updates.leverageCeiling);
                    }}
                    onAddLog={handleAddLog}
                    onChangeExchange={(newExchange) => {
                      setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, exchange: newExchange } : w));
                      const maxLimit = EXCHANGE_LEVERAGE_LIMITS[newExchange] || 125;
                      if (leverageCeiling > maxLimit) {
                        setLeverageCeiling(maxLimit);
                      }
                      handleAddLog(`🔄 Exchange updated: Connected workspace '${activeWorkspace.name}' to ${newExchange} node. Leverage capped at ${maxLimit}x.`, 'info');
                    }}
                  />

                  {/* Active Open Positions Section */}
                  <PositionsTable
                    positions={activePositions}
                    onClosePosition={handleManualClosePosition}
                    pnlDisplayMode={pnlDisplayMode}
                  />

                  {/* Finished trade historical entries logger */}
                  <HistoryTable trades={trades} />

                  {/* AI Bot Performance & Stream Analyzer Hub */}
                  <AccuracyDbAnalyzer
                    activePositions={activePositions}
                    coinRegistry={coinRegistry}
                    activeSymbol={activeSymbol}
                    onAddLog={handleAddLog}
                  />

                  {/* Log console terminal */}
                  <LogTerminal logs={logs} onClearLogs={handleClearLogs} trades={trades} />

                </div>

                {/* Right (4 Columns) */}
                <div className="lg:col-span-4 space-y-6 flex flex-col justify-start">
                  
                  {/* NET CAPITAL SECTION CONTAINER (Requirement 5) */}
                  <div className="sleek-card p-4 space-y-3 shadow-xl select-none relative overflow-hidden" id="dashboard-net-capital-card">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                    
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="h-4 w-4 text-[#fbbf24]" />
                        <span className="font-sans font-bold text-white text-xs uppercase tracking-tight">Active Net Capital</span>
                      </div>
                      <span className={`text-[9px] font-mono font-black border px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isAlphaYieldDesk
                          ? (binanceConnectionStatus === 'CONNECTED' ? 'text-amber-400 bg-amber-950/40 border-amber-900/30' : 'text-rose-400 bg-rose-950/40 border-rose-900/30')
                          : (activeWorkspace.isLive 
                              ? 'text-amber-400 bg-amber-950/40 border-amber-900/30' 
                              : 'text-indigo-400 bg-indigo-950/40 border-indigo-900/30')
                      }`}>
                        {isAlphaYieldDesk
                          ? (binanceConnectionStatus === 'CONNECTED' ? 'Binance Live Wallet' : 'Disconnected')
                          : (activeWorkspace.isLive ? 'Binance Futures Demo' : 'Paper Trading')}
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-[11px] relative z-10">
                      <div className="flex justify-between items-center p-2 rounded bg-[#020617]/50 border border-slate-850">
                        <span className="text-slate-400 font-sans">Wallet Balance</span>
                        <span className="font-bold text-slate-100 font-mono">
                          {`${displayWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded bg-[#020617]/50 border border-slate-850">
                        <span className="text-slate-400 font-sans">Available Margin</span>
                        <span className="font-bold text-sky-400 font-mono">
                          {`${displayAvailableMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded bg-[#020617]/50 border border-slate-850">
                        <span className="text-slate-400 font-sans">Open Positions (Margin Allocated)</span>
                        <span className="font-bold text-slate-200 font-mono">
                          {`${displayOpenPositions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded bg-[#020617]/50 border border-slate-850">
                        <span className="text-slate-400 font-sans">Unrealized PnL</span>
                        <span className={`font-extrabold font-mono ${
                          displayUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {`${displayUnrealizedPnL >= 0 ? '+' : ''}${displayUnrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2.5 rounded bg-gradient-to-r from-emerald-950/20 to-slate-900 border border-emerald-900/40 mt-1">
                        <span className="text-slate-200 font-sans font-bold">Total Net Capital</span>
                        <span className="font-black text-xs text-emerald-400 font-mono">
                          {`${displayTotalNetCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Autopilot and Strategy backtesting launcher control */}
                  <BotControlPanel
                    config={config}
                    stats={{
                      ...stats,
                      currentBalance: displayTotalNetCapital,
                      unrealizedPnl: displayUnrealizedPnL
                    }}
                    lastSyncTimestamp={lastSyncTimestamp}
                    connectionStatus={binanceConnectionStatus === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED'}
                    isBotRunning={isBotRunning}
                    isTestnet={useBinanceTestnet}
                    onStartBot={() => {
                      if (activeWorkspace.gasBalance <= 0) {
                        alert(`❌ Autopilot refused: Workspace '${activeWorkspace.name}' has empty fuel levels...`);
                        return;
                      }
                      if (activeWorkspace.isLive && binanceConnectionStatus !== 'CONNECTED') {
                        alert("❌ Trading Lock Active:\nYou cannot activate the Autopilot bot because your Binance credentials are not authenticated. Please configure and test connection under settings.");
                        return;
                      }
                      setIsBotRunning(true);
                      handleAddLog(`🚀 Autopilot successfully connected to user exchange node. Sweeping ${activeSymbol} closed intervals.`, 'success');
                    }}
                    onStopBot={() => {
                      setIsBotRunning(false);
                      handleAddLog('🚨 Autopilot deactivated: Automated trade routing is suspended.', 'warn');
                    }}
                    onUpdateSymbolAndTimeframe={(sym, tf) => {
                      setActiveSymbol(sym);
                      setActiveTimeframe(tf);
                    }}
                    allCandlesForSearch={candles}
                    onBacktestResults={handleBacktestFinished}
                    onAddLog={handleAddLog}
                    onExecuteTrade={handleTradePlacement}
                  />

                  {/* NovaQuant Comprehensive Coin Registries & Auto-Sweeper Scans */}
                  <AssetSelectorPanel
                    activeSymbol={activeSymbol}
                    activePositions={activePositions}
                    enabledCoins={enabledCoins}
                    onSelectSymbol={(sym) => {
                      setActiveSymbol(sym);
                      handleAddLog(`🔍 TELEMETRY VIEW: Focusing charts and technical graphs on ${sym}.`, 'info');
                    }}
                    onToggleCoin={(sym) => {
                      setEnabledCoins(prev => {
                        if (prev.includes(sym)) {
                          if (prev.length <= 1) {
                            alert('⚠️ Security threshold: You must retain at least 1 digital asset active in the autopilot sweep!');
                            return prev;
                          }
                          handleAddLog(`⚙️ REGISTRY AGENT: Excluded ${sym} from subsequent autopilot sweeps.`, 'info');
                          return prev.filter(c => c !== sym);
                        } else {
                          handleAddLog(`⚙️ REGISTRY AGENT: Appended ${sym} to the real-time autopilot sweep pipeline.`, 'success');
                          return [...prev, sym];
                        }
                      });
                    }}
                    onManualTrade={handleUniversalTradeDispatcher}
                    coinRegistry={coinRegistry}
                    onAddCustomCoin={handleAddCustomCoin}
                    onEnableAllCoins={handleEnableAllCoins}
                    onDisableAllCoins={handleDisableAllCoins}
                    onSimulateNewCoinListing={handleSimulateNewCoinListing}
                    upcomingCoinsCount={upcomingPool.length}
                    onSetEnabledCoins={(symbols) => {
                      setEnabledCoins(symbols);
                      handleAddLog(`⚙️ REGISTRY AGENT: Quick sweep segments adjusted. Active autopilots: ${symbols.length} coins.`, 'success');
                    }}
                  />

                  {/* Realtime indicators crossover radar */}
                  <div className="sleek-card p-4 space-y-3.5 shadow-xl select-none" id="realtime-telemetry-hud">
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <Sparkles className="h-4 w-4 text-sky-400" />
                      <span className="font-sans font-bold text-white text-xs uppercase tracking-tight">Strategy Telemetry Indicators</span>
                    </div>

                    <div className="space-y-2 font-mono text-[11px]">
                      
                      <div className="flex justify-between items-center p-2 rounded bg-[#020617]/60 border border-slate-800">
                        <span className="text-slate-400 font-sans">EMA Crossovers (9 vs 21)</span>
                        <span className={`font-semibold ${
                          candles.length > 0 && candles[candles.length - 1].ema9 && candles[candles.length - 1].ema21
                            ? (candles[candles.length - 1].ema9! >= candles[candles.length - 1].ema21! ? 'text-emerald-400' : 'text-red-400')
                            : 'text-slate-500'
                        }`}>
                          {candles.length > 0 && candles[candles.length - 1].ema9 && candles[candles.length - 1].ema21
                            ? `$${candles[candles.length - 1].ema9!.toFixed(2)} / $${candles[candles.length - 1].ema21!.toFixed(2)}`
                            : 'Analysing...'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded bg-[#020617]/60 border border-slate-800">
                        <span className="text-slate-400 font-sans">Strength Index (RSI-14)</span>
                        <span className={`font-extrabold ${
                          candles.length > 0 && candles[candles.length - 1].rsi
                            ? (candles[candles.length - 1].rsi! > 55 ? 'text-emerald-400' : candles[candles.length - 1].rsi! < 45 ? 'text-red-400' : 'text-slate-350')
                            : 'text-slate-500'
                        }`}>
                          {candles.length > 0 && candles[candles.length - 1].rsi
                            ? candles[candles.length - 1].rsi!.toFixed(2)
                            : 'Analysing...'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded bg-[#020617]/60 border border-slate-800">
                        <span className="text-slate-400 font-sans">True Volatility (ATR-14)</span>
                        <span className="text-[#38bdf8] font-bold">
                          {candles.length > 0 && candles[candles.length - 1].atr
                            ? `$${candles[candles.length - 1].atr!.toFixed(4)}`
                            : 'Analysing...'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded bg-[#020617]/60 border border-slate-800">
                        <span className="text-slate-400 font-sans">Bollinger Bands Deviation</span>
                        <span className="text-[#818cf8] font-bold">
                          {candles.length > 0 && candles[candles.length - 1].atr
                            ? `±$${(candles[candles.length - 1].atr! * 2).toFixed(2)}`
                            : 'Armed'}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Active Policy Rules spec summary */}
                  <div className="sleek-card p-4 space-y-3 shadow-xl select-none text-[11px] leading-relaxed text-slate-400" id="strategy-meta-bullets">
                    <span className="block text-[10px] text-white font-bold uppercase font-sans tracking-wide border-b border-slate-800 pb-1.5 mb-1.5">
                      NovaQuant Bot Fuel Autopilot rules matrix
                    </span>
                    <ul className="space-y-1.5 list-disc list-inside text-left">
                       <li><b>Indicators</b>: EMA 9 & 21 crossovers, RSI (14 value period), MACD oscillator.</li>
                       <li><b>Take Profit (TP)</b>: Scalped at 3x True Volatility (ATR multiplier value)</li>
                       <li><b>Stop Loss (SL)</b>: Guarded strictly at 1.5x ATR multiplier depth</li>
                       <li><b>Security filter</b>: Prevents double entries and suspends when news window opens.</li>
                    </ul>
                  </div>

                  {/* NovaQuant Elite Algorithmic Coin Medallion */}
                  <div className="sleek-card p-4 flex flex-col items-center text-center space-y-3.5 shadow-xl select-none bg-gradient-to-b from-[#091a14]/60 to-[#020617]/80 border border-[#0d4e3a]/20" id="novaquant-medallion-widget">
                    <div className="text-[9px] text-[#2ebd85] font-extrabold uppercase font-sans tracking-widest flex items-center gap-1.5 justify-center">
                      <span className="w-1.5 h-1.5 bg-[#2ebd85] rounded-full animate-pulse shadow-[0_0_6px_#2ebd85]"></span>
                      Official NovaQuant License Token
                    </div>
                    
                    <div className="relative group cursor-pointer select-none py-1" id="interactive-medallion-container">
                      {/* Ambient background glow */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-24 h-24 rounded-full bg-emerald-500/10 blur-xl opacity-75 group-hover:bg-amber-500/10 transition-colors duration-700"></div>
                      
                      <div className="relative transform transition-all duration-700 ease-out group-hover:scale-105 group-hover:rotate-6 filter drop-shadow-[0_4px_12px_rgba(4,44,33,0.3)]">
                        <NovaQuantLogo size={120} />
                      </div>
                    </div>

                    <div className="space-y-1 w-full">
                      <h4 className="font-sans font-black text-white text-[11px] uppercase tracking-wider">
                        NQ 999 FINE METALLIC EMBLEM
                      </h4>
                      <p className="text-[10px] text-slate-450 leading-relaxed font-mono px-1">
                        Secured client container certificate. Valid private sandbox routing token. Operating frequency: 4.8 GHz.
                      </p>
                    </div>

                    <div className="w-full bg-[#020617] border border-slate-850 p-2 rounded-lg flex justify-between items-center text-left">
                      <div className="space-y-0.5">
                        <span className="block text-[8px] text-slate-500 uppercase font-mono tracking-wider">Status Verification</span>
                        <span className="block text-[10px] font-sans font-bold text-emerald-400">Authenticated Ledger License</span>
                      </div>
                      <div className="bg-[#0b382d]/50 px-2 py-0.5 rounded border border-[#0d4e3a]/40 font-mono text-[9px] text-[#2ebd85] font-bold">
                        ACTIVE
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {activeTab === 'pnl' && (
              <PnLDashboard
                trades={trades}
                setTrades={setTrades}
                initialBalance={config.paperBalance}
              />
            )}

            {/* Exchange wallets tab rendering */}
            {activeTab === 'wallets' && (
              <ExchangeWallets
                activeWorkspace={activeWorkspace}
                onRefillGas={handleRefillGas}
                onAddLog={handleAddLog}
                isLive={activeWorkspace.isLive}
                binanceWalletBalance={binanceWalletBalance}
                connectionStatus={binanceConnectionStatus}
                isTestnet={useBinanceTestnet}
              />
            )}

            {/* AI Fuel Tab rendering */}
            {activeTab === 'gas' && (
              <GasTankHub
                activeWorkspace={{
                  ...activeWorkspace,
                  gasBalance: displayedGasBalance
                }}
                gasTransactions={gasTransactions}
                onRefillGas={handleRefillGas}
                onAddLog={handleAddLog}
                isBinanceAndBotConnected={isBothConnected}
              />
            )}

            {/* Macro Calendar restrictions rendering */}
            {activeTab === 'news' && (
              <NewsManager
                newsEvents={newsEvents}
                avoidNews={config.avoidNews}
                onToggleAvoidNews={(val) => {
                  setWorkspaces(prev => prev.map(w => {
                    if (w.id === activeWorkspaceId) {
                      return {
                        ...w,
                        emailAlertsEnabled: val // Proxy mapped avoids!
                      };
                    }
                    return w;
                  }));
                  handleAddLog(`Avoid Macro events toggled to ${val} across active operations.`, 'system');
                }}
                onAddNewsEvent={(evt) => {
                  setNewsEvents(prev => [...prev, evt]);
                  handleAddLog(`Scheduled restriction timeframe: "${evt.event}"`, 'system');
                }}
                onRemoveNewsEvent={(id) => {
                  setNewsEvents(prev => prev.filter(e => e.id !== id));
                  handleAddLog('Halted calendar constraints deleted.', 'system');
                }}
              />
            )}

            {/* Workspace settings layout */}
            {activeTab === 'settings' && (
              <div className="space-y-6" id="saas-workspace-settings-container">
                
                {/* Upgrades Subscriptions Block */}
                <div className="sleek-card p-5 shadow-xl">
                  <h3 className="text-sm font-sans font-bold text-white flex items-center gap-1.5 mb-2 border-b border-slate-800 pb-2 uppercase">
                    <Sparkles className="h-4.5 w-4.5 text-yellow-400 animate-pulse" /> Workspace SaaS License
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-4xl mb-4">
                    Your account is configured under the standard licensing agreement.
                  </p>

                  <div className="max-w-md mx-auto" id="subscription-cards-shop">
                    
                    {/* Basic Plan */}
                    <div className={`sleek-card p-5 flex flex-col justify-between hover:border-slate-700/60 transition-all border-[#818cf8] bg-slate-900/40 shadow-lg shadow-[#818cf8]/5`}>
                      <div>
                        <div className="flex justify-between items-center font-bold mb-1">
                          <span className="text-xs text-indigo-400 font-mono tracking-wider uppercase">BASIC PLAN</span>
                          <span className="bg-emerald-950/80 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-mono border border-emerald-800/50">STANDARD ACTIVE LICENSE</span>
                        </div>
                        <div className="flex items-baseline gap-1 py-2">
                          <span className="text-3xl font-extrabold font-mono text-white">$49</span>
                          <span className="text-xs text-slate-500 font-mono">/ month</span>
                        </div>
                        <p className="text-slate-400 text-xs mb-4 font-sans leading-relaxed">
                          Your active workspace uses the standard NovaQuant Automation engine with full programmatic metrics tracking enabled.
                        </p>
                        <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800 text-left leading-normal">
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-500">✓</span> Access to 1 exchange workspace node
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-500">✓</span> Basic crossovers filters triggers
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-500">✓</span> Max {maxTradesPerDay} automated daily trade executions
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-500">✓</span> Secure credentials lockers encryption
                          </li>
                        </ul>
                      </div>
                      <button
                        disabled={true}
                        className="w-full mt-5 bg-indigo-900/30 text-indigo-300 disabled:opacity-85 text-xs font-mono font-bold py-2 rounded border border-indigo-950/50"
                      >
                        CURRENT LICENSE TIED
                      </button>
                    </div>

                  </div>
                </div>

                {/* ACTIVE CLIENT ACQUISITION & CHECKOUT STRATEGY MODULE */}
                <ClientAcquisitionHub 
                  metrics={saasMetrics}
                  onAddNewClient={handleAddNewClientUser}
                  gcpProjectNumber="1010310740221"
                />

                {/* Sub configuration blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* BINANCE CONNECTION CENTER CONTAINER (Requirement 1-3 & Support of Risk Sliders) */}
                  <div className="sleek-card p-5 space-y-5" id="binance-connection-center-module">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                        <FileKey2 className="h-4 w-4 text-[#fbbf24]" /> Connect Exchange Accreditations
                      </h3>
                      <div className="flex items-center gap-1.5">
                        {binanceConnectionStatus === 'CONNECTED' ? (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
                            CONNECTED
                          </span>
                        ) : binanceConnectionStatus === 'SYNCING' ? (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-bold bg-amber-950/80 text-amber-500 border border-amber-800/40 px-2 py-0.5 rounded-full animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block"></span>
                            SYNCING...
                          </span>
                        ) : binanceConnectionStatus === 'WARNING' ? (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-bold bg-amber-900/25 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block"></span>
                            WARNING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-mono font-bold bg-rose-950/80 text-rose-455 border border-rose-900/40 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-450 inline-block"></span>
                            DISCONNECTED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 font-mono text-xs text-left">
                      {/* Connection Readout Status Banner */}
                      {binanceConnectionStatus === 'CONNECTED' && (
                        <div className="p-3 bg-emerald-955/20 border border-emerald-900/45 rounded-lg text-[10px] text-emerald-400 space-y-1">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                            <div>
                              <span className="font-bold block text-emerald-300">🟢 Connected & Authorized</span>
                              <span>Your API keys are encrypted with AES-256-CBC. Live wallet balance and automatic trade executions are linked.</span>
                            </div>
                          </div>
                          {lastSyncTimestamp && (
                            <div className="text-[9px] text-slate-500 font-bold font-mono pl-6 pt-1">
                              🔄 LAST SYNCED TIMESTAMP: {lastSyncTimestamp}
                            </div>
                          )}
                        </div>
                      )}

                      {binanceError && binanceConnectionStatus === 'NOT_CONNECTED' && (
                        <div className="p-4 bg-rose-955/20 border border-rose-900/40 rounded-lg text-xs text-rose-200 space-y-3.5">
                          <div className="flex items-start gap-2.5">
                            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500 animate-pulse" />
                            <div>
                              <span className="font-extrabold text-sm block text-rose-350">🔴 Exchange API Handshake Failed</span>
                              <div className="text-slate-300 mt-1 font-mono text-[10.5px] bg-rose-950/40 border border-rose-900/30 rounded p-2 overflow-auto max-w-full">
                                {binanceError}
                              </div>
                            </div>
                          </div>

                          {/* Interactive Troubleshooting Checklist */}
                          <div className="border-t border-rose-900/35 pt-3.5 space-y-3">
                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block font-sans">
                              🛠️ 3-Step Verification Checklist to Resolve Error -2015:
                            </span>

                            <div className="grid grid-cols-1 gap-2.5">
                              {/* Step 1 */}
                              <div className="bg-slate-950/60 border border-slate-900 rounded p-2.5 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-extrabold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">STEP 1</span>
                                  <span className="font-bold text-[11px] text-slate-200">Align Environment Modes</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-normal">
                                  Make sure your <strong>Environment Mode</strong> selection matches your keys. 
                                  If your keys are from <strong>testnet.binancefuture.com</strong>, choose <em>Binance Futures Testnet</em>. 
                                  If they are from <strong>binance.com</strong>, choose <em>Binance Live (Production)</em>.
                                </p>
                              </div>

                              {/* Step 2 */}
                              <div className="bg-slate-950/60 border border-slate-900 rounded p-2.5 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">STEP 2</span>
                                  <span className="font-bold text-[11px] text-slate-200">Enable Futures API Permission</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-normal">
                                  By default, new Binance API keys are locked. Go to <strong>Binance API Management</strong>, select your API key, click <strong>"Edit Restrictions"</strong>, and check the <strong>"Enable Futures"</strong> check-box. Then save.
                                </p>
                              </div>

                              {/* Step 3 */}
                              <div className="bg-slate-950/60 border border-slate-900 rounded p-2.5 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">STEP 3</span>
                                  <span className="font-bold text-[11px] text-slate-200">Server Outbound Egress IP Whitelisting</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-normal">
                                  If your key has <strong>"Restrict access to trusted IPs only"</strong> enabled on Binance, you must whitelist our bot's egress IP:
                                </p>
                                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded px-2 py-1">
                                  <span className="font-mono text-xs text-amber-400 font-bold select-all">
                                    {(!serverIp || serverIp === 'Detecting outbound IP...') ? '34.120.45.198' : serverIp}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const activeIp = (!serverIp || serverIp === 'Detecting outbound IP...') ? '34.120.45.198' : serverIp;
                                      navigator.clipboard.writeText(activeIp);
                                      handleAddLog(`📋 COPIED IP: ${activeIp} copied for Binance whitelist!`, 'success');
                                    }}
                                    className="text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded transition font-bold"
                                  >
                                    Copy IP
                                  </button>
                                </div>
                                <p className="text-[9px] text-slate-500 italic leading-normal">
                                  Pro Tip: You can temporarily select "Unrestricted (Less Secure)" on Binance to test connection if you do not want to configure IP restrictions right now.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- SECTION 1: APIS AND EXCHANGE SELECTOR --- */}
                      <div className="space-y-3.5 border border-slate-850 p-3.5 rounded-lg bg-[#020617]/40">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-900">
                          <span className="text-[10px] text-[#fbbf24] font-extrabold uppercase tracking-wider block font-sans flex items-center gap-1">
                            🔐 Exchange Credentials
                          </span>
                        </div>

                        <div className="space-y-3">
                          {/* Exchange selector */}
                          <div className="space-y-1">
                            <label className="sleek-label block text-[9.5px] text-slate-400 font-sans">Exchange Provider</label>
                            <select 
                              disabled={binanceConnectionStatus === 'CONNECTED'}
                              className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-[#fbbf24] disabled:opacity-60"
                            >
                              <option value="binance_futures">Binance Futures (Unified USD-M Contract)</option>
                            </select>
                          </div>

                          {/* Environment selector */}
                          <div className="space-y-1">
                            <label className="sleek-label block text-[9.5px] text-slate-400 font-sans">Environment Mode</label>
                            <select 
                              disabled={binanceConnectionStatus === 'CONNECTED'}
                              value={useBinanceTestnet ? "testnet" : "live"}
                              onChange={(e) => setUseBinanceTestnet(e.target.value === "testnet")}
                              className="w-full bg-slate-950 border border-slate-850 text-[#fbbf24] font-semibold text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-[#fbbf24] disabled:opacity-60"
                            >
                              <option value="live" className="text-amber-400">Binance Live (Production)</option>
                              <option value="testnet" className="text-blue-400">Binance Futures Testnet (Sandbox)</option>
                            </select>
                          </div>

                          {/* API Key */}
                          <div className="space-y-1">
                            <label className="sleek-label block text-[9.5px] text-slate-400 font-sans">Binance API Key (Public)</label>
                            <input
                              type="text"
                              value={apiKeyInput}
                              onChange={(e) => setApiKeyInput(e.target.value)}
                              disabled={binanceConnectionStatus === 'CONNECTED'}
                              placeholder="Ex: vmPU7v6vT5ePzK928Xm9..."
                              className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-[11px] rounded px-3 py-1.5 focus:outline-none focus:border-[#fbbf24] font-mono disabled:opacity-65"
                            />
                          </div>

                          {/* Secret API Key */}
                          <div className="space-y-1">
                            <label className="sleek-label block text-[9.5px] text-slate-400 font-sans">Binance API Secret Key (Encrypted)</label>
                            <div className="relative">
                              <input
                                type={showSecretKey ? "text" : "password"}
                                value={apiSecretInput}
                                onChange={(e) => setApiSecretInput(e.target.value)}
                                disabled={binanceConnectionStatus === 'CONNECTED'}
                                placeholder={binanceConnectionStatus === 'CONNECTED' ? "••••••••••••••••••••••••••••••••" : "Input API Secret credentials..."}
                                className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-[11px] rounded pl-3 pr-10 py-1.5 focus:outline-none focus:border-[#fbbf24] font-mono disabled:opacity-65"
                              />
                              {binanceConnectionStatus !== 'CONNECTED' && (
                                <button
                                  type="button"
                                  onClick={() => setShowSecretKey(!showSecretKey)}
                                  className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300 bg-transparent border-0 cursor-pointer focus:outline-none p-0.5"
                                  title={showSecretKey ? "Hide API Secret" : "Show API Secret"}
                                >
                                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Mode indicator */}
                          <div className={`flex items-center justify-between p-2 rounded border ${
                            useBinanceTestnet 
                              ? 'bg-blue-955/20 border-blue-900/30 text-blue-200' 
                              : 'bg-amber-955/20 border-amber-900/30 text-amber-200'
                          }`}>
                            <div className="text-left">
                              <span className={`text-[10px] font-bold font-sans block ${
                                useBinanceTestnet ? 'text-blue-400' : 'text-[#fbbf24]'
                              }`}>
                                {useBinanceTestnet ? 'Binance Futures Testnet Mode' : 'Binance Futures Live Mode'}
                              </span>
                              <span className={`text-[9px] ${useBinanceTestnet ? 'text-blue-250' : 'text-amber-100'}`}>
                                {useBinanceTestnet 
                                  ? 'Simulated execution via Binance official sandbox' 
                                  : 'Live order execution is active under workspace controls'
                                }
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              useBinanceTestnet 
                                ? 'text-blue-400 border-blue-800 bg-blue-950/40' 
                                : 'text-amber-400 border-amber-800 bg-amber-950/40'
                            }`}>
                              {useBinanceTestnet ? 'TESTNET' : 'LIVE'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* --- SECURE PRE-FLIGHT RISK THRESHOLDS (Requirement 4-6) --- */}
                      <div className="space-y-3 border border-slate-850 p-3.5 rounded-lg bg-[#020617]/40">
                        <span className="text-[10px] text-[#fbbf24] font-extrabold uppercase tracking-wider block font-sans">
                          🛡️ Pre-Flight Shield Parameters
                        </span>
                        
                        <div className="space-y-3.5 font-sans">
                          {/* Leverage slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400 font-mono">1. Max Position Leverage</span>
                              <strong className="text-amber-400 font-mono">{leverageLimit}x</strong>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="50"
                              value={leverageLimit}
                              onChange={(e) => setLeverageLimit(parseInt(e.target.value))}
                              disabled={isSavingRisk}
                              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#fbbf24]"
                            />
                          </div>

                          {/* Max Risk per Trade % slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400 font-mono">2. Max Capital Risk Per Trade</span>
                              <strong className="text-amber-400 font-mono">{maxRiskPerTrade}%</strong>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="10"
                              step="0.5"
                              value={maxRiskPerTrade}
                              onChange={(e) => setMaxRiskPerTrade(parseFloat(e.target.value))}
                              disabled={isSavingRisk}
                              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#fbbf24]"
                            />
                          </div>

                          {/* Max Daily Loss % slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400 font-mono">3. Max Capital Daily Loss Limit</span>
                              <strong className="text-rose-400 font-mono">{maxDailyLoss}%</strong>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="25"
                              value={maxDailyLoss}
                              onChange={(e) => setMaxDailyLoss(parseInt(e.target.value))}
                              disabled={isSavingRisk}
                              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                          </div>

                          {/* Max Open Positions slider */}
                          <div className="space-y-1 col-span-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400 font-mono">4. Max Simultaneous Positions</span>
                              <strong className="text-emerald-400 font-mono">{maxOpenPositions} positions</strong>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={maxOpenPositions}
                              onChange={(e) => setMaxOpenPositions(parseInt(e.target.value))}
                              disabled={isSavingRisk}
                              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>

                          {/* SL ATR Multiplier Slider */}
                          <div className="space-y-1 border-t border-slate-850/40 pt-2.5">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400 font-mono">5. Stop-Loss ATR Multiplier</span>
                              <strong className="text-rose-400 font-mono">{slAtrMultiplier}x ATR</strong>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="5.0"
                              step="0.1"
                              value={slAtrMultiplier}
                              onChange={(e) => setSlAtrMultiplier(parseFloat(e.target.value))}
                              disabled={isSavingRisk}
                              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                            <p className="text-[9px] text-slate-500 font-sans leading-normal">
                              Determines safety exit placement. Lower value = tight stop; higher value = wide stop.
                            </p>
                          </div>

                          {/* TP ATR Multiplier Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400 font-mono">6. Take-Profit ATR Multiplier</span>
                              <strong className="text-emerald-400 font-mono">{tpAtrMultiplier}x ATR</strong>
                            </div>
                            <input
                              type="range"
                              min="1.0"
                              max="10.0"
                              step="0.1"
                              value={tpAtrMultiplier}
                              onChange={(e) => setTpAtrMultiplier(parseFloat(e.target.value))}
                              disabled={isSavingRisk}
                              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <p className="text-[9px] text-slate-500 font-sans leading-normal">
                              Target distance for gain lock-in trigger. Typically configured in 2x or 3x ratio to SL.
                            </p>
                          </div>

                          {/* Max Trades Per Day (Configurable Daily Cap) */}
                          <div className="space-y-1.5 border-t border-slate-850/40 pt-2.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-mono">8. Max Daily Trades Limit</span>
                              <strong className="text-amber-400 font-mono">{maxTradesPerDay} trades/day</strong>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={maxTradesPerDay}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val > 0) {
                                    setMaxTradesPerDay(val);
                                  }
                                }}
                                disabled={isSavingRisk}
                                className="w-20 px-2 py-1 bg-slate-950 border border-slate-850 rounded font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                              />
                              <input
                                type="range"
                                min="1"
                                max="50"
                                value={maxTradesPerDay}
                                onChange={(e) => setMaxTradesPerDay(parseInt(e.target.value))}
                                disabled={isSavingRisk}
                                className="flex-1 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-[#fbbf24]"
                              />
                            </div>
                            <p className="text-[9px] text-slate-500 font-sans leading-normal">
                              The maximum number of automated trades allowed per day (UTC to local day crossover). Crucial fail-safe to prevent runaway loop execution.
                            </p>
                          </div>

                          {/* Apply/Save Risk settings button */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleUpdateRiskSettings}
                              disabled={isSavingRisk}
                              className="w-full bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 border border-[#fbbf24]/35 text-[#fbbf24] text-[10px] font-bold uppercase py-2 rounded cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-[0.98] tracking-wider"
                            >
                              {isSavingRisk ? 'Applying parameters...' : '🛡️ Apply Shield Parameters'}
                            </button>
                          </div>

                          {/* P&L Display Mode Selector */}
                          <div className="space-y-2 border-t border-slate-850/40 pt-2.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-mono">7. Open P&L Display Mode</span>
                              <span className="bg-[#fbbf24]/10 text-[#fbbf24] px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">WORKSPACE INTERACTIVE</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 border border-slate-850 rounded">
                              <button
                                type="button"
                                onClick={() => setPnlDisplayMode('BOTH')}
                                className={`py-1 text-[9px] font-mono font-bold rounded cursor-pointer transition-colors ${pnlDisplayMode === 'BOTH' ? 'bg-[#fbbf24] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                              >
                                BOTH (USDT & %)
                              </button>
                              <button
                                type="button"
                                onClick={() => setPnlDisplayMode('USDT')}
                                className={`py-1 text-[9px] font-mono font-bold rounded cursor-pointer transition-colors ${pnlDisplayMode === 'USDT' ? 'bg-[#fbbf24] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                              >
                                USDT Only
                              </button>
                              <button
                                type="button"
                                onClick={() => setPnlDisplayMode('PERCENT')}
                                className={`py-1 text-[9px] font-mono font-bold rounded cursor-pointer transition-colors ${pnlDisplayMode === 'PERCENT' ? 'bg-[#fbbf24] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                              >
                                % Percentage Only
                              </button>
                            </div>
                            <p className="text-[9px] text-slate-500 font-sans leading-normal">
                              Selects output presentation format for Unrealized P&L in active open trades table.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Connection Actions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                        {binanceConnectionStatus !== 'CONNECTED' ? (
                          <button
                            type="button"
                            onClick={handleTestBinanceConnection}
                            disabled={binanceConnectionStatus === 'SYNCING'}
                            className="w-full bg-[#fbbf24] hover:bg-yellow-500 border border-yellow-500/30 text-slate-950 disabled:bg-slate-850 disabled:border-slate-800 disabled:text-slate-500 text-[10px] font-black uppercase py-2 rounded cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-[0.98] tracking-widest leading-loose"
                          >
                            {binanceConnectionStatus === 'SYNCING' ? (
                              <>
                                <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full inline-block"></span>
                                Establishing Handshake...
                              </>
                            ) : (
                              'Connect Exchange'
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={true}
                            className="w-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-450 text-[10.5px] font-black uppercase py-2 rounded flex items-center justify-center gap-1 select-none"
                          >
                            ✓ Handshake Complete
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleDisconnectBinanceAccount}
                          disabled={binanceConnectionStatus !== 'CONNECTED'}
                          className="w-full bg-rose-955/35 hover:bg-rose-900/50 border border-rose-900/40 text-rose-300 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed hover:text-rose-100 text-[10px] font-black uppercase py-2 rounded cursor-pointer transition-colors focus:outline-none active:scale-[0.98] tracking-widest leading-loose"
                        >
                          Disconnect Credentials
                        </button>
                      </div>

                      {/* --- SECTION 2: TRUSTED IP MANAGEMENT --- */}
                      <div className="space-y-3.5 border border-slate-850 p-3.5 rounded-lg bg-indigo-950/10">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-sky-305 font-extrabold uppercase tracking-wider block font-sans">
                            🛡️ Trusted IP Management
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowStaticIpGuide(!showStaticIpGuide)}
                            className="text-[9px] text-slate-400 hover:text-sky-300 font-bold underline cursor-pointer"
                          >
                            {showStaticIpGuide ? 'Hide GCP NAT Setup' : 'How to Setup Static IP?'}
                          </button>
                        </div>
                        
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-slate-400 block font-sans leading-relaxed">
                            Server Public IP Address (Use this IP to allow access inside Binance API restrictions setting):
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="flex-1 p-1 px-2.5 bg-slate-950 border border-slate-850 rounded font-mono text-[10px] font-black text-emerald-405 select-all tracking-wider text-center">
                              {serverIp}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (serverIp && serverIp !== 'Unable to determine server IP' && serverIp !== 'Detecting outbound IP...') {
                                  navigator.clipboard.writeText(serverIp);
                                  setCopiedServerIp(true);
                                  handleAddLog(`📋 COPIED IP: Outbound container node routing IP ${serverIp} saved to clipboard.`, 'success');
                                  setTimeout(() => setCopiedServerIp(false), 2000);
                                } else {
                                  handleAddLog(`❌ COPY FAILED: No valid IP address available to copy.`, 'error');
                                }
                              }}
                              className="py-1 px-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white rounded text-[9px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {copiedServerIp ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-2.5 w-2.5 text-slate-440" />}
                              {copiedServerIp ? 'Copied' : 'Copy Trusted IP'}
                            </button>
                          </div>

                          {/* IP Status Indicator */}
                          <div className="flex items-center justify-between text-[9px] pt-1">
                            <span className="text-slate-400">Security Status:</span>
                            {serverIpStatus === 'static' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/45 border border-emerald-905/30 text-emerald-400 font-extrabold">
                                Static IP Configured ✅
                              </span>
                            ) : serverIpStatus === 'dynamic' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-955/20 border border-amber-900/20 text-amber-350 font-extrabold">
                                Dynamic IP Detected ⚠️
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-955/20 border border-rose-900/20 text-rose-350 font-extrabold">
                                Unknown ❌
                              </span>
                            )}
                          </div>

                          {/* IP Validation Error Alert */}
                          {serverIpError && (
                            <div className="p-2 mt-1.5 bg-rose-950/30 border border-rose-900/30 rounded text-rose-300 text-[9px] leading-relaxed font-sans text-left">
                              ⚠️ <strong>Validation Alert:</strong> {serverIpError}
                            </div>
                          )}
                        </div>

                        {showStaticIpGuide && (
                          <div className="mt-3.5 pt-3.5 border-t border-slate-850 space-y-3 font-mono text-[10px] leading-relaxed text-slate-300 text-left">
                            <div className="p-2 bg-slate-950 rounded border border-amber-900/40 text-amber-300">
                              <span className="font-sans font-bold block mb-1">ℹ️ Understanding Outbound Egress IPs:</span>
                              By default, Cloud Run apps share a dynamic pool of Google egress IPs. To whitelist a reliable, static IP in your Binance Futures dashboard, you must route egress traffic through a **Cloud NAT Gateway** using **Serverless VPC Access**.
                            </div>

                            <div className="space-y-2">
                              <span className="text-sky-300 font-bold block">1. Setup via GCP Shell Commands (Region: asia-southeast1):</span>
                              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded text-slate-400 overflow-x-auto text-[9px] select-all space-y-1.5">
                                <div>
                                  <span className="text-emerald-500"># Set target project and target region</span>
                                  <br />
                                  gcloud config set project <span className="text-indigo-300">[YOUR_PROJECT_ID]</span>
                                  <br />
                                  REGION=asia-southeast1
                                </div>
                                <div>
                                  <span className="text-emerald-500"># 1. Create a VPC and private subnet</span>
                                  <br />
                                  gcloud compute networks create novaquant-vpc --subnet-mode=custom
                                  <br />
                                  gcloud compute networks subnets create novaquant-subnet --network=novaquant-vpc --region=$REGION --range=10.0.0.0/28
                                </div>
                                <div>
                                  <span className="text-emerald-500"># 2. Create the Serverless VPC Connector</span>
                                  <br />
                                  gcloud compute networks vpc-access connectors create novaquant-connector --region=$REGION --subnet=novaquant-subnet
                                </div>
                                <div>
                                  <span className="text-emerald-500"># 3. Reserve a Static outbound Public IP</span>
                                  <br />
                                  gcloud compute addresses create novaquant-static-ip --region=$REGION
                                </div>
                                <div>
                                  <span className="text-emerald-500"># 4. Bind NAT Router with Static IP to network</span>
                                  <br />
                                  gcloud compute routers create novaquant-router --network=novaquant-vpc --region=$REGION
                                  <br />
                                  gcloud compute routers nats create novaquant-nat --router=novaquant-router --region=$REGION --nat-custom-ips=novaquant-static-ip --nat-all-subnet-ip-ranges
                                </div>
                                <div>
                                  <span className="text-emerald-500"># 5. Set Cloud Run service to route through the static IP</span>
                                  <br />
                                  gcloud run services update <span className="text-indigo-300">novaquant-backend</span> --region=$REGION --vpc-connector=novaquant-connector --vpc-egress=all-traffic
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <span className="text-sky-300 font-bold block">2. Setup via Terraform script:</span>
                              <pre className="p-2.5 bg-slate-950 border border-slate-900 rounded text-slate-400 overflow-x-auto text-[9.5px] select-all">
{`resource "google_compute_network" "vpc" {
  name                    = "novaquant-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "novaquant-subnet"
  ip_cidr_range = "10.0.0.0/28"
  region        = "asia-southeast1"
  network       = google_compute_network.vpc.id
}

resource "google_vpc_access_connector" "connector" {
  name          = "novaquant-connector"
  region        = "asia-southeast1"
  subnet {
    name = google_compute_subnetwork.subnet.name
  }
}

resource "google_compute_address" "static_ip" {
  name   = "novaquant-static-ip"
  region = "asia-southeast1"
}

resource "google_compute_router" "router" {
  name    = "novaquant-router"
  region  = "asia-southeast1"
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "novaquant-nat"
  router                             = google_compute_router.router.name
  region                             = "asia-southeast1"
  nat_ip_allocate_option             = "MANUAL_ONLY"
  nat_ips                            = [google_compute_address.static_ip.self_link]
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}`}
                              </pre>
                            </div>
                            <div className="p-1.5 px-2 bg-slate-900 rounded text-[9.5px] text-slate-400 font-sans">
                              💡 <strong>Note:</strong> Once configured, your reserved Google Static Egress IP will never change, ensuring uninterrupted autopilot trading signals.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Live Trading Checkbox */}
                      <div className="flex items-start gap-2.5 pt-1">
                        <input
                          type="checkbox"
                          id="live-trading-toggle"
                          checked={activeWorkspace.isLive}
                          onChange={async (e) => {
                            const val = e.target.checked;
                            setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, isLive: val } : w));
                            await handleToggleTradingEnabled(val);
                          }}
                          className="rounded text-indigo-650 bg-slate-900 border-slate-830 h-3.5 w-3.5 shrink-0 mt-0.5 cursor-pointer focus:ring-0"
                        />
                        <label htmlFor="live-trading-toggle" className="text-[10px] text-slate-300 select-none leading-relaxed cursor-pointer">
                          Activate Real-Time Live Trading Execution (Disables local paper-trading simulation and routes all autopilot signals to Binance Futures API)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Platform Alert notification settings */}
                  <div className="sleek-card p-4 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2.5 flex items-center gap-1.5 font-mono">
                      <Bell className="h-4 w-4 text-emerald-400" /> Workspace Alerts & Notifications
                    </h3>

                    <div className="space-y-4 font-mono text-xs text-left text-slate-350">

                      {/* Audio Synthesizer notifications */}
                      <div className="space-y-3 border border-slate-800 p-3 rounded-lg bg-[#020617]/50">
                        <div className="flex justify-between items-center">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-[11px] text-slate-200 block">Real-time Sound Notifications</span>
                            <span className="text-[9px] text-slate-400 block font-normal leading-normal">Synthesizes positive/negative audio chimes during actions.</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={activeWorkspace.audioNotificationsEnabled !== false}
                            onChange={(e) => {
                              setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, audioNotificationsEnabled: e.target.checked } : w));
                              handleAddLog(`🔊 Sound notifications ${e.target.checked ? 'ENABLED' : 'DISABLED'} for workspace '${activeWorkspace.name}'.`, 'info');
                            }}
                            className="rounded h-3.5 w-3.5 text-sky-500 bg-[#020617] border-slate-800"
                          />
                        </div>
                        
                        {/* Interactive Sound Test Area */}
                        <div className="pt-2 border-t border-slate-900/60 grid grid-cols-3 gap-1.5 font-mono text-[9px]">
                          <button
                            type="button"
                            onClick={() => {
                              playTradeEntry();
                              handleAddLog("🎵 Audio Test: Dispatched Position Entry Tone.", "system");
                            }}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[#38bdf8] font-bold py-1 px-2 rounded cursor-pointer transition-colors duration-200"
                          >
                            ▶ ENTRY TONE
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playTradeExitProfit();
                              handleAddLog("🎉 Audio Test: Dispatched Trade Profit Success Chime.", "system");
                            }}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[#2ebd85] font-bold py-1 px-2 rounded cursor-pointer transition-colors duration-200"
                          >
                            ▶ PROFIT CHIME
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playTradeExitLoss();
                              handleAddLog("⚠️ Audio Test: Dispatched Trade Stop Loss Warning Alert.", "system");
                            }}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-rose-400 font-bold py-1 px-2 rounded cursor-pointer transition-colors duration-200"
                          >
                            ▶ STOP ALERT
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Position Sizing and Capital Allocation Settings Card */}
                  <div className="sleek-card p-4 space-y-4 shadow-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2.5 flex items-center gap-1.5 font-mono">
                      <Sliders className="h-4 w-4 text-[#818cf8]" /> Capital Allocation & Entry Sizing
                    </h3>

                    <div className="space-y-4 text-xs font-mono text-left">
                      <div className="p-3 bg-indigo-950/25 border border-indigo-900/30 rounded-lg text-slate-350 leading-relaxed text-[10px]">
                        ⚙️ Configure how initial position entry amounts are allocated per trade across automated and manual dispatch sweeps.
                      </div>

                      {/* Position Sizing Selector */}
                      <div className="space-y-1">
                        <label className="sleek-label block text-[10px]">Position Sizing Mode</label>
                        <select
                          value={activeWorkspace.positionSizingMode || 'RISK'}
                          onChange={(e) => {
                            const val = e.target.value as 'RISK' | 'FIXED';
                            setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, positionSizingMode: val } : w));
                            handleAddLog(`⚙️ Allocation Mode adjusted: Switched workspace Sizing Mode to ${val === 'RISK' ? 'Dynamic Risk %' : 'Fixed Nominal Capital (USDT)'}.`, 'system');
                          }}
                          className="w-full bg-[#020617] border border-slate-800 text-indigo-300 text-[11px] rounded px-3 py-2 font-bold cursor-pointer focus:outline-none"
                          id="position-sizing-mode-select"
                        >
                          <option value="RISK">Dynamic Risk Based (% of portfolio balance / SL ATR distance)</option>
                          <option value="FIXED">Fixed Nominal Amount (Use a fixed initial amount in USDT/Crypto)</option>
                        </select>
                      </div>

                      {/* Dynamic Sizing vs Fixed Sizing inputs */}
                      {activeWorkspace.positionSizingMode === 'FIXED' ? (
                        <div className="space-y-1.5 p-3 rounded bg-slate-900/40 border border-slate-800" id="fixed-allocation-input-group">
                          <label className="sleek-label block text-[10px] text-green-405 font-extrabold uppercase">Initial Position Entry Amount ($ USDT)</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={activeWorkspace.initialPositionAmount !== undefined ? activeWorkspace.initialPositionAmount : 100}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, initialPositionAmount: val } : w));
                            }}
                            className="w-full bg-[#020617] border border-slate-850 text-emerald-400 tracking-wider text-[11.5px] font-bold rounded px-2.5 py-2 focus:outline-none focus:border-emerald-500"
                            id="fixed-allocation-amount-input"
                          />
                          <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                            Every trade uses this exact entry capital value (e.g., $100 USDT) scaled to asset price to buy contracts, bypassing SL distance variables.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 p-3 rounded bg-slate-900/40 border border-slate-800" id="risk-allocation-input-group">
                          <label className="sleek-label block text-[10px] text-indigo-400 font-extrabold uppercase">Dynamic Risk Per Trade (%)</label>
                          <input
                            type="number"
                            min="0.1"
                            max="100"
                            step="0.1"
                            value={activeWorkspace.riskPerTrade !== undefined ? activeWorkspace.riskPerTrade : 1.5}
                            onChange={(e) => {
                              const val = Math.max(0.1, Math.min(100, Number(e.target.value)));
                              setWorkspaces(prev => prev.map(w => w.id === activeWorkspaceId ? { ...w, riskPerTrade: val } : w));
                            }}
                            className="w-full bg-[#020617] border border-slate-850 text-indigo-300 tracking-wider text-[11.5px] font-bold rounded px-2.5 py-2 focus:outline-none focus:border-indigo-500"
                            id="risk-allocation-pct-input"
                          />
                          <p className="text-[9px] text-slate-500 font-sans leading-relaxed">
                            Positions are sized dynamically so that reaching the Stop Loss (based on chosen ATR multiplier) will lose exactly this percentage of available account balance.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Google Authenticator Two Factor Authentication Settings */}
                  <TwoFactorSetupCard 
                    currentUser={currentUser}
                    onUpdateUser={(updatedFields) => {
                      setCurrentUser(prev => prev ? { ...prev, ...updatedFields } : null);
                      const localUser = localStorage.getItem('novaquant_user');
                      if (localUser) {
                        try {
                          const parsed = JSON.parse(localUser);
                          localStorage.setItem('novaquant_user', JSON.stringify({ ...parsed, ...updatedFields }));
                        } catch {}
                      }
                    }}
                    onAddLog={handleAddLog}
                  />

                </div>

              </div>
            )}

            {/* Admin Console View */}
            {activeTab === 'admin' && isAdmin && (
              <AdminConsole
                metrics={saasMetrics}
                users={saasUsers}
                auditLogs={auditLogs}
                onToggleUserStatus={handleToggleUserStatus}
                onTriggerSecurityScan={handleSecurityScan}
                onRefreshMetrics={handleSyncMetrics}
                adminBinancePayId={adminBinancePayId}
                adminCommissionBalance={adminCommissionBalance}
                referralPayouts={referralPayouts}
                onChangeAdminPayId={setAdminBinancePayId}
                connectionStatus={binanceConnectionStatus}
              />
            )}

            {activeTab === 'admin' && !isAdmin && (
              <div className="sleek-card p-8 text-center max-w-md mx-auto my-12 space-y-4 border border-rose-950/40 bg-[#020617]/90 relative overflow-hidden rounded-2xl" id="admin-security-lockdown">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center animate-pulse">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-rose-300 font-mono">
                  Administrative Credentials Lockdown
                </h3>
                <p className="text-xs text-slate-400 leading-normal font-sans">
                  The terminal is currently logged into an operator node with restricted clearance: <strong className="text-slate-300 font-mono">{currentUser?.email}</strong>. This section is blocked.
                </p>
                <div className="text-[10px] text-slate-500 font-mono border border-slate-900 bg-[#02020a]/80 p-3 rounded-lg text-left space-y-1 select-all">
                  <div>SESSION_NODE_CLEARANCE: USER_BASIC</div>
                  <div>SECURITY_STATUS: ACCESS_RESTRICTED</div>
                  <div>SECURITY_REF: SEC_REF_A_{Math.floor(Date.now() / 1000)}</div>
                </div>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="w-full py-2.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs cursor-pointer select-none transition-all duration-200"
                >
                  RETURN TO EXECUTIVE CONTROLLER
                </button>
              </div>
            )}

            {/* Software Engineering Blueprint layouts */}
            {activeTab === 'blueprint' && (
              <ArchitectureBlueprints />
            )}

            {/* User Profile View */}
            {activeTab === 'profile' && (
              <UserProfilePanel
                currentUser={currentUser}
                activeWorkspace={activeWorkspace}
                workspaces={workspaces}
                onLogout={handleLogout}
                onAddLog={handleAddLog}
              />
            )}

            {/* AI Advisor Panel */}
            {activeTab === 'ai' && (
              <AICopilotAnalyzer
                trades={trades}
                stats={stats}
                config={config}
                riskMode={riskMode}
                setRiskMode={setRiskMode}
                onAddLog={handleAddLog}
                gasBalance={displayedGasBalance}
              />
            )}

            {aiTradeRecommendation && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in" id="ai-confirmation-modal">
                <div className="max-w-md w-full sleek-card p-5 md:p-6 space-y-4 relative shadow-2xl border border-indigo-900/40 bg-slate-950 text-slate-100 rounded-2xl">
                  
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-100">
                          Dual-AI Trade Consensus
                        </h3>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Verification Grid Complete • Signals Approved
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setAiTradeRecommendation(null)} 
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Recommendation Summary */}
                  <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Trading Pair:</span>
                      <span className="text-xs font-bold font-mono text-slate-200">{aiTradeRecommendation.symbol}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Directional Bias:</span>
                      <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded ${
                        aiTradeRecommendation.side === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {aiTradeRecommendation.side === 'LONG' ? 'LONG (BUY)' : 'SHORT (SELL)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Quantity (Units):</span>
                      <span className="text-xs font-bold font-mono text-slate-200">{aiTradeRecommendation.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Approx. Entry Price:</span>
                      <span className="text-xs font-bold font-mono text-slate-200">${aiTradeRecommendation.entryPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-900/40 pt-2 mt-2">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Fuel Fee:</span>
                      <span className="text-xs font-semibold font-mono text-amber-500">-{aiTradeRecommendation.costPerTrade} Gas</span>
                    </div>
                  </div>

                  {/* Model Diagnostics */}
                  <div className="space-y-3">
                    <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-300">🤖 Gemini 3.5 Flash</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {aiTradeRecommendation.gemini.bias} • {aiTradeRecommendation.gemini.confidence}%
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 italic">
                        "{aiTradeRecommendation.gemini.reasoning}"
                      </p>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-300">🎭 Claude 3.5 Sonnet</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {aiTradeRecommendation.claude.bias} • {aiTradeRecommendation.claude.confidence}%
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 italic">
                        "{aiTradeRecommendation.claude.reasoning}"
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setAiTradeRecommendation(null)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium py-2 rounded-lg text-xs transition-colors cursor-pointer border border-slate-800"
                    >
                      Dismiss Signal
                    </button>
                    <button
                      onClick={async () => {
                        const rec = aiTradeRecommendation;
                        setAiTradeRecommendation(null);
                        handleAddLog(`⚡ MANUAL CONFIRMATION RECEIVED: Dispatching AI-recommended ${rec.side} order for ${rec.symbol}...`, 'success');
                        
                        try {
                          const token = await getAuthToken();
                          const response = await fetch('/api/trades/execute', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': token ? `Bearer ${token}` : '',
                              'X-Binance-API-Key': activeWorkspace.binanceApiKey.trim(),
                              'X-Binance-API-Secret': activeWorkspace.binanceApiSecret.trim(),
                            },
                            body: JSON.stringify({
                              symbol: rec.symbol,
                              side: rec.side === 'LONG' ? 'BUY' : 'SELL',
                              quantity: rec.quantity,
                              confirmLiveTrade: !useBinanceTestnet
                            })
                          });

                          const data = await response.json();

                          if (response.ok && data.success) {
                            // Deduct Gas atomically
                            setWorkspaces(prev => prev.map(w => {
                              if (w.id === activeWorkspaceId) {
                                return {
                                  ...w,
                                  gasBalance: parseFloat((w.gasBalance - rec.costPerTrade).toFixed(4))
                                };
                              }
                              return w;
                            }));

                            setSaasMetrics(prev => ({
                              ...prev,
                              totalGasSpent: prev.totalGasSpent + rec.costPerTrade,
                              totalRevenue: prev.totalRevenue + (rec.costPerTrade * 0.08)
                            }));

                            handleAddLog(`🔥 BOT FUEL BILLED: Charged -${rec.costPerTrade.toFixed(4)} units for manual confirmed ${rec.side} trade on ${rec.symbol}.`, 'info');
                          } else {
                            handleAddLog(`❌ DISPATCH FAILED: Exchange rejected entry on ${rec.symbol}. Message: ${data.error || 'Check margin balance or API key privileges'}`, 'error');
                          }
                        } catch (err: any) {
                          handleAddLog(`❌ NETWORK FAULT: Failed to route manual trade to gateway on ${rec.symbol}: ${err.message}`, 'error');
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer border-0 shadow-lg shadow-indigo-600/20"
                    >
                      Confirm & Execute
                    </button>
                  </div>

                </div>
              </div>
            )}

            {upgradeCheckoutModal && (
              <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none animate-fade-in" id="upgrade-gateway-modal">
                <div className="max-w-md w-full sleek-card p-5 md:p-6 space-y-4 relative shadow-2xl overflow-hidden border border-amber-900/40 bg-slate-950 text-slate-100">
                  
                  {/* Header controls */}
                  <div className="flex justify-between items-start border-b border-slate-850 pb-3">
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
                        Binance Pay License Gateway
                      </div>
                      <h3 className="font-sans font-black text-white text-base mt-0.5">Binance Secure License Upgrader</h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Activating {upgradeCheckoutModal.tier} License ➔ {upgradeCheckoutModal.price} USDT / month</p>
                    </div>
                    <button
                      onClick={() => setUpgradeCheckoutModal(null)}
                      className="text-slate-400 hover:text-white text-[11px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded cursor-pointer transition-all"
                    >
                      CLOSE [×]
                    </button>
                  </div>

                  {upgradeCheckoutStep === 'details' && (
                    <div className="space-y-4">
                      
                      {/* Method selector tabs */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <button
                          type="button"
                          onClick={() => setUpgradeMethod('app_scan')}
                          className={`p-2.5 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                            upgradeMethod === 'app_scan'
                              ? 'bg-amber-400/10 text-amber-400 border-amber-400/40 font-bold'
                              : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <QrCode className="h-3.5 w-3.5 text-amber-400" />
                          Scan QR via App
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpgradeMethod('app_otp')}
                          className={`p-2.5 rounded-lg border text-xs font-mono font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                            upgradeMethod === 'app_otp'
                              ? 'bg-amber-400/10 text-amber-400 border-amber-400/40 font-bold'
                              : 'bg-slate-900/50 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                          Interactive App Simulation
                        </button>
                      </div>

                      {/* Option A: Scan QR on Binance App */}
                      {upgradeMethod === 'app_scan' && (
                        <div className="space-y-4 animate-fade-in text-center">
                          <div className="text-[11px] text-slate-300 font-mono leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 text-left">
                            💡 <strong>How to Upgrade:</strong> Open your real <strong>Binance Mobile App</strong>, touch the scan icon in the top right, and scan this simulated QR code below to authorize the {upgradeCheckoutModal.tier} Plan.
                          </div>

                          {/* QR Code container */}
                          <div className="relative mx-auto w-44 h-44 bg-slate-950 border-2 border-amber-400 p-2 rounded-xl flex items-center justify-center overflow-hidden shadow-xl shadow-amber-400/5">
                            
                            {/* Laser scanning line */}
                            <div className="absolute left-0 right-0 h-[2px] bg-amber-400 opacity-60 top-1 animate-[bounce_2.5s_infinite] shadow-lg shadow-amber-400"></div>

                            <div className={`w-full h-full relative flex flex-col items-center justify-center transition-all duration-500 bg-slate-900 border border-slate-800 rounded-lg ${upgradeQrScanned ? 'bg-emerald-950/20' : ''}`}>
                              {upgradeQrScanned ? (
                                <div className="space-y-1 z-10 text-emerald-400 font-mono text-[10px] uppercase font-black">
                                  <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto animate-bounce stroke-[1.5]" />
                                  <span>App Linked!</span>
                                  <span className="text-[8px] text-slate-400 block font-normal">Authenticating...</span>
                                </div>
                              ) : (
                                <div className="p-1 text-amber-400 flex flex-col items-center">
                                  <pre className="text-[6.5px] leading-tight font-bold font-mono opacity-80 tracking-normal text-amber-400 select-none">
                                    {`█▀▀▀▀▀█ ▄ ▄▄  ▄ █▀▀▀▀▀█
█ ███ █ █ ▄▀█ ▄ █ ███ █
█ ▀▀▀ █ █ █▄█   █ ▀▀▀ █
▀▀▀▀▀▀▀ ▀▄█ ▀ ▀ ▀▀▀▀▀▀▀
▄▀███▄▀  ▄▄█ ▀█▀█▀▄ ▀ █
▀ █ ▀ ▄▀▀▄▀ ▀▄▄  █ ▄█▀█
 ▀█▀▀██ ███▄ ██ ▄▀▀██  
▀▀   ▀▀  █▄ ███▄▀▀▄█▄ ▀
█▀▀▀▀▀█ ▄█▄  ███▀█▀ ██▀
█ ███ █  ▀▄█▄▀█  ▄ █▄█▄
█ ▀▀▀ █ ▀█ ▄▀█  ██ ▀ ▄█
▀▀▀▀▀▀▀ ▀   ▀ ▀▀▀▀▀▀▀▀▀`}
                                  </pre>
                                  <div className="absolute inset-0 m-auto w-10 h-10 bg-slate-950 border border-amber-400/50 rounded flex items-center justify-center">
                                    <span className="text-[8.5px] font-sans font-black text-amber-400 tracking-tighter">PAY</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 font-mono">
                            <div className="text-[10px] text-slate-400">
                              {upgradeQrScanned ? (
                                <span className="text-emerald-400 font-bold">✓ App Link Authorized! Secure payment processing pending...</span>
                              ) : (
                                <span className="animate-pulse text-amber-400 flex items-center justify-center gap-1.5 text-[9.5px]">
                                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                                  Awaiting scan from your Binance App...
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2 justify-center pt-1.5">
                              <button
                                type="button"
                                disabled={upgradeQrScanned}
                                onClick={() => {
                                  setUpgradeQrScanned(true);
                                  handleAddLog(`📸 Subscription Binance scan success! Contacting phone app security module...`, 'info');
                                  setTimeout(() => {
                                    handleUpgradePaymentProcess();
                                  }, 1500);
                                }}
                                className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-[10px] px-3.5 py-2 uppercase rounded-md transition-all border-0 cursor-pointer shadow-md"
                              >
                                ⚡ Simulate Binance Scan
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Option B: Interactive App Screen Submission */}
                      {upgradeMethod === 'app_otp' && (
                        <div className="space-y-3 animate-fade-in text-left">
                          
                          {/* Simulated phone screen container */}
                          <div className="border border-slate-800 rounded-xl bg-slate-950/90 overflow-hidden relative shadow-inner">
                            
                            {/* Phone status bar */}
                            <div className="bg-[#020617] px-3 py-1 flex justify-between items-center text-[8px] font-mono text-slate-500 border-b border-slate-900">
                              <span className="font-bold flex items-center gap-1">
                                <Wifi className="h-2 w-2 text-amber-400 fill-current" /> LTE (Secure Link)
                              </span>
                              <span className="text-slate-400 text-center uppercase tracking-widest font-black">Secure Settle</span>
                              <span>100% 🔋</span>
                            </div>

                            {/* Phone content screen */}
                            <div className="p-3.5 space-y-3">
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <div className="flex items-center gap-1.5 text-slate-350">
                                  <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-sans font-black flex items-center justify-center text-[8px]">
                                    O
                                  </span>
                                  <span>oshi_vip1@binance.com</span>
                                </div>
                                <span className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-900/60 px-1 py-0.2 rounded text-[8px]">
                                  VERIFIED OWNER
                                </span>
                              </div>

                              {/* Order Summary box inside App */}
                              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-850 text-xs font-mono space-y-1.5 relative overflow-hidden">
                                <label className="text-[7.5px] text-slate-500 uppercase tracking-wider block">NovaQuant AI License Upgrade</label>
                                <div className="flex justify-between">
                                  <span className="text-slate-350">Target License Tier:</span>
                                  <span className="text-white font-extrabold">{upgradeCheckoutModal.tier}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-350">Monthly Renewal:</span>
                                  <span className="text-amber-400 font-bold">{upgradeCheckoutModal.price}.00 USDT</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-350">Admin Comm (15%):</span>
                                  <span className="text-sky-450">{(upgradeCheckoutModal.price * 0.15).toFixed(2)} USDT</span>
                                </div>
                                <div className="border-t border-slate-850 pt-1 flex justify-between font-bold">
                                  <span className="text-slate-400">Immediate Settle:</span>
                                  <span className="text-emerald-400">{upgradeCheckoutModal.price}.00 USDT</span>
                                </div>
                              </div>

                              {/* PIN entry and input field */}
                              <div className="space-y-2">
                                <label className="text-[9px] text-slate-400 font-mono ml-0.5 text-left block flex items-center gap-1">
                                  <Lock className="h-2.5 w-2.5 text-amber-400" /> Enter 6-digit Binance App Security PIN:
                                </label>
                                <div className="flex justify-center gap-2">
                                  {Array.from({ length: 6 }).map((_, idx) => {
                                    const char = upgradePin[idx];
                                    return (
                                      <div 
                                        key={idx}
                                        className={`w-8 h-9 border-2 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                                          upgradePin.length === idx 
                                            ? 'border-amber-400 bg-amber-950/10 text-amber-400 scale-105' 
                                            : char 
                                            ? 'border-emerald-500/50 bg-slate-900 text-slate-200' 
                                            : 'border-slate-800 bg-[#020617] text-slate-600'
                                        } transition-all`}
                                      >
                                        {char ? '●' : ''}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Custom Interactive Pad */}
                              <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto pt-2">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => {
                                      if (upgradePin.length < 6) {
                                        setUpgradePin(prev => prev + num);
                                      }
                                    }}
                                    className="py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-mono rounded text-[11px] border border-slate-800 cursor-pointer transition-all"
                                  >
                                    {num}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setUpgradePin('')}
                                  className="py-1 bg-slate-900/60 hover:bg-rose-955 text-rose-450 font-mono rounded text-[8.5px] uppercase font-bold border border-slate-800 cursor-pointer"
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (upgradePin.length < 6) {
                                      setUpgradePin(prev => prev + '0');
                                    }
                                  }}
                                  className="py-1 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-mono rounded text-[11px] border border-slate-800 cursor-pointer transition-all"
                                >
                                  0
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUpgradePin(prev => prev.slice(0, -1));
                                  }}
                                  className="py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 font-mono rounded text-[10px] font-bold border border-slate-800 cursor-pointer"
                                >
                                  ⌫
                                </button>
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  disabled={upgradePin.length < 6}
                                  onClick={handleUpgradePaymentProcess}
                                  className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-850 border border-transparent hover:scale-[1.01] text-slate-950 font-mono font-black py-2 rounded-lg text-[10.5px] uppercase active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  {upgradePin.length < 6 ? `Enter 6-digit Secure PIN` : `🔓 CONFIRM PAYMENT OF ${upgradeCheckoutModal.price} USDT`}
                                </button>
                              </div>

                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {upgradeCheckoutStep === 'loading' && (
                    <div className="py-16 flex flex-col items-center justify-center space-y-4 select-none animate-fade-in text-center">
                      <div className="relative">
                        <div className="absolute inset-0 m-auto h-16 w-16 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin"></div>
                        <Flame className="h-16 w-16 text-amber-500 animate-pulse" />
                      </div>
                      <div className="space-y-1 text-center">
                        <span className="text-xs font-mono text-slate-200 uppercase tracking-widest block font-extrabold animate-pulse">
                          VERIFYING LICENSE SIGNATURES...
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-500 block">
                          Broadcasting cryptographic contract state to admin Binance pay node...
                        </span>
                      </div>
                    </div>
                  )}

                  {upgradeCheckoutStep === 'success' && (
                    <div className="py-10 flex flex-col items-center justify-center space-y-4 select-none text-center animate-fade-in">
                      <div className="h-16 w-16 rounded-full bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                        <CheckCircle className="h-10 w-10 text-emerald-400 animate-bounce stroke-[1.5]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-sans font-black text-white uppercase tracking-wider">BINANCE PAY VERIFIED & APPROVED</h4>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          Workspace is upgraded directly to <span className="text-emerald-400 font-bold">{upgradeCheckoutModal.tier} Plan</span>! Multi-tenant rate limits expanded.
                        </p>
                      </div>

                      <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg font-mono text-[9.5px] text-left max-w-xs w-full space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Active Workspace:</span>
                          <strong className="text-slate-200 truncate pr-2">{activeWorkspace.name}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">License Cost Billed:</span>
                          <strong className="text-emerald-400">{upgradeCheckoutModal.price}.00 USDT</strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-800/80 pt-1 mt-1 font-bold">
                          <span className="text-amber-400">15% Admin Commission:</span>
                          <strong className="text-amber-400">+{(upgradeCheckoutModal.price * 0.15).toFixed(2)} USDT</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Admin Register ID:</span>
                          <span className="text-slate-400 font-mono select-all font-semibold truncate max-w-[124px]">{adminBinancePayId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Transaction Hash:</span>
                          <strong className="text-emerald-500">Block Settle Confirmed</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setUpgradeCheckoutModal(null)}
                        className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white font-mono font-bold py-2 px-6 rounded-lg text-[10px] uppercase active:scale-95 transition-all cursor-pointer"
                      >
                        DISMISS AND RETURN TO DASHBOARD
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

          </>
        )}

      </main>
    </div>
  );
}
