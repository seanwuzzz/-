import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { GAS_SCRIPT_TEMPLATE } from '../constants';
import { Save, Copy, Check, AlertCircle } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
}

const Settings: React.FC<Props> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with outer settings when component mounts or settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setError(null); // Clear error when user makes changes
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
      <h2 className="text-2xl font-bold text-white mb-6 text-center">設定</h2>

      {/* Data Source Section */}
      <section className="bg-cardBg p-5 rounded-2xl shadow-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">資料來源</h3>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm">使用範例資料 (Demo Mode)</span>
          <button 
            type="button"
            onClick={() => handleChange('useDemoData', !localSettings.useDemoData)}
            className={`w-12 h-6 rounded-full transition-colors relative active:scale-95 ${localSettings.useDemoData ? 'bg-blue-500' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.useDemoData ? 'translate-x-6' : ''}`} />
          </button>
        </div>

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
      </section>

      {/* Setup Guide */}
      <section className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2">如何建立 Google Sheet 後端？</h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          本應用程式需要配合 Google Apps Script 才能儲存資料。
        </p>
        <div className="relative bg-slate-900 p-3 rounded-lg border border-slate-700 overflow-hidden">
            <pre className="text-[10px] text-slate-300 overflow-x-auto h-24 custom-scrollbar">
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
        <ol className="mt-4 text-[10px] text-slate-400 list-decimal list-inside space-y-1.5">
            <li>建立一個新的 Google Sheet。</li>
            <li>將分頁命名為 <code>Transactions</code> 與 <code>Prices</code>。</li>
            <li>工具列 &gt; 擴充功能 &gt; Apps Script &gt; 貼上代碼。</li>
            <li>部署 &gt; 新增部署 &gt; 網頁應用程式 &gt; 所有人 (Anyone) 可存取。</li>
        </ol>
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
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 touch-manipulation"
        >
            <Save size={20} />
            儲存並返回
        </button>
      </div>
    </div>
  );
};

export default Settings;