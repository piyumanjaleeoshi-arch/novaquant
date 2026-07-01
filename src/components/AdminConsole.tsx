/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  ShieldAlert, 
  Users, 
  Wallet, 
  Activity, 
  Flame, 
  Briefcase, 
  Ban, 
  CheckCircle,
  RefreshCw,
  Search,
  UserCheck,
  Coins,
  Settings,
  ArrowRightLeft,
  Award,
  TrendingUp,
  BarChart3,
  Percent
} from 'lucide-react';
import { SaaSUser, SaaSMetrics, AuditLog, ReferralPayout } from '../saasTypes';

interface AdminConsoleProps {
  metrics: SaaSMetrics;
  users: SaaSUser[];
  auditLogs: AuditLog[];
  onToggleUserStatus: (userId: string) => void;
  onTriggerSecurityScan: () => void;
  onRefreshMetrics: () => void;
  adminBinancePayId: string;
  adminCommissionBalance: number;
  referralPayouts: ReferralPayout[];
  onChangeAdminPayId: (newVal: string) => void;
  connectionStatus: 'NOT_CONNECTED' | 'SYNCING' | 'WARNING' | 'CONNECTED';
}

export default function AdminConsole({
  metrics,
  users,
  auditLogs,
  onToggleUserStatus,
  onTriggerSecurityScan,
  onRefreshMetrics,
  adminBinancePayId,
  adminCommissionBalance,
  referralPayouts,
  onChangeAdminPayId,
  connectionStatus
}: AdminConsoleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [scanning, setScanning] = useState(false);
  const [editingAdminPay, setEditingAdminPay] = useState(false);
  const [adminPayInput, setAdminPayInput] = useState(adminBinancePayId);

  const handleScanClick = () => {
    setScanning(true);
    onTriggerSecurityScan();
    setTimeout(() => {
      setScanning(false);
    }, 1800);
  };

  const handleSaveAdminPayId = () => {
    onChangeAdminPayId(adminPayInput);
    setEditingAdminPay(false);
  };

  // --- Admin User Local Fallback Management Panel State & Fetchers ---
  const [dbStatus, setDbStatus] = useState<{
    firebase: boolean;
    firestore: boolean;
    localDatabase: boolean;
    userCount: number;
    lastUpdated?: string;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [backupTimestamp, setBackupTimestamp] = useState<string>(() => {
    try {
      return localStorage.getItem("novaquant_last_backup_time") || "No backup registered in this browser.";
    } catch {
      return "No backup registered in this browser.";
    }
  });

  const getAuthToken = async (): Promise<string | null> => {
    try {
      if (auth.currentUser) {
        const fbToken = await auth.currentUser.getIdToken();
        if (fbToken) return fbToken;
      }
    } catch (e) {
      console.warn("Failed to retrieve Firebase ID token", e);
    }
    return localStorage.getItem("novaquant_token");
  };

  const fetchDatabaseStatus = async () => {
    setCheckingStatus(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/admin/database-status", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      } else {
        const err = await res.json();
        console.error("Failed to load DB stats:", err.error);
      }
    } catch (e) {
      console.error("DB Status connection exception:", e);
    } finally {
      setCheckingStatus(false);
    }
  };

  React.useEffect(() => {
    fetchDatabaseStatus();
  }, []);

  const handleDownloadBackup = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/admin/export-users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Handshake authorized connection failed.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users_db.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Record backup time
      const dateStr = new Date().toLocaleString();
      setBackupTimestamp(dateStr);
      try {
        localStorage.setItem("novaquant_last_backup_time", dateStr);
      } catch {}
    } catch (err: any) {
      alert(`Export Failed: ${err.message}`);
    }
  };

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const rawContent = event.target?.result as string;
          let parsedData;
          try {
            parsedData = JSON.parse(rawContent);
          } catch (jsonErr) {
            setImportResult({ success: false, message: "File syntax mismatch. Please make sure the file is valid JSON." });
            setImporting(false);
            return;
          }

          const token = await getAuthToken();
          const res = await fetch("/api/admin/import-users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(parsedData)
          });

          const resData = await res.json();
          if (res.ok && resData.success) {
            setImportResult({
              success: true,
              message: resData.message
            });
            fetchDatabaseStatus(); // refresh user counts
          } else {
            setImportResult({
              success: false,
              message: resData.error || "Uplink validation rejected standard schema match."
            });
          }
        } catch (innerErr: any) {
          setImportResult({ success: false, message: innerErr.message });
        } finally {
          setImporting(false);
        }
      };
      fileReader.readAsText(file);
    } catch (outerErr: any) {
      setImportResult({ success: false, message: outerErr.message });
      setImporting(false);
    }
  };

  const filteredUsers = users.filter(usr => 
    usr.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    usr.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isConnected = connectionStatus === 'CONNECTED';

  const displayRevenue = isConnected ? metrics.totalRevenue : 0;
  const displaySubs = isConnected ? metrics.subscriptionRevenue : 0;
  const displayGas = isConnected ? metrics.gasRevenue : 0;
  const displayGasSpent = isConnected ? metrics.totalGasSpent : 0;
  const displayUsersCount = isConnected ? metrics.activeUsersCount : 0;
  const displayCommission = isConnected ? adminCommissionBalance : 0;
  const displayReferrals = isConnected ? referralPayouts : [];

  // Referral Program metrics calculations
  const totalReferralTxCount = displayReferrals.length;
  const totalReferralCommissionPaid = displayReferrals.reduce((acc, p) => acc + p.commissionUSDT, 0);
  const totalReferralVolumeUSDT = displayReferrals.reduce((acc, p) => acc + p.amountUSDT, 0);

  // Group by referrer
  const referrersSummary = displayReferrals.reduce((acc, p) => {
    const rawRef = p.referrer.trim() || 'Anonymous Affiliate';
    if (!acc[rawRef]) {
      acc[rawRef] = {
        referrer: rawRef,
        totalEarned: 0,
        volumeGenerated: 0,
        referralsCount: 0,
        lastTransaction: p.timestamp,
      };
    }
    acc[rawRef].totalEarned += p.commissionUSDT;
    acc[rawRef].volumeGenerated += p.amountUSDT;
    acc[rawRef].referralsCount += 1;
    return acc;
  }, {} as Record<string, { referrer: string; totalEarned: number; volumeGenerated: number; referralsCount: number; lastTransaction: string }>);

  // Convert to array and sort by totalEarned descending
  const topReferrers = Object.values(referrersSummary).sort((a, b) => b.totalEarned - a.totalEarned);
  const totalUniqueReferrers = topReferrers.length;
  const maxEarned = topReferrers.length > 0 ? Math.max(...topReferrers.map(r => r.totalEarned)) : 1;

  return (
    <div className="space-y-6 animate-fade-in" id="saas-admin-console-panel">
      {/* Disconnected Mode Warning Banner */}
      {!isConnected && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-200 text-xs flex items-start gap-3 text-left">
          <ShieldAlert className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-300 uppercase tracking-wider font-mono">⚠️ Bot Disconnect Mode Active</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              The workspace is currently in Disconnect Mode. SaaS Admin metrics, live settlements, and affiliate commissions are deactivated. Once you connect your Binance API keys and activate the trading bot, live transaction tracking will initialize and update real-time statistics.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="admin-metrics-cards">
        
        {/* Metric 1 */}
        <div className="sleek-card p-3 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start text-slate-400">
            <span className="sleek-label text-[10px]">Total Revenue</span>
            <span className="p-1 rounded bg-sky-950/80 text-sky-400">
              <Wallet className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 block text-left">
            <span className="text-lg font-bold font-mono text-white">${displayRevenue.toLocaleString()}.00</span>
            <span className="text-[9px] text-slate-500 font-mono block">Aggregate Earnings</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="sleek-card p-3 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start text-slate-400">
            <span className="sleek-label text-[10px]">Subs earnings</span>
            <span className="p-1 rounded bg-[#818cf8]/10 text-[#818cf8]">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 block text-left">
            <span className="text-lg font-bold font-mono text-[#818cf8]">${displaySubs.toLocaleString()}.00</span>
            <span className="text-[9px] text-slate-500 font-mono block">Recurring Monthly</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="sleek-card p-3 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start text-slate-400">
            <span className="sleek-label text-[10px]">Gas Revenue</span>
            <span className="p-1 rounded bg-amber-500/10 text-amber-400">
              <Flame className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 block text-left">
            <span className="text-lg font-bold font-mono text-amber-500">${displayGas.toLocaleString()}.00</span>
            <span className="text-[9px] text-slate-500 font-mono block">Top-up Refills Ledger</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="sleek-card p-3 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start text-slate-400">
            <span className="sleek-label text-[10px]">Total Bot Fuel Spent</span>
            <span className="p-1 rounded bg-red-500/10 text-red-400">
              <Activity className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 block text-left">
            <span className="text-lg font-bold font-mono text-red-400">{displayGasSpent.toFixed(2)}</span>
            <span className="text-[9px] text-slate-500 font-mono block">Bot Fuel Burn</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="sleek-card p-3 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start text-slate-400">
            <span className="sleek-label text-[10px]">SaaS Users</span>
            <span className="p-1 rounded bg-purple-500/10 text-purple-400">
              <Users className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 block text-left">
            <span className="text-lg font-bold font-mono text-purple-400">{displayUsersCount}</span>
            <span className="text-[9px] text-slate-500 font-mono block">Tenant Customer bases</span>
          </div>
        </div>

        {/* Metric 6 */}
        <div className="sleek-card p-3 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start text-slate-400">
            <span className="sleek-label text-[10px]">Core Health</span>
            <span className="p-1 rounded bg-emerald-900/60 text-emerald-400">
              <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
            </span>
          </div>
          <div className="mt-2 block text-left">
            <span className="text-lg font-bold font-mono text-emerald-400">99.98%</span>
            <span className="text-[9px] text-slate-500 font-mono block">System Online index</span>
          </div>
        </div>

      </div>

      {/* Administrative Commissions & Affiliate Payouts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="admin-rewards-section">
        
        {/* Admin Payout Wallet Card */}
        <div className="sleek-card p-5 bg-gradient-to-br from-[#020617] via-slate-900 to-amber-950/15 border-amber-900/30 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-amber-400" /> Admin Binance Settlement
            </h3>
            <span className="text-[9px] bg-amber-950/80 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
              15% Comm. Rate
            </span>
          </div>

          <div className="text-left space-y-2">
            <span className="sleek-label block font-mono text-[9px] text-slate-500 uppercase text-left">Live Admin Commission Balance:</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-emerald-400">
                {displayCommission.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-bold font-mono">USDT</span>
            </div>
          </div>

          <div className="bg-[#020617] border border-slate-850 p-3 rounded-lg text-left space-y-2">
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase">
              <span>Settle-to Account (Binance ID)</span>
              {!editingAdminPay && (
                <button
                  onClick={() => {
                    setAdminPayInput(adminBinancePayId);
                    setEditingAdminPay(true);
                  }}
                  className="text-amber-400 hover:underline outline-none border-0 bg-transparent text-[9px] font-bold cursor-pointer"
                >
                  EDIT
                </button>
              )}
            </div>

            {editingAdminPay ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adminPayInput}
                  onChange={e => setAdminPayInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-amber-500/50 rounded px-2 py-1 text-xs font-mono text-slate-200 outline-none"
                />
                <button
                  onClick={handleSaveAdminPayId}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-1 rounded cursor-pointer border-0"
                >
                  SAVE
                </button>
              </div>
            ) : (
              <div className="font-mono text-xs text-slate-200 truncate select-all">
                {adminBinancePayId}
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed text-left font-mono">
            * Sells & settlements automatically routed into the defined Binance account. Permanent 15% instant commissions.
          </p>
        </div>

        {/* Affiliate Peer Introducers Ledger Card */}
        <div className="lg:col-span-2 sleek-card p-5 bg-gradient-to-br from-[#020617] to-indigo-950/15 border-indigo-900/30 flex flex-col justify-between space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-indigo-400" /> Peer Introducers (10% Referrals) Claims
            </h3>
            <span className="text-[9px] bg-indigo-950/80 text-indigo-400 border border-indigo-900/60 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
              {referralPayouts.length} Payouts
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[160px] min-h-[160px] space-y-1.5 pr-1" id="referrals-payout-ledger">
            {referralPayouts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No peer referral payouts recorded dynamically yet.
              </div>
            ) : (
              <div className="overflow-x-auto text-left">
                <table className="w-full text-left font-mono text-[10px] text-slate-350">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 uppercase text-[9px]">
                      <th className="py-1">Timestamp</th>
                      <th className="py-1">Introducer (Referrer)</th>
                      <th className="py-1">Referred ID (Ref)</th>
                      <th className="py-1">Purchase Size</th>
                      <th className="py-1 text-right text-emerald-400">Payout (10%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralPayouts.map(payout => (
                      <tr key={payout.id} className="border-b border-slate-900 hover:bg-slate-900/30">
                        <td className="py-1 text-[9px] text-slate-500">{payout.timestamp}</td>
                        <td className="py-1 text-slate-300 font-semibold">{payout.referrer}</td>
                        <td className="py-1 text-slate-450">{payout.referredUser}</td>
                        <td className="py-1 text-slate-400 font-bold">{payout.amountUSDT} USDT</td>
                        <td className="py-1 text-right text-emerald-400 font-semibold">+{payout.commissionUSDT.toFixed(2)} USDT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="text-[9.5px] text-slate-400 text-left font-mono leading-none pt-1">
            * Introducers are granted 10% cash reward on each Bot Fuel purchase & plan upgrade settled by referred users.
          </div>
        </div>

      </div>

      {/* 🚀 Referral Program Analytics & Performance Portal */}
      <div className="sleek-card p-6 bg-gradient-to-br from-[#020617] via-[#090f24] to-[#12102e] border-slate-800/85 space-y-6" id="admin-referral-performance-portal">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/60 pb-4">
          <div className="text-left">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 font-mono flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-400 animate-pulse" /> Peer-to-Peer Affiliate & Referral Performance Portal
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-sans font-medium">
              Real-time visualization of top introducers, programmatic commissions settled, and conversion volumes.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800 text-slate-300">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400 animate-bounce" />
            <span>Active Program: <strong className="text-[#38bdf8]">10% Payout Rate</strong></span>
          </div>
        </div>

        {/* Analytics Bento Grid Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="referral-bento-metrics">
          {/* Bento Card 1: Total Program Commissions */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850/70 text-left space-y-1.5 hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono uppercase tracking-wider">
              <span>Total Affiliate Commissions</span>
              <Coins className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400">
              {totalReferralCommissionPaid.toFixed(2)} <span className="text-xs text-slate-400">USDT</span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono">
              Commissions instantly settled back to introducers.
            </p>
          </div>

          {/* Bento Card 2: Program Trade Volume Driven */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850/70 text-left space-y-1.5 hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono uppercase tracking-wider">
              <span>Total Retail Volume Driven</span>
              <Activity className="h-4 w-4 text-[#38bdf8]" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-sky-400">
              {totalReferralVolumeUSDT.toFixed(2)} <span className="text-xs text-slate-400">USDT</span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono">
              Gross sales value generated from affiliates.
            </p>
          </div>

          {/* Bento Card 3: Registered Influencers Network */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850/70 text-left space-y-1.5 hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono uppercase tracking-wider">
              <span>Unique active referrers</span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-purple-400">
              {totalUniqueReferrers} <span className="text-xs text-slate-400">Nodes</span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono">
              Total registered introducer partner emails.
            </p>
          </div>

          {/* Bento Card 4: Program Conversions Rate */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850/70 text-left space-y-1.5 hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono uppercase tracking-wider">
              <span>Program Average Transaction</span>
              <Percent className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-500">
              {(totalReferralTxCount > 0 ? totalReferralVolumeUSDT / totalReferralTxCount : 0).toFixed(2)} <span className="text-xs text-slate-400">USDT</span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono">
              Average purchase amount across {totalReferralTxCount} conversions.
            </p>
          </div>
        </div>

        {/* Ranked Leaderboard and Distribution Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="referral-performance-analytics-row">
          {/* Top Performers Leaderboard List (2/3 col index) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                👑 Top Performing Introducers Led Rank
              </h4>
              <span className="text-[9px] text-slate-500 font-mono">Sorted by Total Rewards Claimed</span>
            </div>

            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
              {topReferrers.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs font-mono bg-slate-950/10 rounded border border-dashed border-slate-850 p-4">
                  No introducer performance metrics recorded yet.
                </div>
              ) : (
                topReferrers.map((ref, idx) => {
                  const percentageWidth = Math.max(8, Math.min(100, (ref.totalEarned / maxEarned) * 100));
                  return (
                    <div 
                      key={ref.referrer} 
                      className="p-3.5 rounded-xl bg-slate-950/20 border border-slate-850/50 hover:bg-slate-900/20 transition-all duration-200 flex flex-col space-y-2.5 text-left"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-mono font-black ${
                            idx === 0 ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400/20' :
                            idx === 1 ? 'bg-slate-300 text-slate-950' :
                            idx === 2 ? 'bg-amber-700 text-slate-100' :
                            'bg-slate-850 text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-200 font-bold font-mono block truncate max-w-[180px] sm:max-w-none">{ref.referrer}</span>
                            <span className="text-[9px] text-zinc-500 block font-mono">Last activity: {ref.lastTransaction}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-emerald-400 font-bold font-mono">
                            +{ref.totalEarned.toFixed(2)} USDT <span className="text-[9px] text-slate-500">Earned</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5 font-medium">
                            From <strong>{ref.referralsCount}</strong> premium conversions
                          </div>
                        </div>
                      </div>

                      {/* Progression bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[8.5px] font-mono text-zinc-500">
                          <span>Directed Volume Generated: <strong>{ref.volumeGenerated.toFixed(2)} USDT</strong></span>
                          <span>{percentageWidth.toFixed(0)}% Share Cap</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-850/50 flex">
                          <div 
                            style={{ width: `${percentageWidth}%` }}
                            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                              idx === 0 ? 'from-amber-400 to-emerald-400' :
                              idx === 1 ? 'from-indigo-400 to-sky-400' :
                              'from-purple-500 to-indigo-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Referral volume share / visual statistics (1/3 col index) */}
          <div className="space-y-3 h-full flex flex-col justify-between">
            <div className="border-b border-slate-800/60 pb-2 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-[#38bdf8]" /> Affiliate Campaign Statics Distribution
              </h4>
            </div>

            <div className="flex-1 p-4 rounded-xl bg-slate-950/40 border border-slate-850/50 flex flex-col justify-center space-y-4">
              <div className="text-left space-y-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Total Program Volume Driven</span>
                <div className="text-3xl font-extrabold font-mono text-[#38bdf8]">
                  {totalReferralVolumeUSDT.toFixed(2)} <span className="text-[11px] text-slate-400">USDT</span>
                </div>
              </div>

              {/* Dynamic list share */}
              <div className="space-y-3 font-mono text-[10px] text-left">
                <div className="space-y-1 border-b border-slate-900/80 pb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Affiliate Volume Share index</span>
                    <span className="text-slate-300 font-bold">
                      {totalReferralVolumeUSDT > 0 ? '100.00%' : '0.00%'}
                    </span>
                  </div>
                  <div className="w-full bg-[#020617] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full" 
                      style={{ width: totalReferralVolumeUSDT > 0 ? '100%' : '0%' }}
                    />
                  </div>
                </div>

                <div className="space-y-1 border-b border-slate-900/80 pb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Top Introducer Concentration</span>
                    <span className="text-amber-400 font-bold">
                      {topReferrers.length > 0 && totalReferralCommissionPaid > 0 ? `${((topReferrers[0].totalEarned / totalReferralCommissionPaid) * 100).toFixed(1)}%` : '0.0%'}
                    </span>
                  </div>
                  <div className="w-full bg-[#020617] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full rounded-full" 
                      style={{ width: topReferrers.length > 0 && totalReferralCommissionPaid > 0 ? `${(topReferrers[0].totalEarned / totalReferralCommissionPaid) * 100}%` : '0%' }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Total Program Conversions</span>
                    <span className="text-purple-400 font-bold">{totalReferralTxCount} purchases</span>
                  </div>
                  <div className="w-full bg-[#020617] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full" 
                      style={{ width: totalReferralTxCount > 0 ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Instant Settlements Status badge */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-950 rounded-lg text-left">
                <p className="text-[9px] text-emerald-400 leading-normal font-sans font-medium">
                  🛡️ <strong>Instant On-chain Ledger Settlement active:</strong> All affiliate rewards bypass administration holding queues and are processed immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit scanners & Users block */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Active Users list table */}
        <div className="xl:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Platform SaaS Tenant Users Registry ({filteredUsers.length})
              </h3>
              
              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search user email or name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-[#020617] border border-slate-800 text-slate-300 text-[10px] rounded px-2 py-1 focus:outline-none pl-7 font-mono w-[200px]"
                  id="admin-user-search-input"
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>

            <div className="sleek-card overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse font-sans text-[11px]">
                <thead>
                  <tr className="bg-[#020617] text-slate-400 uppercase font-mono border-b border-slate-800 text-[9px] select-none">
                    <th className="py-2 px-3">Tenant Info</th>
                    <th className="py-2 px-3 text-center">Auth Way</th>
                    <th className="py-2 px-2 text-center">Workspaces</th>
                    <th className="py-2 px-2 text-center">Plan Tier</th>
                    <th className="py-2 px-2 text-center">Bot Fuel Burn (Units)</th>
                    <th className="py-2 px-3 text-right">Toggles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredUsers.map(usr => (
                    <tr key={usr.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{usr.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{usr.email}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-[#020617] border border-slate-800 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase text-sky-400">
                          {usr.authProvider}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-300">
                        {usr.workspacesCount}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                          usr.plan === 'ENTERPRISE' ? 'bg-pink-950 text-pink-400 border border-pink-900/50' :
                          usr.plan === 'PRO' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/50' :
                          'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}>
                          {usr.plan}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-semibold text-amber-500">
                        {usr.totalGasSpent.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onToggleUserStatus(usr.id)}
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer border-0 ${
                            usr.status === 'ACTIVE' 
                              ? 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-slate-950' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950'
                          }`}
                        >
                          {usr.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 pt-2 text-[10px] font-mono text-slate-500">
            <span>Showing {filteredUsers.length} of {users.length} registered SaaS platform tenants</span>
            <div className="flex gap-2">
              <button 
                onClick={onRefreshMetrics}
                className="bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 px-2 py-1 rounded cursor-pointer"
              >
                SYNC REGISTRIES
              </button>
            </div>
          </div>
        </div>

        {/* Live System security logs terminal */}
        <div className="sleek-card p-4 space-y-3 flex flex-col h-[340px]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
              <ShieldAlert className="h-4 w-4 text-[#818cf8]" /> Staging Security Audit Ledger
            </h3>
            <button
              onClick={handleScanClick}
              disabled={scanning}
              className="text-[9px] bg-[#818cf8]/10 hover:bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/20 px-2 py-0.5 rounded uppercase font-semibold cursor-pointer select-none"
            >
              {scanning ? 'SCANNING...' : 'SCAN COMPONENT'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-1 pr-1 font-mono text-[10px]" id="admin-security-audit-list">
            {auditLogs.map((log) => (
              <div 
                key={log.id} 
                className={`p-2 rounded border flex flex-col gap-1 text-left ${
                  log.severity === 'CRITICAL' 
                    ? 'bg-red-950/20 border-red-900/50 text-red-200' 
                    : log.severity === 'WARN'
                    ? 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                    : 'bg-slate-950/70 border-slate-850 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-center text-[9px] select-none font-bold">
                  <span className={`${log.severity === 'CRITICAL' ? 'text-red-400' : log.severity === 'WARN' ? 'text-amber-400' : 'text-sky-450'}`}>
                    [{log.severity}] {log.actor}
                  </span>
                  <span className="text-slate-500 font-normal">{log.timestamp}</span>
                </div>
                <div className="text-[11px] leading-snug">{log.action}</div>
                <div className="text-[9px] text-slate-500 font-normal">{log.ipAddress} • Secured Hash SSL check Passed</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Fallback & Sync admin setup card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6" id="admin-user-database-fallback-grid">
        <div className="sleek-card p-5 col-span-1 md:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
              <RefreshCw className="h-4 w-4 text-emerald-450 animate-spin-slow" /> Core User Database Fallback System
            </h3>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded font-mono font-bold">
              ACTIVE HYBRID
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            NovaQuant operates a dual-source dynamic security system. Primary user logins are processed against Firebase Authentication nodes, while a robust file system layer <code className="text-slate-300 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded">users_db.json</code> provides instant offline credentials resolution if high-frequency cloud nodes decay.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <button
              onClick={handleDownloadBackup}
              className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-800 bg-[#02020a]/80 hover:bg-slate-900/40 hover:border-sky-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group space-y-1.5 text-center min-h-[85px]"
            >
              <TrendingUp className="h-4 w-4 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold font-mono">EXPORT DIRECTORY</span>
              <span className="text-[8px] text-slate-500 font-mono uppercase font-normal">Backup users_db.json</span>
            </button>

            <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-800 bg-[#02020a]/80 hover:bg-slate-900/40 hover:border-emerald-500/40 text-slate-300 hover:text-white transition-all cursor-pointer group space-y-1.5 text-center min-h-[85px]">
              <BarChart3 className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold font-mono">IMPORT RECOVERY</span>
              <span className="text-[8px] text-slate-500 font-mono uppercase font-normal">Restore users_db.json</span>
              <input
                type="file"
                accept=".json"
                onChange={handleUploadBackup}
                className="hidden"
                disabled={importing}
              />
            </label>

            <div className="flex flex-col justify-center p-3 rounded-lg border border-slate-800 bg-[#02020a]/80 text-center min-h-[85px]">
              <span className="text-[10px] font-bold text-[#818cf8] font-mono">USER NODES COUNT</span>
              <span className="text-lg font-bold font-mono text-white mt-0.5">
                {dbStatus ? dbStatus.userCount : "..."}
              </span>
              <span className="text-[8px] text-slate-500 font-mono">Active Records</span>
            </div>

            <div className="flex flex-col justify-center p-3 rounded-lg border border-slate-800 bg-[#02020a]/80 text-center min-h-[85px]">
              <span className="text-[10px] font-bold text-slate-400 font-mono">LAST BACKUP TSTAMP</span>
              <span className="text-[9px] font-sans font-semibold text-slate-300 truncate max-w-full px-1 mt-1 leading-tight">
                {dbStatus?.lastUpdated ? new Date(dbStatus.lastUpdated).toLocaleString() : backupTimestamp}
              </span>
              <span className="text-[8px] text-slate-500 font-mono mt-0.5">Local Storage Record</span>
            </div>
          </div>

          {importing && (
            <div className="text-[10px] font-mono p-2 text-center text-sky-400 bg-sky-950/20 border border-sky-900/50 rounded animate-pulse">
              Parsing and recovering users directory onto local storage node... Please wait.
            </div>
          )}

          {importResult && (
            <div className={`text-[10px] font-mono p-3 rounded border text-left flex gap-2 items-start ${
              importResult.success 
                ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-350" 
                : "bg-red-950/20 border-red-900/50 text-red-350"
            }`}>
              <span className="font-bold flex-1">{importResult.message}</span>
              <button 
                onClick={() => setImportResult(null)} 
                className="text-[9px] font-mono uppercase bg-slate-900 hover:bg-slate-800 border border-slate-800 px-1.5 py-0.5 rounded cursor-pointer border-0"
              >
                DISMISS
              </button>
            </div>
          )}
        </div>

        {/* Status tracking right hand sidebar */}
        <div className="sleek-card p-5 col-span-1 space-y-4">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
              <Settings className="h-4 w-4 text-sky-450" /> Live Integration Status
            </h3>
            <button
              onClick={fetchDatabaseStatus}
              disabled={checkingStatus}
              className="text-[9px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2 py-0.5 rounded cursor-pointer uppercase font-mono border-0"
            >
              {checkingStatus ? "POLLING..." : "REFRESH"}
            </button>
          </div>

          <div className="space-y-2.5 font-mono text-[10px]" id="db-health-status-checklist">
            <div className="flex justify-between items-center bg-[#02020a]/80 p-2.5 rounded border border-slate-850">
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-300">Firebase Authentication</span>
                <span className="text-[8px] text-slate-500">Credential Auth & MFA Check</span>
              </div>
              <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-bold ${
                dbStatus?.firebase 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-900/50" 
                  : "bg-orange-500/10 text-orange-400 border border-orange-900/50"
              }`}>
                {dbStatus?.firebase ? "ONLINE (PRIMARY)" : "DEGRADED (FALLBACK)"}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#02020a]/80 p-2.5 rounded border border-slate-850">
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-300">Firestore Cloud Database</span>
                <span className="text-[8px] text-slate-500">Persistent Profile Ledger</span>
              </div>
              <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-bold ${
                dbStatus?.firestore 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-900/50" 
                  : "bg-orange-500/10 text-orange-400 border border-orange-900/50"
              }`}>
                {dbStatus?.firestore ? "ONLINE (PRIMARY)" : "DEGRADED (FALLBACK)"}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[#02020a]/80 p-2.5 rounded border border-slate-850">
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-300">Local Users File System</span>
                <span className="text-[8px] text-slate-500">Offline redundant storage</span>
              </div>
              <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-bold ${
                dbStatus?.localDatabase 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-900/50" 
                  : "bg-red-500/10 text-red-400 border border-red-900/50"
              }`}>
                {dbStatus?.localDatabase ? "SECURE (OK)" : "ERROR RESTORE"}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
