
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { GAS_SCRIPT_TEMPLATE, APP_VERSION } from '../constants';
import { Save, Copy, Check, AlertCircle } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
}

const Settings: React.FC<Props> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setError(null);
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(GAS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!localSettings.useDemoData && !localSettings.googleScriptUrl.trim()) {
      setError("請輸入 Google Apps Script URL 或開啟範例資料模式");
      return;
    }
    onSave(localSettings);
  };

  return (
    <div className="p-4 pb-24 space-y-6 text-slate-200">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">設定中心</h2>

      <section className="bg-cardBg p-5 rounded-2xl shadow-lg border border-slate-700">
        <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">系統設定</h3>
        
        <div className="space-y-4 animate-slide-down">
            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between">
                <span className="text-sm">使用範例資料 (Demo Mode)</span>
                <button 
                    type="button"
                    onClick={() => handleChange('useDemoData', !localSettings.useDemoData)}
                    className={`w-12 h-6 rounded-full transition-colors relative active:scale-95 ${localSettings.useDemoData ? 'bg-blue-500' : 'bg-slate-600'}`}
                >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.useDemoData ? 'translate-x-6' : ''}`} />
                </button>
            </div>

            {/* GAS URL Input */}
            {!localSettings.useDemoData && (
                <div className="space-y-2 animate-slide-down">
                    <label className="text-xs text-slate-400">Google Apps Script URL (Web App)</label>
                    <input
                        type="text"
                        value={localSettings.googleScriptUrl}
                        onChange={(e) => handleChange('googleScriptUrl', e.target.value)}
                        placeholder="https://script.google.com/macros/s/..."
                        className={`w-full bg-slate-800 border rounded-lg p-3 text-white focus:outline-none text-sm transition-colors ${error ? 'border-twRed' : 'border-slate-600 focus:border-blue-500'}`}
                    />
                </div>
            )}
        </div>
      </section>

      <section className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-2">如何建立後端？</h3>
        <div className="relative bg-slate-900 p-3 rounded-lg border border-slate-700 overflow-hidden">
            <pre className="text-[10px] text-slate-400 overflow-x-auto h-20 custom-scrollbar">
                {GAS_SCRIPT_TEMPLATE}
            </pre>
            <button 
                type="button"
                onClick={handleCopyCode}
                className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-md flex items-center gap-1 text-[10px] active:scale-90"
            >
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copied ? '已複製' : '複製代碼'}
            </button>
        </div>
      </section>

      <div className="space-y-3">
        {error && (
            <div className="flex items-center gap-2 text-twRed text-xs bg-twRed/10 p-3 rounded-lg border border-twRed/20 animate-pulse">
                <AlertCircle size={14} />
                {error}
            </div>
        )}
        <button 
            type="button"
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
            <Save size={20} />
            儲存設定
        </button>
      </div>

      <div className="text-center opacity-30 pt-4">
        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">{APP_VERSION}</span>
      </div>
    </div>
  );
};

export default Settings;
