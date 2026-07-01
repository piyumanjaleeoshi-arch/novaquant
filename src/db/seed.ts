import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

const { Pool } = pg;

console.info("[Database Seed] Starting database seeding process...");

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

if (!sqlHost || !sqlDbName || !user || !password) {
  console.error("[Database Seed] Missing environment parameters. Seeding aborted.");
  process.exit(1);
}

const pool = new Pool({
  host: sqlHost,
  user: user,
  password: password,
  database: sqlDbName,
  connectionTimeoutMillis: 15000,
});

const db = drizzle(pool, { schema });

async function seed() {
  try {
    console.info("[Database Seed] Establishing PostgreSQL client connection...");

    // 1. Seed standard master system users
    console.info("[Database Seed] Seeding default operator users...");
    const insertedUsers = await db.insert(schema.users).values([
      {
        firebaseUid: "system-bot-uid-00000",
        email: "novaquant2026@gmail.com",
        name: "NovaQuant Algorithmic Bot",
        role: "ADMIN",
        twoFactorEnabled: false,
        emailVerified: true,
      },
      {
        firebaseUid: "user-demo-uid-11111",
        email: "demo_trader@novaquant.io",
        name: "Demo Heuristic Trader",
        role: "USER",
        twoFactorEnabled: false,
        emailVerified: true,
      }
    ]).onConflictDoNothing().returning();

    console.info(`[Database Seed] Users seeded successfully. Count: ${insertedUsers.length}`);

    // If no users were returned (meaning they already existed), we query them to get IDs for foreign key seeding
    const allUsers = await db.select().from(schema.users);
    const systemBot = allUsers.find(u => u.email === "novaquant2026@gmail.com");
    const demoTrader = allUsers.find(u => u.email === "demo_trader@novaquant.io");

    if (systemBot && demoTrader) {
      // 2. Seed Exchange Credentials (Encrypted mocks)
      console.info("[Database Seed] Seeding demo exchange linkage...");
      await db.insert(schema.exchanges).values([
        {
          id: "ex_binance_demo_01",
          userId: demoTrader.id,
          exchangeName: "Binance Testnet",
          apiKey: "U2FsdGVkX1+Vb8v0P8z/8h1G6e3P9X+Vb8v0P8z/8h1G6e3P", // MOCK ENCRYPTED
          secretKey: "U2FsdGVkX1+Vb8v0P8z/8h1G6e3P9X+Vb8v0P8z/8h1G6e3P", // MOCK ENCRYPTED
          testnet: true,
          status: "CONNECTED",
        }
      ]).onConflictDoNothing();

      // 3. Seed Trading Settings
      console.info("[Database Seed] Seeding trading parameters & quantitative strategies...");
      await db.insert(schema.tradingSettings).values([
        {
          userId: demoTrader.id,
          symbol: "BTCUSDT",
          timeframe: "15m",
          leverage: "20x",
          marginType: "Cross",
          positionSize: "5.0",
          autoTrade: true,
          takeProfit: "3.5",
          stopLoss: "1.5",
          maxOpenTrades: 3,
        },
        {
          userId: demoTrader.id,
          symbol: "SOLUSDT",
          timeframe: "5m",
          leverage: "10x",
          marginType: "Isolated",
          positionSize: "10.0",
          autoTrade: false,
          takeProfit: "5.0",
          stopLoss: "2.0",
          maxOpenTrades: 2,
        }
      ]).onConflictDoNothing();

      // 4. Seed Risk Management Thresholds
      console.info("[Database Seed] Seeding compliance risk controls...");
      await db.insert(schema.riskManagement).values([
        {
          userId: demoTrader.id,
          maxDailyLoss: "100.00",
          maxPositionSize: "25.0",
          maxLeverage: "20",
          maxDrawdown: "15.0",
          dailyTradeLimit: 10,
          stopAfterLosses: 3,
          riskPerTrade: "2.0",
        },
        {
          userId: systemBot.id,
          maxDailyLoss: "500.00",
          maxPositionSize: "50.0",
          maxLeverage: "20",
          maxDrawdown: "10.0",
          dailyTradeLimit: 50,
          stopAfterLosses: 5,
          riskPerTrade: "1.5",
        }
      ]).onConflictDoNothing();

      // 5. Seed Demo Market History
      console.info("[Database Seed] Seeding baseline candle intervals...");
      const mockTime = new Date();
      await db.insert(schema.marketHistory).values([
        {
          symbol: "BTCUSDT",
          timeframe: "15m",
          open: "95150.0",
          high: "95600.0",
          low: "94900.0",
          close: "95420.0",
          volume: "1245.8",
          timestamp: mockTime,
        },
        {
          symbol: "BTCUSDT",
          timeframe: "15m",
          open: "95420.0",
          high: "95900.0",
          low: "95300.0",
          close: "95800.0",
          volume: "1480.2",
          timestamp: new Date(mockTime.getTime() - 15 * 60 * 1000),
        }
      ]).onConflictDoNothing();

      // 6. Seed Notifications & Audits
      console.info("[Database Seed] Seeding welcome activity ledger logs...");
      await db.insert(schema.notifications).values([
        {
          userId: demoTrader.id,
          title: "Node Handshake Successful",
          message: "NovaQuant Relational Cloud SQL gateway synced and live. Connection pool online.",
          read: false,
        }
      ]).onConflictDoNothing();

      await db.insert(schema.auditLogs).values([
        {
          userId: demoTrader.id,
          action: "SYSTEM_HANDSHAKE",
          ipAddress: "127.0.0.1",
          device: "PostgreSQL Migration Runner",
          metadata: { engine: "Drizzle-ORM", version: "0.45.2" },
        }
      ]).onConflictDoNothing();
    }

    console.info("[Database Seed] Database successfully seeded with baseline parameters!");
  } catch (error) {
    console.error("[Database Seed] Unhandled fatal seeding error:", error);
    process.exit(1);
  } finally {
    await pool.end();
    console.info("[Database Seed] Postgres client disconnected. Seeding routine finished.");
  }
}

seed();
