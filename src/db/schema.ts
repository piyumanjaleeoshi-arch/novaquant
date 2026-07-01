import { pgTable, serial, text, boolean, timestamp, numeric, jsonb, integer } from "drizzle-orm/pg-core";

// 1. Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").default("USER"), // 'ADMIN' or 'USER'
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Exchange API Table (Encrypted Binance API credentials)
export const exchanges = pgTable("exchanges", {
  id: text("id").primaryKey(), // exchangeId
  userId: integer("user_id").notNull().references(() => users.id), // FOREIGN KEY -> users.id
  exchangeName: text("exchange_name").default("Binance"),
  apiKey: text("api_key").notNull(), // encrypted
  secretKey: text("secret_key").notNull(), // encrypted
  testnet: boolean("testnet").default(true),
  status: text("status").default("DISCONNECTED"), // 'SYNCING', 'CONNECTED', 'DISCONNECTED', 'FAILED'
  tradingEnabled: boolean("trading_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Trading Settings Configuration
export const tradingSettings = pgTable("trading_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // FOREIGN KEY -> users.id
  symbol: text("symbol").notNull(), // e.g. BTCUSDT, SOLUSDT
  timeframe: text("timeframe").notNull(), // e.g. 5m, 15m, 1h
  leverage: text("leverage").default("20x"), // leverage setting
  marginType: text("margin_type").default("Cross"), // Cross or Isolated
  positionSize: numeric("position_size").default("1.0"), // position size or percentage
  autoTrade: boolean("auto_trade").default(false),
  takeProfit: numeric("take_profit"),
  stopLoss: numeric("stop_loss"),
  maxOpenTrades: integer("max_open_trades").default(3),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 4. Market History (Binance Candle History)
export const marketHistory = pgTable("market_history", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  open: numeric("open").notNull(),
  high: numeric("high").notNull(),
  low: numeric("low").notNull(),
  close: numeric("close").notNull(),
  volume: numeric("volume").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. AI Predictions (Gemini generated signals and reasoning)
export const aiPredictions = pgTable("ai_predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // FOREIGN KEY -> users.id
  symbol: text("symbol").notNull(),
  prediction: text("prediction").notNull(), // e.g. BUY, SELL, HOLD
  confidence: text("confidence").notNull(), // e.g. 93% or numeric
  reason: text("reason").notNull(), // bullish crossover, oversold, etc.
  expectedProfit: numeric("expected_profit"),
  expectedLoss: numeric("expected_loss"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Real-time Trading Ledger History
export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // FOREIGN KEY -> users.id
  exchangeId: text("exchange_id").references(() => exchanges.id), // FOREIGN KEY -> exchanges.id
  predictionId: integer("prediction_id").references(() => aiPredictions.id), // FOREIGN KEY -> aiPredictions.id
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'BUY', 'SELL', 'LONG', 'SHORT'
  entryPrice: numeric("entry_price").notNull(),
  exitPrice: numeric("exit_price"),
  quantity: numeric("quantity").notNull(),
  leverage: numeric("leverage").default("20"),
  status: text("status").default("COMPLETED"), // 'COMPLETED', 'OPEN', 'PENDING'
  realizedPnl: numeric("realized_pnl").default("0.0"),
  fees: numeric("fees").default("0.0"),
  openedAt: timestamp("opened_at").notNull(),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Portfolio Balance History
export const portfolioHistory = pgTable("portfolio_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // FOREIGN KEY -> users.id
  walletBalance: numeric("wallet_balance").notNull(),
  availableBalance: numeric("available_balance").notNull(),
  marginBalance: numeric("margin_balance").notNull(),
  unrealizedPnl: numeric("unrealized_pnl").default("0.0"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 8. Risk Management Controls
export const riskManagement = pgTable("risk_management", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // FOREIGN KEY -> users.id
  maxDailyLoss: numeric("max_daily_loss"),
  maxPositionSize: numeric("max_position_size"),
  maxLeverage: numeric("max_leverage"),
  maxDrawdown: numeric("max_drawdown"),
  dailyTradeLimit: integer("daily_trade_limit"),
  stopAfterLosses: integer("stop_after_losses"),
  riskPerTrade: numeric("risk_per_trade").default("2.0"), // e.g. 2%
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 9. User Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // FOREIGN KEY -> users.id
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 10. Audit logs (Activity tracking)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // FOREIGN KEY -> users.id
  action: text("action").notNull(),
  ipAddress: text("ip_address"),
  device: text("device"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 11. Password resets token table
export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
