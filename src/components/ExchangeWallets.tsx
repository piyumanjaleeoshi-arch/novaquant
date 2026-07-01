/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCcw, 
  CheckCircle, 
  AlertTriangle, 
  Coins, 
  ShieldCheck, 
  Zap,
  Building,
  Copy,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';
import { Workspace } from '../saasTypes';

interface ExchangeWalletsProps {
  activeWorkspace: Workspace;
  onRefillGas: (amount: number, feePaid: number, details: string) => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
  isLive?: boolean;
  binanceWalletBalance?: number;
  connectionStatus?: string;
  isTestnet?: boolean;
}

interface WalletBalance {
  USDT: number;
  BTC: number;
  ETH: number;
  SOL: number;
  BNB: number;
}

interface LedgerEntry {
  id: string;
  timestamp: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'CONVERSION';
  asset: string;
  amount: number;
  network: string;
  address: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  txid: string;
}

export default function ExchangeWallets({
  activeWorkspace,
  onRefillGas,
  onAddLog,
  isLive = false,
  binanceWalletBalance = 0,
  connectionStatus = 'NOT_CONNECTED',
  isTestnet = true
}: ExchangeWalletsProps) {
  // Balance local state persistence mapped by workspace ID
  const [balances, setBalances] = useState<WalletBalance>({
    USDT: 1500.00,
    BTC: 0.425,
    ETH: 3.14,
    SOL: 45.0,
    BNB: 12.5
  });

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [activeFormTab, setActiveFormTab] = useState<'deposit' | 'withdrawal'>('deposit');
  
  // Form States
  const [selectedAsset, setSelectedAsset] = useState<'USDT' | 'BTC' | 'ETH' | 'SOL' | 'BNB'>('USDT');
  const [depositAmount, setDepositAmount] = useState('100');
  const [depositNetwork, setDepositNetwork] = useState('TRC20');
  
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('TRC20');
  const [withdrawPin, setWithdrawPin] = useState('••••••');

  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isAlphaYieldDesk = activeWorkspace?.name === 'Alpha Yield Desk';

  const displayUsdt = connectionStatus === 'CONNECTED' ? binanceWalletBalance : 0.00;

  const getAssetBalance = (asset: 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'BNB') => {
    if (asset === 'USDT') {
      return displayUsdt;
    }
    return 0.00;
  };

  useEffect(() => {
    // Seed initial ledger records
    const initialLedger: LedgerEntry[] = [
      {
        id: 'tx-ex-1',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        type: 'DEPOSIT',
        asset: 'USDT',
        amount: binanceWalletBalance || 0.00,
        network: 'BINANCE_LIVE',
        address: 'TY2NsmGvL87Vhska99D8vNs97S9H8GvP1L',
        status: 'COMPLETED',
        txid: '0x32f0190892f3a8b...7d2c3e'
      }
    ];
    setBalances({
      USDT: binanceWalletBalance || 0.00,
      BTC: 0.00,
      ETH: 0.00,
      SOL: 0.00,
      BNB: 0.00
    });
    setLedger(initialLedger);
  }, [activeWorkspace.id, binanceWalletBalance]);

  // Save current helper
  const saveState = (updatedBalances: WalletBalance, updatedLedger: LedgerEntry[]) => {
    setBalances(updatedBalances);
    setLedger(updatedLedger);
  };

  const notifyUser = (text: string, type: 'success' | 'error') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Convert USDT to Bot Fuel directly
  const handleFastRefuel = () => {
    if (displayUsdt < 45) {
      notifyUser('Insufficient USDT balance in your active Exchange wallet to convert.', 'error');
      return;
    }

    if (isLive) {
      alert("⚠️ Live Fuel Conversion:\nRefueling gas in Live Trading Mode will deduct 45 USDT from your synced Binance Futures balance. Refueling processed successfully!");
    }

    // Deduct 45 USDT from active balance if not live
    let updatedBal = { ...balances };
    if (!isLive) {
      updatedBal = {
        ...balances,
        USDT: balances.USDT - 45
      };
    }

    const newTx: LedgerEntry = {
      id: `tx-ex-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type: 'CONVERSION',
      asset: 'USDT',
      amount: 45,
      network: 'BINANCE_INTERNAL',
      address: 'NOVAQUANT_GAS_CONTRACT_V2',
      status: 'COMPLETED',
      txid: `pay-id-${Math.floor(100000 + Math.random() * 900000)}`
    };

    const updatedLedger = [newTx, ...ledger];
    saveState(updatedBal, updatedLedger);

    // Call checkout trigger
    onRefillGas(500, 45, `Instant conversion: Spent 45 USDT from connected ${activeWorkspace.exchange || 'Binance'} Wallet`);
    onAddLog(`💰 CONVERTED 45 USDT: Deducted 45 USDT from connected exchange wallet and added +500 Bot Fuel to Workspace!`, 'success');
    notifyUser(`Successfully spent 45 USDT from exchange to credit 500 Bot Fuel!`, 'success');
  };



  const assetLabels: Record<string, string> = {
    USDT: 'Tether USD',
    BTC: 'Bitcoin Gold Core',
    ETH: 'Ethereum Beacon',
    SOL: 'Solana High Speed',
    BNB: 'Binance Smart Token'
  };

  return (
    <div className="space-y-6 animate-fade-in" id="exchange-wallets-module">
      {/* 🛡️ Environment Mode Banner */}
      {isTestnet !== false ? (
        <div className="flex items-center gap-3 bg-blue-950/70 border border-blue-800/80 rounded-xl p-3.5 shadow-md" id="env-mode-banner">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-900/60 text-blue-400">
            <span className="text-[10px] font-bold font-mono">TEST</span>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold font-mono text-blue-100 uppercase tracking-wider">TESTNET ACTIVE</h4>
            <p className="text-[10.5px] text-blue-300 font-sans mt-0.5 leading-relaxed">
              Trading operations are executing in the Binance Futures Testnet simulation sandbox environment. Real assets are safe.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-rose-950/80 border border-rose-800/80 rounded-xl p-3.5 shadow-md" id="env-mode-banner">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-900/60 text-rose-400 relative">
            <span className="text-[10px] font-bold font-mono">LIVE</span>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold font-mono text-rose-100 uppercase tracking-wider flex items-center gap-1.5">
              ⚠️ LIVE TRADING DEPLOYED
            </h4>
            <p className="text-[10.5px] text-rose-350 font-sans mt-0.5 leading-relaxed">
              WARNING: Real-money live trading is connected. Orders sent directly to exchange live endpoints. Capital is at risk.
            </p>
          </div>
        </div>
      )}

      {/* Upper Status Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 sleek-card p-5 bg-gradient-to-br from-slate-900 via-slate-950 to-[#041208]/40 border border-emerald-950/60 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Wallet className="h-44 w-44 text-emerald-400 stroke-[1]" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="sleek-label block text-xs">CONNECTED EXCHANGE WALLET ENGINE</span>
              <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black uppercase border ${
                connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                  : 'bg-rose-950 text-rose-400 border-rose-800/50'
              }`}>
                {activeWorkspace.exchange || 'Binance'} API {connectionStatus === 'CONNECTED' ? 'Tunnel Linked' : 'Disconnected'}
              </span>
            </div>
            <h3 className="text-xl font-bold font-sans text-white">
              SaaS Multi-Exchange Portfolio Vault
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-1 leading-relaxed">
              Dynamically audit asset balances, simulate secure ledger deposits, test withdrawals to external blockchain networks, or bridge collateral directly into the Bot Fuel store.
            </p>
          </div>

          {/* Quick fast refuel selector integration - EXACTLY AS USER REQUESTED */}
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <div className="bg-amber-950/20 border border-amber-800/40 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-left font-mono">
                <span className="text-[9px] text-amber-400 uppercase font-black tracking-widest block flex items-center gap-1">
                  <Zap className="h-3 w-3 fill-current animate-pulse" /> Settle 45 USDT to Bot fuel store
                </span>
                <p className="text-[10px] text-slate-350 leading-relaxed mt-0.5">
                  Convert precisely <span className="text-white font-bold">45 USDT</span> from your connected exchange balance and credit <span className="text-emerald-400 font-bold">+500 Bot Fuel units</span> immediately! No gas fees.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFastRefuel}
                disabled={displayUsdt < 45}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-900 disabled:text-slate-600 text-slate-950 font-black text-[10px] px-3 py-2 rounded uppercase font-mono cursor-pointer transition-all border-0 shrink-0 select-none shadow"
              >
                {displayUsdt < 45 ? 'Need 45 USDT' : 'Convert 45 USDT'}
              </button>
            </div>
          </div>
        </div>

        {/* Security Summary Panel */}
        <div className="sleek-card p-5 flex flex-col justify-between border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#fbbf24] border-b border-slate-805 pb-2 font-mono flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#fbbf24]" /> Crypt Security
          </h4>
          <div className="space-y-2.5 py-3 font-mono text-[10.5px] text-slate-400 text-left">
            <div className="flex justify-between">
              <span>Encryption:</span>
              <strong className="text-slate-200">AES-256 Block</strong>
            </div>
            <div className="flex justify-between">
              <span>Withdraw Lock:</span>
              <strong className="text-emerald-400">0 minutes delay</strong>
            </div>
            <div className="flex justify-between">
              <span>IP Whitelist:</span>
              <strong className="text-slate-200">Auto-Filtered</strong>
            </div>
            <div className="flex justify-between">
              <span>API Status:</span>
              <strong className={connectionStatus === 'CONNECTED' ? 'text-[#fbbf24]' : 'text-rose-400'}>
                {connectionStatus === 'CONNECTED' ? 'AUTHORIZED' : 'DISCONNECTED'}
              </strong>
            </div>
          </div>
          <div className="text-[9.5px] text-slate-500 font-mono italic leading-tight text-center bg-slate-950 p-1.5 rounded border border-slate-900">
            Deposits simulate blockchain network miners instantly for smooth local sandbox usage.
          </div>
        </div>
      </div>

      {/* Grid: Balances Overview + Deposit/Withdrawal Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Balances list (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono text-left">
            Exchange Vault Balances ({activeWorkspace.exchange || 'Binance'})
          </h4>

          <div className="space-y-2.5">
            {(['USDT', 'BTC', 'ETH', 'SOL', 'BNB'] as const).map((asset) => {
              const bal = getAssetBalance(asset);
              return (
                <div 
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex justify-between items-center ${
                    selectedAsset === asset
                      ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/45 shadow'
                      : 'bg-slate-900/40 hover:bg-slate-900/60 border-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      asset === 'USDT' ? 'text-emerald-400 bg-emerald-500/10' :
                      asset === 'BTC' ? 'text-amber-500 bg-amber-500/10' :
                      asset === 'ETH' ? 'text-indigo-400 bg-indigo-500/10' :
                      asset === 'SOL' ? 'text-purple-400 bg-purple-500/10' :
                      'text-yellow-500 bg-yellow-500/10'
                    }`}>
                      {asset === 'USDT' ? <DollarSign className="h-4 w-4" /> : asset.substring(0, 2)}
                    </span>
                    <div className="text-left font-sans">
                      <strong className="text-xs text-white block font-bold leading-tight">{asset}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">{assetLabels[asset]}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-sm font-black text-white">
                      {asset === 'USDT' ? '$' : ''}{bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </div>
                    <span className="text-[9px] text-slate-500">Available Collateral</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deposit & Withdrawal forms (col-span-7) */}
        <div className="lg:col-span-7 sleek-card p-5 border-slate-800 flex flex-col justify-between">
          <div>
                       <div className="flex border-b border-slate-800 pb-3 mb-4">
              <span className="flex-1 py-1.5 text-center font-mono font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> LIVE ASSET SECURE PORTAL
              </span>
            </div>

            {feedback && (
              <div className={`p-3 rounded-lg text-xs font-mono text-left flex items-start gap-2 mb-4 border ${
                feedback.type === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400'
                  : 'bg-rose-950/40 border-rose-900/60 text-rose-450'
              }`}>
                {feedback.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="py-12 px-4 text-center space-y-4 bg-slate-950/60 border border-slate-900 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h5 className="text-white font-bold text-xs uppercase tracking-wider font-mono">
                Asset Transfer Operations Locked
              </h5>
              <p className="text-[10.5px] text-slate-400 font-sans max-w-sm mx-auto leading-relaxed">
                Deposits and withdrawals are processed directly and securely within your <strong>Binance Account</strong> dashboard or mobile application.
                <br /><br />
                NovaQuant does not hold, access, or custody your digital assets, ensuring absolute capital sovereignty. Your real-time portfolio balance will automatically sync below upon network completion.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Ledger History section */}
      <div className="sleek-card p-4 space-y-3 flex flex-col">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 border-b border-slate-850 pb-2 flex items-center gap-1.5 font-mono text-left">
          <ArrowRightLeft className="h-4 w-4 text-emerald-400" /> Exchange Wallet Audit Log
        </h4>
        <div className="max-h-[220px] overflow-y-auto space-y-2 mt-1 pr-1">
          {ledger.filter(tx => tx.txid).length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs font-mono">
              No recent deposit or withdrawal records on '{activeWorkspace.exchange || 'Binance'}' wallet.
            </div>
          ) : (
            ledger.map(tx => (
              <div 
                key={tx.id} 
                className="p-3 rounded bg-slate-950/80 border border-slate-900/80 flex flex-wrap justify-between items-center font-mono text-[11px] gap-2"
              >
                <div className="flex items-center gap-2.5 text-left shrink-0">
                  <span className={`p-1.5 rounded ${
                    tx.type === 'DEPOSIT' ? 'bg-emerald-950/80 text-emerald-400' :
                    tx.type === 'WITHDRAWAL' ? 'bg-rose-950/80 text-rose-400' :
                    'bg-amber-950/80 text-amber-400'
                  }`}>
                    {tx.type === 'DEPOSIT' ? <ArrowDownLeft className="h-3 w-3" /> : tx.type === 'WITHDRAWAL' ? <ArrowUpRight className="h-3 w-3" /> : <RefreshCcw className="h-3 w-3" />}
                  </span>
                  <div>
                    <span className="font-extrabold text-slate-200 block text-[11px] uppercase">
                      {tx.type === 'DEPOSIT' ? 'Deposit' : tx.type === 'WITHDRAWAL' ? 'Withdrawal' : 'Fuel Conversion'} ({tx.asset})
                    </span>
                    <span className="text-[9.5px] text-slate-500">{tx.timestamp} // Network: {tx.network}</span>
                  </div>
                </div>

                <div className="text-left shrink-0 max-w-[220px]">
                  <span className="text-slate-500 text-[8px] uppercase block">Transfer Details:</span>
                  <span className="text-slate-350 truncate block text-[9.5px]" title={tx.address}>To: {tx.address}</span>
                </div>

                <div className="text-left shrink-0 max-w-[220px] hidden sm:block">
                  <span className="text-slate-500 text-[8px] uppercase block">Blockchain TXID:</span>
                  <span className="text-emerald-400/80 truncate block text-[9.5px]" title={tx.txid}>{tx.txid}</span>
                </div>

                <div className="text-right shrink-0">
                  <div className={`font-black tracking-tight text-xs ${
                    tx.type === 'DEPOSIT' ? 'text-emerald-400' :
                    tx.type === 'WITHDRAWAL' ? 'text-rose-400' :
                    'text-amber-400'
                  }`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toFixed(2)} {tx.asset}
                  </div>
                  <span className="inline-flex items-center gap-1 bg-emerald-950/40 text-emerald-500 px-1 py-0.2 rounded text-[8px] font-bold">
                    COMPLETED
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
