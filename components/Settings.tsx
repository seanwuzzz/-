import React, { useState } from 'react';
import { AppSettings } from '../types';
import { GAS_SCRIPT_TEMPLATE } from '../constants';
import { Save, Copy, Check, Eye, EyeOff } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
}

const Settings: React.FC<Props> = ({ settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  return (
    <div className="p-4 pb-24 space-y-6 text-slate-200">
      <h2 className="text-2xl font-bold text-white mb-6">設定</h2>

      {/* Data Source Section */}
      <section className="bg-cardBg p-5 rounded-2xl shadow-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">資料來源</h3>
        
        <div className="flex items-center justify-between mb-4">
          <span>使用範例資料 (Demo Mode)</span>
          <button 
            onClick={() => handleChange('useDemoData', !localSettings.useDemoData)}
            className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.useDemoData ? 'bg-blue-500' : 'bg-slate-600'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.useDemoData ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        {!localSettings.useDemoData && (
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Google Apps Script URL (Web App)</label>
            <input
              type="text"
              value={localSettings.googleScriptUrl}
              onChange={(e) => handleChange('googleScriptUrl', e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        )}
      </section>

      {/* AI Key Section */}
      <section className="bg-cardBg p-5 rounded-2xl shadow-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Gemini AI 設定</h3>
        <div className="space-y-2">
          <label className="text-sm text-slate-400">API Key</label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={localSettings.geminiApiKey}
              onChange={(e) => handleChange('geminiApiKey', e.target.value)}
              placeholder="Paste your Gemini API Key here"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 pr-10 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
            <button 
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-3 text-slate-400"
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            用於投資組合的智能分析。您的 Key 僅儲存在本地瀏覽器中。
          </p>
        </div>
      </section>

      {/* Setup Guide */}
      <section className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2">如何建立 Google Sheet 後端？</h3>
        <p className="text-sm text-slate-400 mb-4">
          本應用程式需要配合 Google Apps Script 才能儲存資料。請複製以下程式碼並依照步驟部署。
        </p>
        <div className="relative bg-slate-900 p-3 rounded-lg border border-slate-700 overflow-hidden">
            <pre className="text-xs text-slate-300 overflow-x-auto h-32 custom-scrollbar">
                {GAS_SCRIPT_TEMPLATE}
            </pre>
            <button 
                onClick={handleCopyCode}
                className="absolute top-2 right-2 bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-md flex items-center gap-1 text-xs"
            >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? '已複製' : '複製程式碼'}
            </button>
        </div>
        <ol className="mt-4 text-xs text-slate-400 list-decimal list-inside space-y-1">
            <li>建立一個新的 Google Sheet。</li>
            <li>將下方分頁命名為 <code>Transactions</code>。</li>
            <li>擴充功能 (Extensions) &gt; Apps Script。</li>
            <li>貼上上方代碼。</li>
            <li>點擊部署 (Deploy) &gt; 新增部署 &gt; 類型選 "Web App"。</li>
            <li><strong>誰可以存取 (Who has access)</strong> 必須選 <strong>"Anyone" (所有人)</strong>。</li>
            <li>複製產生的 URL 並貼到上方的欄位中。</li>
        </ol>
      </section>

      <button 
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
      >
        <Save size={20} />
        儲存設定
      </button>
    </div>
  );
};

export default Settings;