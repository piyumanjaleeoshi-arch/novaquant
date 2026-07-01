/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BotConfig } from '../types';
import {
  Settings,
  Shield,
  Activity,
  Sliders,
  Bell,
  Send,
  Save,
  TriangleAlert,
  Flame,
  FileKey2,
  Brain,
} from 'lucide-react';

interface SettingsPanelProps {
  config: BotConfig;
  onUpdateConfig: (newConfig: BotConfig) => void;
  onEmergencyStop: () => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warn' | 'error' | 'system') => void;
}

export default function SettingsPanel({
  config,
  onUpdateConfig,
  onEmergencyStop,
  onAddLog,
}: SettingsPanelProps) {
  const [localConfig, setLocalConfig] = useState<BotConfig>({ ...config });
  const [connStatus, setConnStatus] = useState<'NOT_TESTED' | 'CONNECTING' | 'CONNECTED' | 'FAILED'>('NOT_TESTED');
  const [connError, setConnError] = useState<string>('');
  const [testedAssets, setTestedAssets] = useState<any[]>([]);

  const handleInputChange = (
    field: keyof BotConfig,
    value: string | number | boolean
  ) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTestConnection = async () => {
    if (!localConfig.binanceApiKey.trim() || !localConfig.binanceApiSecret.trim()) {
      alert('⚠️ Missing API credentials: Please fill both Key and Secret values before testing.');
      return;
    }

    setConnStatus('CONNECTING');
    setConnError('');
    setTestedAssets([]);
    onAddLog('Initiating Binance Futures secure live handshake connection...', 'info');

    try {
      const q = new URLSearchParams({
        apiKey: localConfig.binanceApiKey.trim(),
        apiSecret: localConfig.binanceApiSecret.trim(),
        isTestnet: (!localConfig.isLive).toString()
      });
      const response = await fetch(`/api/binance/test?${q.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Binance-API-Key': localConfig.binanceApiKey.trim(),
          'X-Binance-API-Secret': localConfig.binanceApiSecret.trim()
        }
      });

      const data = await response.json();

      if (response.ok && data.connected) {
        setConnStatus('CONNECTED');
        setTestedAssets(data.assets || []);
        onAddLog('🎉 Binance Futures live wallet connected successfully!', 'success');
      } else {
        setConnStatus('FAILED');
        setConnError(data.error || 'Connection verification failed.');
        onAddLog(`❌ Binance connection failed: ${data.error || 'Check credentials'}`, 'error');
      }
    } catch (err: any) {
      setConnStatus('FAILED');
      setConnError(err.message || 'Network error occurred.');
      onAddLog(`❌ Binance network handshake exception: ${err.message}`, 'error');
    }
  };

  const handleSave = () => {
    // Basic validations
    if (localConfig.riskPerTrade <= 0 || localConfig.riskPerTrade > 100) {
      alert('Risk per trade must be between 0.1% and 100%');
      return;
    }
    onUpdateConfig(localConfig);
    onAddLog('Configuration saved and applied to active trading engine.', 'system');
  };

  return (
    <div className="space-y-6" id="settings-panel-container">
      {/* ⚠️ Emergency Stop Panel */}
      <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 mt-0.5">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-rose-250 text-sm tracking-tight flex items-center gap-1.5">
              BOT EMERGENCY CRITICAL KILL SWITCH
            </h3>
            <p className="text-[11px] text-rose-300 mt-0.5">
              Immediately market-closes any active open positions. Disables automated autopilot trading rule analysis and resets safety flags.
            </p>
          </div>
        </div>
        <button
          onClick={onEmergencyStop}
          className="bg-gradient-to-r from-red-650 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-mono text-xs font-bold py-2.5 px-6 rounded-lg select-none shadow-lg shadow-red-500/10 hover:shadow-red-500/25 active:scale-95 transition-all text-center"
          id="emergency-stop-btn"
        >
          🚨 EMERGENCY PANIC SHUTDOWN
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module A: API Key Connectivity */}
        <div className="sleek-card p-4 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 select-none text-slate-100">
            <FileKey2 className="h-4 w-4 text-[#38bdf8]" />
            <h3 className="font-sans font-semibold text-white text-sm">
              API Connectivity & Live System
            </h3>
          </div>

          <div className="space-y-4">
            {/* Live Mode Toggle Warning block */}
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-950/50 border border-slate-850">
              <div>
                <span className="font-sans font-medium text-slate-200 block text-xs">
                  Live Trading Integration
                </span>
                <span className="text-[10px] text-slate-400">
                  Execute real orders on Binance with real capital
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localConfig.isLive}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      const confirmLive = window.confirm(
                        '⚠️ WARNING: Enabling Live Trading will route actual orders to the Binance API. Risk of real financial losses. Do you wish to continue?'
                      );
                      if (!confirmLive) return;
                    }
                    handleInputChange('isLive', checked);
                  }}
                  className="sr-only peer"
                  id="live-trading-toggle"
                />
                <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-950 peer-checked:after:border-amber-500"></div>
              </label>
            </div>

            {localConfig.isLive && (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 flex gap-2.5">
                <TriangleAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-300 leading-normal">
                  <b>Live trading utilizes API keys.</b> Ensure you permit futures trade routing permissions on your Binance sub-account API keys. Keys are handled strictly and safely inside this client-side buffer.
                </p>
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 font-mono">
                  Binance API Key
                </label>
                <input
                  type="password"
                  placeholder="Paste Binance Client API Key..."
                  value={localConfig.binanceApiKey}
                  onChange={(e) => handleInputChange('binanceApiKey', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-slate-700 font-mono"
                  id="binance-api-key-input"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 font-mono">
                  Binance API Secret Key
                </label>
                <input
                  type="password"
                  placeholder="Paste Binance Secret Entry..."
                  value={localConfig.binanceApiSecret}
                  onChange={(e) => handleInputChange('binanceApiSecret', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-slate-700 font-mono"
                  id="binance-api-secret-input"
                />
              </div>

              {/* Connection Status Indicator & Test button */}
              <div className="pt-2 border-t border-slate-900/60 mt-3 space-y-2">
                <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded border border-slate-900">
                  <span className="text-[10px] text-slate-450 font-mono">CONNECTION STATUS:</span>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded flex items-center gap-1 ${
                    connStatus === 'CONNECTED' ? 'bg-emerald-950/60 text-emerald-450 border border-emerald-800/40' :
                    connStatus === 'FAILED' ? 'bg-rose-950/65 text-rose-400 border border-rose-900/45' :
                    connStatus === 'CONNECTING' ? 'bg-sky-950 text-sky-400 border border-sky-900/40' :
                    'bg-slate-950 text-slate-500 border border-slate-850'
                  }`} id="connection-status-badge">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      connStatus === 'CONNECTED' ? 'bg-emerald-455 animate-pulse' :
                      connStatus === 'FAILED' ? 'bg-rose-500' :
                      connStatus === 'CONNECTING' ? 'bg-sky-400 animate-pulse' :
                      'bg-slate-650'
                    }`}></span>
                    {connStatus === 'CONNECTED' ? 'CONNECTED' :
                     connStatus === 'FAILED' ? 'CONN ERROR' :
                     connStatus === 'CONNECTING' ? 'TESTING...' :
                     'NOT TESTED'}
                  </span>
                </div>

                {connError && (
                  <p className="text-[10px] text-rose-400 bg-rose-950/15 border border-rose-900/35 p-2 rounded leading-snug" id="connection-error-alert">
                    ⚠️ {connError}
                  </p>
                )}

                {connStatus === 'CONNECTED' && testedAssets.length > 0 && (
                  <div className="bg-emerald-955/10 border border-emerald-900/30 p-2 rounded space-y-1 text-left" id="connected-assets-list">
                    <span className="text-[8.5px] text-slate-400 block uppercase font-black tracking-wider leading-none">Binance Futures Balance:</span>
                    {testedAssets.slice(0, 3).map((ast: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[10px] font-mono text-emerald-450">
                        <span>{ast.asset} Balance:</span>
                        <span>{parseFloat(ast.walletBalance).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={connStatus === 'CONNECTING'}
                  className="w-full bg-slate-900 hover:bg-slate-805 disabled:bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 disabled:text-slate-600 py-2 rounded text-xs px-3 font-semibold select-none cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  id="test-connection-btn"
                >
                  🔑 {connStatus === 'CONNECTING' ? 'TESTING HANDSHAKE...' : 'TEST HANDSHAKE & CONNECT'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Module B: Technical indicators customization */}
        <div className="sleek-card p-4 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 select-none font-sans text-slate-100">
            <Sliders className="h-4 w-4 text-emerald-400" />
            <h3 className="font-sans font-semibold text-white text-sm">
              EMA & RSI Strategy Parameters
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                Fast EMA Period
              </label>
              <input
                type="number"
                value={localConfig.emaShort}
                onChange={(e) => handleInputChange('emaShort', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="ema-short-input"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                Slow EMA Period
              </label>
              <input
                type="number"
                value={localConfig.emaLong}
                onChange={(e) => handleInputChange('emaLong', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="ema-long-input"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                RSI Period
              </label>
              <input
                type="number"
                value={localConfig.rsiPeriod}
                onChange={(e) => handleInputChange('rsiPeriod', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="rsi-period-input"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                Volume SMA Period
              </label>
              <input
                type="number"
                value={localConfig.volSmaPeriod}
                onChange={(e) => handleInputChange('volSmaPeriod', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="vol-sma-input"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-450 uppercase font-mono mb-1">
                RSI Buy Threshold
              </label>
              <input
                type="number"
                value={localConfig.rsiBuyThreshold}
                onChange={(e) => handleInputChange('rsiBuyThreshold', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="rsi-buy-input"
              />
            </div>

            <div>
              <label className="block text-[10px] text-rose-455 uppercase font-mono mb-1">
                RSI Sell Threshold
              </label>
              <input
                type="number"
                value={localConfig.rsiSellThreshold}
                onChange={(e) => handleInputChange('rsiSellThreshold', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="rsi-sell-input"
              />
            </div>
          </div>
        </div>

        {/* Module C: Risk & Portfolio parameters */}
        <div className="sleek-card p-4 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 select-none font-sans">
            <Shield className="h-4 w-4 text-[#818cf8]" />
            <h3 className="font-sans font-semibold text-white text-sm">
              Portfolio & Risk Management
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={localConfig.riskPerTrade}
                onChange={(e) => handleInputChange('riskPerTrade', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="risk-per-trade-input"
              />
              <span className="text-[9px] text-slate-500 font-mono">Priced on SL distance</span>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                Stop Loss (ATR)
              </label>
              <input
                type="number"
                step="0.1"
                value={localConfig.slAtrMultiplier}
                onChange={(e) => handleInputChange('slAtrMultiplier', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="sl-multiplier-input"
              />
              <span className="text-[9px] text-slate-550 font-mono">Stop: e.g. 1.5 ATR</span>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                Take Profit (ATR)
              </label>
              <input
                type="number"
                step="0.1"
                value={localConfig.tpAtrMultiplier}
                onChange={(e) => handleInputChange('tpAtrMultiplier', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="tp-multiplier-input"
              />
              <span className="text-[9px] text-slate-550 font-mono">Profit: e.g. 3.0 ATR</span>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                Max Trades Per Day
              </label>
              <input
                type="number"
                value={localConfig.maxTradesPerDay}
                onChange={(e) => handleInputChange('maxTradesPerDay', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="max-trades-input"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                Simulated Balance ($)
              </label>
              <input
                type="number"
                value={localConfig.paperBalance}
                onChange={(e) => handleInputChange('paperBalance', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                id="sim-balance-input"
              />
              <span className="text-[9px] text-slate-500 font-mono">Only adjusts paper-trading deposit</span>
            </div>
          </div>
        </div>

        {/* Dual-AI Assisted Trading Engine Settings */}
        <div className="sleek-card p-5 bg-[#030712]/70 border border-slate-900 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-sans text-xs font-bold text-slate-200 uppercase tracking-wider">
                Dual-AI Assisted Trading Engine
              </h3>
              <p className="text-[10px] text-slate-500">
                Consensus verification grid powered by both Claude & Gemini
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Enable AI-Assisted Auto-Trading
                </label>
                <span className="text-[10px] text-slate-500 block">
                  Verify technical signals with Gemini & Claude before order dispatch.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('aiTradingEnabled', !localConfig.aiTradingEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  localConfig.aiTradingEnabled ? 'bg-indigo-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    localConfig.aiTradingEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {localConfig.aiTradingEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                    AI Confidence Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={localConfig.aiConfidenceThreshold ?? 70}
                    onChange={(e) => handleInputChange('aiConfidenceThreshold', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                  />
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">
                    Minimum confidence score required (default: 70).
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">
                    Order Confirmation Mode
                  </label>
                  <select
                    value={localConfig.aiTradingMode ?? 'MANUAL'}
                    onChange={(e) => handleInputChange('aiTradingMode', e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono"
                  >
                    <option value="MANUAL">Manual Confirmation Required</option>
                    <option value="AUTOMATIC">Fully Automatic (Opt-in)</option>
                  </select>
                  <span className="text-[9px] text-slate-500 font-mono block mt-1">
                    Choose if orders require your final approval or execute instantly.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Button Save */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="bg-[#32b2e8] hover:bg-[#209ccd] text-slate-950 font-sans text-xs font-bold py-2.5 px-6 rounded-lg shadow-lg active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-0"
          id="save-settings-btn"
        >
          <Save className="h-4 w-4" /> Save Configuration Parameters
        </button>
      </div>
    </div>
  );
}
