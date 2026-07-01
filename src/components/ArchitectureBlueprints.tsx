/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, FileCode, Database, Server, Smartphone, LayoutGrid, Terminal } from 'lucide-react';

export default function ArchitectureBlueprints() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const snippets = {
    flutterStructure: `legas_ai_mobile/
├── android/                  # Native Android files
├── ios/                      # Native iOS files
├── web/                      # Native Web wrapper configuration
├── assets/
│   ├── brand/                # App Launcher logos & graphics
│   └── fonts/                # Custom font weights (Inter, JetBrains Mono)
└── lib/
    ├── main.dart             # Application initialization entry
    ├── app.dart              # Material/Cupertino App & routing config
    ├── core/
    │   ├── constants/        # API Endpoints, app constants, theme specs
    │   ├── errors/           # Exception classes & error handlers
    │   ├── network/          # Http client wrapper (Dio) with interceptors
    │   ├── services/         # Secure storage, local database, notifications
    │   └── utils/            # Extrapolators, helpers, cryptographic wrappers
    ├── data/
    │   ├── models/           # JSON translation objects (User, Position, Workspace, GasTx)
    │   ├── providers/        # Backend Gateway WebSockets & HTTP agents
    │   └── repositories/     # Data orchestrators coordinating local + remote data
    ├── domain/
    │   ├── entities/         # Framework-agnostic pure entity structures
    │   └── usecases/         # Business logic units (ExecuteTrade, PurchaseGas, SwitchWorkspace)
    └── presentation/
        ├── state/            # State management system controllers (BLoC / Riverpod / Signals)
        │   ├── auth/
        │   ├── workspaces/
        │   ├── trades/
        │   └── gas_tank/
        ├── widgets/          # Atomic UI elements (Input fields, charts, state-pills)
        └── screens/          # Primary app views:
            ├── login_screen.dart
            ├── dashboard_screen.dart
            ├── active_trades_screen.dart
            ├── gas_tank_screen.dart
            ├── subscription_screen.dart
            └── admin_panel_screen.dart`,

    nestjsStructure: `ugas-ai-backend/
├── src/
│   ├── main.ts                       # App starter; boots CORS, Swagger, validation pipes
│   ├── app.module.ts                 # Directs imports for core engine sub-modules
│   ├── config/                       # Env configurations & database connector modules
│   ├── common/
│   │   ├── guards/                   # JWT & OAuth access and RBAC authorization guards
│   │   ├── interceptors/             # Audit logs parser & centralized response metrics
│   │   ├── middleware/               # Express rate-limiter & request proxy routers
│   │   └── decorators/               # Injectable helpers (CurrentUser, Roles, Tenant)
│   ├── modules/
│   │   ├── auth/                     # JWT, Google, and Telegram authentication controllers
│   │   ├── workspaces/               # Workspace metadata, user assignments & Multi-Tenancy
│   │   ├── exchanges/                # Binance API credential managers and encryption services
│   │   ├── ai-engine/                # Indicator processors (EMA, RSI, MACD, Bollinger Bands, ATR)
│   │   ├── trading/                  # Autopilot execution engine with precision risk rules
│   │   ├── gas-tank/                 # AI Gas billing pipeline, ledger ledger & stripe adapters
│   │   ├── subscriptions/            # Subscription tier matrices, interval cron, and webhook receivers
│   │   ├── notifications/            # Telegram Bot alerts, SMTP email and Push dispatchers
│   │   └── admin/                    # Audit logs recorder, server monitor & superuser dashboards
└── test/                             # Unit, continuous integration, and E2E coverage suites`,

    postgesSchema: `CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  name VARCHAR(100),
  hashed_password VARCHAR(255),
  telegram_id VARCHAR(100) UNIQUE,
  google_id VARCHAR(100) UNIQUE,
  role VARCHAR(50) DEFAULT 'USER', -- ADMIN, USER, PARTNER
  mfa_secret VARCHAR(100),
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'BASIC', -- BASIC, PRO, ENTERPRISE
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
  binance_api_key BYTEA, -- Encrypted API key
  binance_api_secret BYTEA, -- Encrypted Secret
  telegram_chat_id VARCHAR(100),
  telegram_alerts_enabled BOOLEAN DEFAULT FALSE,
  email_alerts_enabled BOOLEAN DEFAULT FALSE,
  email_address VARCHAR(255),
  is_live_trading BOOLEAN DEFAULT FALSE,
  gas_balance NUMERIC(12, 4) DEFAULT 100.0000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_workspace_name_owner UNIQUE(name, owner_id)
);

CREATE TABLE IF NOT EXISTS gas_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  amount NUMERIC(12, 4) NOT NULL, -- negative for trade burn, positive for top-up
  type VARCHAR(50) NOT NULL, -- CONSUMPTION, PURCHASE, BONUS, REFUND
  details TEXT,
  reference_id VARCHAR(255), -- Stripe ID, blockchain transaction hash or system audit ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL, -- LONG, SHORT
  entry_price NUMERIC(16, 8) NOT NULL,
  exit_price NUMERIC(16, 8),
  size NUMERIC(16, 8) NOT NULL,
  profit_loss NUMERIC(16, 8),
  leverage INTEGER DEFAULT 10,
  margin NUMERIC(16, 8) NOT NULL,
  gas_consumed NUMERIC(12, 4) DEFAULT 0.0000,
  stop_loss NUMERIC(16, 8),
  take_profit NUMERIC(16, 8),
  exit_reason VARCHAR(50), -- TP, SL, PANIC, MANUAL
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_trades_workspace ON trades(workspace_id);
CREATE INDEX idx_gas_workspace ON gas_transactions(workspace_id);

CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  model_version VARCHAR(50) NOT NULL, -- EMA_RSI_V1, GEMINI_COSMIC_V1
  prediction_type VARCHAR(30) NOT NULL, -- TREND_REVERSAL, TRIGGERCHECK
  signal_direction VARCHAR(10) NOT NULL, -- BULLISH, BEARISH
  probability NUMERIC(5, 2) NOT NULL, -- confidence level (e.g. 84.50%)
  indicator_telemetry JSONB, -- stores {rsi: 58.4, ema_diff: 1.25, atr: 1.12}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL, -- TELEGRAM, EMAIL, PUSH
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SENT, FAILED
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  subscription_revenue NUMERIC(16, 2) DEFAULT 0.00,
  gas_revenue NUMERIC(16, 2) DEFAULT 0.00,
  total_revenue NUMERIC(16, 2) DEFAULT 0.00,
  active_subscribers_count INTEGER DEFAULT 0,
  total_nodes_deployed INTEGER DEFAULT 0
);

CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_predictions_symbol ON ai_predictions(symbol);`,

    redisCache: `# User session caches (key format: user:sessions:<user_id>)
# Stores fast accessible session identifiers
SET user:sessions:bf9452c9-d2b5 "jwt_token_claims" EX 86400

# Binance Live Market Order Books Cached (Format: market:orderbook:<symbol>)
# Flushed and re-written every 1500ms
HMSET market:orderbook:BTCUSDT ask 68412.50 bid 68412.30 volume 1420.41

# AI Gas balance state fast lookups
# Decrements in O(1) immediately on trade trigger verification
SET workspace:gas:bf911aa-cc12 250.0000
DECRBY workspace:gas:bf911aa-cc12 1.5000`,

    dockerConfigs: `# ===== docker-compose.yml =====
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ugas-ai-postgres
    environment:
      POSTGRES_DB: ugas_ai_db
      POSTGRES_USER: ugas_ai_admin
      POSTGRES_PASSWORD: SecureSaaSPassword102
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - ugas-ai-network

  redis:
    image: redis:7-alpine
    container_name: ugas-ai-redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass RedisStrongPassword67
    volumes:
      - redis_data:/data
    networks:
      - ugas-ai-network

  backend:
    build:
      context: ./ugas-ai-backend
      dockerfile: Dockerfile
    container_name: ugas-ai-nestjs
    environment:
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_USER: ugas_ai_admin
      DATABASE_PASSWORD: SecureSaaSPassword102
      DATABASE_NAME: ugas_ai_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: RedisStrongPassword67
      JWT_SECRET: ProductionSuperSecretAuthKey99
      ENCRYPTION_SECRET: BinanceCredSecureAes256SecretKey
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis
    networks:
      - ugas-ai-network

volumes:
  postgres_data:
  redis_data:

networks:
  ugas-ai-network:
    driver: bridge`,

    apiSpecs: `// 🔒 UGAS AI Core REST endpoints structure

// 1. Authentication Module & RBAC
POST /api/v1/auth/register          # Register secondary tenant profiles
POST /api/v1/auth/login             # Authenticate credentials back JWT Token
POST /api/v1/auth/telegram          # Validate Telegram hash & authentication
POST /api/v1/auth/google            # Google single-sign-on validation check

// 2. Multi-Tenant Workspaces
GET    /api/v1/workspaces           # List workspaces accessible to User
POST   /api/v1/workspaces           # Create workspace (Alpha Desk, Scalping Fund)
PUT    /api/v1/workspaces/:id       # Update config, Risk multiplier & Alerts config
DELETE /api/v1/workspaces/:id       # Liquidate & delete workspace

// 3. Binance Key Credential Locker
POST   /api/v1/workspaces/:id/keys  # Cryptographically Encrypted exchange save
DELETE /api/v1/workspaces/:id/keys  # Terminate API credentials

// 4. Gas Tank Pipeline Ledger
GET  /api/v1/workspaces/:id/gas/balance  # Fetch UGAS AI Gas Balance
POST /api/v1/workspaces/:id/gas/purchase # Stripe / Telegram Stars Gas topup webhook
GET  /api/v1/workspaces/:id/gas/ledger   # Full gas billing and consumption ledger

// 5. AI Auto Trade Dispatcher & Backtesting
POST /api/v1/trading/backtest       # Calculate past metric runs (1000 candles)
POST /api/v1/trading/emergency-stop # Immediate workspace-wide panic stops`,

    nestjsServiceCode: `// NestJS Service Logic: Automated Trade Execution with AI Gas Deduction
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { Trade } from './entities/trade.entity';
import { GasTransaction } from './entities/gas-transaction.entity';

@Injectable()
export class AutoTradingService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Workspace) private workspaceRepo: Repository<Workspace>,
    @InjectRepository(Trade) private tradeRepo: Repository<Trade>,
  ) {}

  async executeAITrade(workspaceId: string, signal: { symbol: string; side: 'LONG' | 'SHORT'; price: number }) {
    // We enforce atomic transactions to prevent double spends on gas & double trades
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Pessimistic lock workspace row for secure gas check
      const workspace = await queryRunner.manager.findOne(Workspace, {
        where: { id: workspaceId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!workspace) throw new BadRequestException('Workspace does not exist');
      
      // Cost per automated execution
      const gasCost = 1.5000; 

      // 2. Check AI Gas fuels
      if (Number(workspace.gas_balance) < gasCost) {
        throw new BadRequestException('Insufficient AI Gas Tank Fuel. Refill instantly to resume Autopilot.');
      }

      // 3. Subtract gas atomically
      workspace.gas_balance = Number(workspace.gas_balance) - gasCost;
      await queryRunner.manager.save(Workspace, workspace);

      // 4. Log AI Gas ledger event
      const gasTx = new GasTransaction();
      gasTx.workspace_id = workspace.id;
      gasTx.amount = -gasCost;
      gasTx.type = 'CONSUMPTION';
      gasTx.details = \`AI Signal Triggered: \${signal.symbol} \${signal.side} entered around \${signal.price}\`;
      await queryRunner.manager.save(GasTransaction, gasTx);

      // 5. Launch Binance API Exec Order (Represented inside database state)
      const trade = new Trade();
      trade.workspace_id = workspace.id;
      trade.symbol = signal.symbol;
      trade.side = signal.side;
      trade.entry_price = signal.price;
      trade.size = 0.5; // Calculated via risk policy rules
      trade.margin = (signal.price * 0.5) / 10; // 10x leverage
      trade.gas_consumed = gasCost;
      await queryRunner.manager.save(Trade, trade);

      await queryRunner.commitTransaction();
      return { success: true, trade, remainingGas: workspace.gas_balance };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}`
  };

  return (
    <div className="space-y-6" id="architecture-blueprints-container">
      <div className="sleek-card p-5 shadow-xl">
        <h2 className="text-lg font-sans font-bold text-white flex items-center gap-2 mb-2">
          <Server className="h-5 w-5 text-sky-400" />
          NovaQuant Bot Fuel Production System Architecture & Folder Blueprints
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
          NovaQuant Bot Fuel uses a multi-platform single-base frontend (Flutter) coupled to a robust multi-tenant 
          orchestrated backend service powered by NestJS, PostgreSQL durable storage, and high-performance Redis cache clusters.
          Below are the production folder structures, cryptographic database schemas, Docker profiles, API rules, and code snippets.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Flutter Directory */}
        <div className="sleek-card p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#38bdf8] flex items-center gap-1.5 font-mono">
              <Smartphone className="h-4 w-4" /> Flutter Cross-Platform Bundle Layout
            </h3>
            <button
              onClick={() => copyToClipboard(snippets.flutterStructure, 'flutter')}
              className="px-2 py-1 text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border-0 cursor-pointer"
            >
              {copiedId === 'flutter' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedId === 'flutter' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] bg-[#020617]/90 p-3 rounded font-mono text-emerald-400 overflow-x-auto max-h-[350px]">
            {snippets.flutterStructure}
          </pre>
        </div>

        {/* NestJS backend folder */}
        <div className="sleek-card p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#818cf8] flex items-center gap-1.5 font-mono">
              <LayoutGrid className="h-4 w-4" /> NestJS Backend micro-architectures
            </h3>
            <button
              onClick={() => copyToClipboard(snippets.nestjsStructure, 'nestjs')}
              className="px-2 py-1 text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border-0 cursor-pointer"
            >
              {copiedId === 'nestjs' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedId === 'nestjs' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] bg-[#020617]/90 p-3 rounded font-mono text-[#818cf8] overflow-x-auto max-h-[350px]">
            {snippets.nestjsStructure}
          </pre>
        </div>

        {/* PostgreSQL Database schemas */}
        <div className="sleek-card p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
              <Database className="h-4 w-4" /> PostgreSQL Relational DB Schemas
            </h3>
            <button
              onClick={() => copyToClipboard(snippets.postgesSchema, 'postgres')}
              className="px-2 py-1 text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border-0 cursor-pointer"
            >
              {copiedId === 'postgres' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedId === 'postgres' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] bg-[#020617]/90 p-3 rounded font-mono text-slate-300 overflow-x-auto max-h-[350px]">
            {snippets.postgesSchema}
          </pre>
        </div>

        {/* Redis speed configurations */}
        <div className="sleek-card p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
              <Terminal className="h-4 w-4" /> Redis Cash Operations (Memory-safe)
            </h3>
            <button
              onClick={() => copyToClipboard(snippets.redisCache, 'redis')}
              className="px-2 py-1 text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border-0 cursor-pointer"
            >
              {copiedId === 'redis' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedId === 'redis' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] bg-[#020617]/90 p-3 rounded font-mono text-amber-300 overflow-x-auto max-h-[350px]">
            {snippets.redisCache}
          </pre>
        </div>

        {/* REST API specs */}
        <div className="sleek-card p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 font-mono">
              <FileCode className="h-4 w-4" /> SaaS REST API Endpoints Contract
            </h3>
            <button
              onClick={() => copyToClipboard(snippets.apiSpecs, 'apis')}
              className="px-2 py-1 text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border-0 cursor-pointer"
            >
              {copiedId === 'apis' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedId === 'apis' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] bg-[#020617]/90 p-3 rounded font-mono text-sky-300 overflow-x-auto max-h-[350px]">
            {snippets.apiSpecs}
          </pre>
        </div>

        {/* Docker Container compose */}
        <div className="sleek-card p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5 font-mono">
              <Server className="h-4 w-4" /> Docker Swarm & Compose Services
            </h3>
            <button
              onClick={() => copyToClipboard(snippets.dockerConfigs, 'docker')}
              className="px-2 py-1 text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border-0 cursor-pointer"
            >
              {copiedId === 'docker' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedId === 'docker' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] bg-[#020617]/90 p-3 rounded font-mono text-pink-300 overflow-x-auto max-h-[350px]">
            {snippets.dockerConfigs}
          </pre>
        </div>

        {/* Production NestJS Service code */}
        <div className="sleek-card p-4 space-y-3 xl:col-span-2">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-mono">
              <FileCode className="h-4 w-4" /> Production NestJS Service: Atomic AI Gas deduction trade trigger logic
            </h3>
            <button
              onClick={() => copyToClipboard(snippets.nestjsServiceCode, 'serviceCode')}
              className="px-2 py-1 text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1 border-0 cursor-pointer"
            >
              {copiedId === 'serviceCode' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copiedId === 'serviceCode' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-[11px] bg-[#020617]/90 p-4 rounded font-mono text-cyan-300 overflow-x-auto max-h-[450px]">
            {snippets.nestjsServiceCode}
          </pre>
        </div>

      </div>

      {/* Structured Implementation roadmap */}
      <div className="sleek-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <LayoutGrid className="h-4 w-4 text-emerald-400" /> NovaQuant Bot Fuel production deployment & staging roadmap
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          
          <div className="p-3 bg-[#020617] rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-amber-400">PHASE 1: Core Storage & Auth (W1-W2)</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Provision Postgres, Redis, and setup NestJS. Implement JWT token authentications with Passport strategies including Google and secure HMAC Telegram hashing checks inside custom authentication guards.
            </p>
          </div>

          <div className="p-3 bg-[#020617] rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-sky-400">PHASE 2: API & Encryption (W3-W4)</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Install AES-256 GCM decryptable exchanges lockers. Link Binance API Websockets handler with NestJS gateways and write custom decorators to map and filter tenant workspaces securely.
            </p>
          </div>

          <div className="p-3 bg-[#020617] rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-emerald-400">PHASE 3: AI Engine & Gas LEDGER (W5-W6)</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Embed core indicators rules (EMA 9/21, RSI, MACD, Bollinger Bands, ATR true volatility). Code atomic transaction managers to balance AI Gas topups and trade execution consumption limits.
            </p>
          </div>

          <div className="p-3 bg-[#020617] rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-purple-400">PHASE 4: Cross-platform release (W7-W8)</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Compile Flutter for Web, Desktop (Electron/native wrappers), Android (APK/AAB), and iOS (IPA). Deploy systems with Docker Compose stacks behind secure SSL Nginx proxy limits.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
