
import React, { useState, useEffect, useRef } from 'react';
import { Transaction, StockPrice, AppSettings, Tab, StockNews, User } from './types';
import { DEMO_PRICES, DEMO_TRANSACTIONS } from './constants';
import { calculatePortfolio } from './services/portfolioService';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Settings from './components/Settings';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import HistoryList from './components/HistoryList';
import { LayoutDashboard, Plus, Settings as SettingsIcon, RefreshCw, BarChart2, History, Clock, Loader2, LogIn, LogOut, User as UserIcon, Briefcase } from 'lucide-react';

// Add global declaration for the google object provided by Google Identity Services
declare const google: any;

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string | null>(null);
  const [stockNews, setStockNews] = useState<StockNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false); // New state to track script loading
  
  const newsCache = useRef<Record<string, StockNews[]>>({});
  
  // 初始設定讀取
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
        // 先嘗試讀取訪客設定來獲取 Client ID
        const saved = localStorage.getItem('twStockSettings_guest');
        return saved ? JSON.parse(saved) : { googleScriptUrl: '', useDemoData: true };
    } catch (e) {
        return { googleScriptUrl: '', useDemoData: true };
    }
  });

  // 根據 User 切換讀取不同的 Settings (GAS URL)
  useEffect(() => {
    const storageKey = user ? `twStockSettings_${user.email}` : 'twStockSettings_guest';
    try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            // 確保 Client ID 延續使用
            setSettings(prev => ({ 
                ...parsed, 
                googleClientId: parsed.googleClientId || prev.googleClientId 
            }));
        }
    } catch (e) {
        // quiet fail
    }
  }, [user]);

  // Check for Google Script availability
  useEffect(() => {
    if (typeof google !== 'undefined') {
        setGsiLoaded(true);
    } else {
        const checkGsi = setInterval(() => {
            if (typeof google !== 'undefined') {
                setGsiLoaded(true);
                clearInterval(checkGsi);
            }
        }, 500);
        return () => clearInterval(checkGsi);
    }
  }, []);

  // 處理 JWT 解碼 (包含中文姓名支援)
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT Decode failed", e);
      return null;
    }
  };

  const handleGoogleResponse = (response: any) => {
    try {
        // 使用自定義的解碼函式，解決 atob 無法解析中文的問題
        const payload = parseJwt(response.credential);
        
        if (!payload) {
            alert("登入失敗：無法解析使用者資訊");
            return;
        }

        const loggedUser: User = {
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        };

        // --- 設定遷移邏輯 ---
        // 如果這個新登入的使用者之前沒有設定檔，
        // 將目前的「訪客設定」(包含 GAS URL) 複製過去，避免登入後變成空白資料
        const userKey = `twStockSettings_${loggedUser.email}`;
        if (!localStorage.getItem(userKey)) {
            const currentGuestSettings = localStorage.getItem('twStockSettings_guest');
            if (currentGuestSettings) {
                localStorage.setItem(userKey, currentGuestSettings);
            }
        }

        setUser(loggedUser);
        localStorage.setItem('twStock_lastUser', JSON.stringify(loggedUser));
        setActiveTab(Tab.HOME);
    } catch (e) {
        console.error("Login process error", e);
        alert("登入過程發生錯誤，請查看控制台");
    }
  };

  // Dynamic Google Login Initialization
  useEffect(() => {
    const clientId = settings.googleClientId?.trim();

    if (gsiLoaded && clientId) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false // 停用 FedCM 以避免在部分環境報錯
        });
      } catch (e) {
        console.warn("Google Sign-In init failed", e);
      }
    }
  }, [settings.googleClientId, gsiLoaded]);

  const login = () => {
    if (!settings.googleClientId) {
      alert("請先至「設定」頁面輸入 Google Client ID 才能啟用登入功能。");
      setActiveTab(Tab.SETTINGS);
      return;
    }
    
    if (gsiLoaded) {
      // 重新初始化以確保 callback 是最新的
      google.accounts.id.initialize({
        client_id: settings.googleClientId,
        callback: handleGoogleResponse,
        use_fedcm_for_prompt: false
      });
      google.accounts.id.prompt((notification: any) => {
         if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("One Tap skipped/not displayed, reason:", notification.getNotDisplayedReason());
         }
      });
    } else {
        alert("Google 登入服務尚未載入完成，請稍候再試。");
    }
  };

  const logout = () => {
    if (typeof google !== 'undefined') {
        google.accounts.id.disableAutoSelect();
    }
    setUser(null);
    localStorage.removeItem('twStock_lastUser');
    
    // 登出後，嘗試保留 Client ID
    const guestSettingsStr = localStorage.getItem('twStockSettings_guest');
    if (guestSettingsStr) {
        const guestSettings = JSON.parse(guestSettingsStr);
        setSettings(prev => ({...guestSettings, googleClientId: prev.googleClientId})); 
    }
  };

  const fetchData = async (forceSettings?: AppSettings, isManualRefresh = false) => {
    const currentSettings = forceSettings || settings;
    
    if (currentSettings.useDemoData) {
        setLoading(true);
        await new Promise(r => setTimeout(r, 800));
        setTransactions([...DEMO_TRANSACTIONS]);
        setPrices(DEMO_PRICES);
        setLastUpdated(new Date());
        setLoading(false);
        return;
    }

    let scriptUrl = currentSettings.googleScriptUrl?.trim();
    if (!scriptUrl) return;

    setLoading(true);
    try {
        const timestamp = new Date().getTime();
        const action = isManualRefresh ? 'REFRESH' : 'GET_DATA';
        const separator = scriptUrl.includes('?') ? '&' : '?';
        const url = `${scriptUrl}${separator}action=${action}&t=${timestamp}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.transactions) {
            setTransactions(data.transactions.map((t: any) => ({
                id: String(t.id),
                date: String(t.date).substring(0, 10),
                symbol: String(t.stockSymbol).trim(),
                name: t.stockName,
                type: t.type,
                shares: Number(t.shares),
                price: Number(t.pricePerShare),
                fee: Number(t.fees)
            })));
        }

        if (data.quotes) {
             setPrices(data.quotes.map((q: any) => ({
                 symbol: String(q.symbol).trim(),
                 price: Number(q.price),
                 changePercent: Number(q.changePercent),
                 sector: q.sector || '未分類',
                 beta: q.beta
             })));
        }
        setLastUpdated(new Date());
    } catch (error) {
        console.error("Fetch error:", error);
        if (isManualRefresh) alert("同步失敗，請檢查設定網址。");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (settings.googleScriptUrl || settings.useDemoData) {
        fetchData();
    }
  }, [settings.googleScriptUrl, settings.useDemoData]);

  const { positions, summary, processedTransactions } = calculatePortfolio(transactions, prices);

  const handleSaveSettings = (newSettings: AppSettings) => {
    if (user) {
        localStorage.setItem(`twStockSettings_${user.email}`, JSON.stringify(newSettings));
    }
    
    // 同步更新 Guest 設定中的 Client ID
    try {
        const guestSaved = localStorage.getItem('twStockSettings_guest');
        const guestSettings = guestSaved ? JSON.parse(guestSaved) : { googleScriptUrl: '', useDemoData: true };
        guestSettings.googleClientId = newSettings.googleClientId;
        localStorage.setItem('twStockSettings_guest', JSON.stringify(guestSettings));
    } catch (e) {}

    setSettings(newSettings);
    setActiveTab(Tab.HOME);
    fetchData(newSettings, true);
  };

  return (
    <div className="bg-darkBg min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      {/* 1. 全螢幕載入遮罩 */}
      {loading && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in pointer-events-auto">
            <div className="bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl flex flex-col items-center gap-5">
                <Loader2 size={48} className="text-blue-400 animate-spin" />
                <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-white tracking-widest uppercase mb-1">正在同步資料</span>
                    <span className="text-xs text-slate-400">請稍候，正在確保數據精確...</span>
                </div>
            </div>
        </div>
      )}

      {activeTab !== Tab.ADD && (
        <header className="sticky top-0 z-50 bg-darkBg/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Briefcase size={16} className="text-white" />
                </div>
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">投資管家</h1>
            </div>
            
            <div className="flex items-center gap-3">
                {lastUpdated && !loading && (
                    <span className="hidden xs:flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700">
                        <Clock size={10} /> {lastUpdated.toLocaleTimeString([], { hour12: false })}
                    </span>
                )}
                
                {/* User Profile / Login Button */}
                {user ? (
                    <button onClick={() => setActiveTab(Tab.SETTINGS)} className="flex items-center gap-2 p-1 pl-3 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 transition-all group">
                        <span className="text-xs font-medium text-slate-300 max-w-[80px] truncate">{user.name}</span>
                        <img src={user.picture} alt="Avatar" className="w-7 h-7 rounded-full border border-blue-500/30 group-hover:scale-105 transition-transform" />
                    </button>
                ) : (
                    <button onClick={login} className={`p-2 rounded-full border transition-all active:scale-90 ${settings.googleClientId ? 'bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white border-slate-700' : 'bg-amber-900/20 text-amber-500 border-amber-500/30'}`}>
                        <LogIn size={20} />
                    </button>
                )}
                
                <button type="button" onClick={() => fetchData(undefined, true)} disabled={loading} className={`p-2 rounded-full hover:bg-slate-800 transition-colors ${loading ? 'text-blue-400' : 'text-slate-400'}`}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </header>
      )}

      <main className={`max-w-md mx-auto min-h-screen relative overflow-x-hidden transition-opacity duration-500 ${loading ? 'opacity-30' : 'opacity-100'}`}>
        {activeTab === Tab.HOME && <Dashboard summary={summary} positions={positions} onStockClick={(s) => { setFilterSymbol(s); setActiveTab(Tab.HISTORY); }} />}
        {activeTab === Tab.HISTORY && <HistoryList transactions={processedTransactions} onDelete={async (id) => {/* logic already in HistoryList */}} filterSymbol={filterSymbol} onClearFilter={() => setFilterSymbol(null)} news={stockNews} newsLoading={newsLoading} />}
        {activeTab === Tab.ANALYSIS && <PortfolioAnalysis summary={summary} positions={positions} transactions={processedTransactions} />}
        {activeTab === Tab.ADD && <AddTransaction onAdd={async (tx) => { /* logic to handle GAS call */ }} onCancel={() => setActiveTab(Tab.HOME)} />}
        {activeTab === Tab.SETTINGS && <Settings settings={settings} onSave={handleSaveSettings} user={user} onLogout={logout} onLogin={login} />}
      </main>

      {/* Footer Nav */}
      {activeTab !== Tab.ADD && (
        <nav className="fixed bottom-0 w-full z-50 bg-cardBg/90 backdrop-blur-lg border-t border-slate-800 pb-safe">
            <div className="max-w-md mx-auto flex justify-around items-center p-2">
                <button onClick={() => setActiveTab(Tab.HOME)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.HOME ? 'text-blue-400' : 'text-slate-500'}`}><LayoutDashboard size={20} /><span className="text-[10px] mt-1 font-medium">總覽</span></button>
                <button onClick={() => setActiveTab(Tab.HISTORY)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.HISTORY ? 'text-blue-400' : 'text-slate-500'}`}><History size={20} /><span className="text-[10px] mt-1 font-medium">歷史</span></button>
                <button onClick={() => setActiveTab(Tab.ADD)} className="flex flex-col items-center justify-center -mt-8 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 active:scale-95"><Plus size={28} /></button>
                <button onClick={() => setActiveTab(Tab.ANALYSIS)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.ANALYSIS ? 'text-blue-400' : 'text-slate-500'}`}><BarChart2 size={20} /><span className="text-[10px] mt-1 font-medium">分析</span></button>
                <button onClick={() => setActiveTab(Tab.SETTINGS)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.SETTINGS ? 'text-blue-400' : 'text-slate-500'}`}><SettingsIcon size={20} /><span className="text-[10px] mt-1 font-medium">設定</span></button>
            </div>
        </nav>
      )}
    </div>
  );
}

export default App;
