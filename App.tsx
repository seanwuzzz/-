
import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, StockPrice, AppSettings, Tab, StockNews } from './types';
import { DEMO_PRICES, DEMO_TRANSACTIONS } from './constants';
import { calculatePortfolio } from './services/portfolioService';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Settings from './components/Settings';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import HistoryList from './components/HistoryList';
import { LayoutDashboard, Plus, Settings as SettingsIcon, RefreshCw, BarChart2, History, Clock, Loader2, Briefcase, Timer, Moon, Sun } from 'lucide-react';

const AUTO_REFRESH_SECONDS = 300; // 5分鐘自動刷新

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string | null>(null);
  const [stockNews, setStockNews] = useState<StockNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [sheetName, setSheetName] = useState<string | null>(null);
  
  // 市場狀態
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, canRefresh: false });
  
  // 自動刷新倒數
  const [timeLeft, setTimeLeft] = useState(AUTO_REFRESH_SECONDS);
  
  // 編輯交易狀態
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // 初始設定讀取
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
        const saved = localStorage.getItem('twStockSettings');
        if (saved) return JSON.parse(saved);
        const oldGuest = localStorage.getItem('twStockSettings_guest');
        if (oldGuest) return JSON.parse(oldGuest);
        return { googleScriptUrl: '', useDemoData: true };
    } catch (e) {
        return { googleScriptUrl: '', useDemoData: true };
    }
  });

  // 計算台股市場狀態 (UTC+8)
  const checkMarketStatus = useCallback(() => {
    const now = new Date();
    // 轉換為 UTC+8 時間
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const twTime = new Date(utc + (3600000 * 8));
    
    const day = twTime.getDay(); // 0 (Sun) - 6 (Sat)
    const hour = twTime.getHours();
    const minute = twTime.getMinutes();
    const currentMinutes = hour * 60 + minute;

    // 判斷邏輯：
    // 1. 必須是平日 (週一至週五)
    // 2. 開盤: 09:00 (540分) ~ 13:30 (810分)
    // 3. 刷新: 09:00 (540分) ~ 14:00 (840分) -> 開盤期間 + 收盤後30分鐘緩衝
    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && currentMinutes >= 540 && currentMinutes <= 810;
    const canRefresh = isWeekday && currentMinutes >= 540 && currentMinutes < 840;

    return { isOpen, canRefresh };
  }, []);

  // 定期檢查市場狀態 (每分鐘)
  useEffect(() => {
    setMarketStatus(checkMarketStatus()); // Initial check
    const timer = setInterval(() => {
        setMarketStatus(checkMarketStatus());
    }, 60000);
    return () => clearInterval(timer);
  }, [checkMarketStatus]);

  const fetchData = useCallback(async (forceSettings?: AppSettings, isManualRefresh = false) => {
    const currentSettings = forceSettings || settings;
    
    if (currentSettings.useDemoData) {
        setLoading(true);
        await new Promise(r => setTimeout(r, 800));
        setTransactions([...DEMO_TRANSACTIONS]);
        setPrices(DEMO_PRICES);
        setLastUpdated(new Date());
        setLoading(false);
        setSheetName(null);
        setTimeLeft(AUTO_REFRESH_SECONDS); // 重置計時器
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

        if (data.sheetName) {
            setSheetName(data.sheetName);
        }

        setLastUpdated(new Date());
    } catch (error) {
        console.error("Fetch error:", error);
        if (isManualRefresh) alert("同步失敗，請檢查設定網址。");
    } finally {
        setLoading(false);
        setTimeLeft(AUTO_REFRESH_SECONDS); // 無論成功失敗都重置計時器
    }
  }, [settings]);

  // 抓取新聞邏輯 (省略...保持原樣)
  const fetchNews = async (symbol: string) => {
    if (settings.useDemoData) {
        setNewsLoading(true);
        await new Promise(r => setTimeout(r, 600));
        setStockNews([
            { title: `${symbol} 法說會報喜，外資喊進`, snippet: "公司今日召開法說會，公布上季營收創新高，展望未來...", url: "#", source: "Demo News", date: "2小時前", _ts: Date.now() },
            { title: `三大法人同步買超 ${symbol}`, snippet: "今日股市開高走低，唯獨該股逆勢抗跌...", url: "#", source: "Demo News", date: "5小時前", _ts: Date.now() - 18000000 },
            { title: `產業分析：${symbol} 供應鏈受惠`, snippet: "隨著AI需求強勁，相關供應鏈訂單滿載...", url: "#", source: "Demo News", date: "昨天", _ts: Date.now() - 86400000 }
        ]);
        setNewsLoading(false);
        return;
    }

    if (!settings.googleScriptUrl) return;

    setNewsLoading(true);
    try {
        const targetName = prices.find(p => p.symbol === symbol)?.name || 
                           transactions.find(t => t.symbol === symbol)?.name || '';
        const scriptUrl = settings.googleScriptUrl.trim();
        const separator = scriptUrl.includes('?') ? '&' : '?';
        const url = `${scriptUrl}${separator}action=GET_NEWS&symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(targetName)}`;

        const res = await fetch(url);
        const data = await res.json();
        
        if (Array.isArray(data)) {
            const sortedData = data.sort((a: any, b: any) => (b._ts || 0) - (a._ts || 0));
            setStockNews(sortedData);
        } else {
            setStockNews([]);
        }
    } catch (e) {
        console.error("Fetch news error", e);
        setStockNews([]);
    } finally {
        setNewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === Tab.HISTORY && filterSymbol) {
        fetchNews(filterSymbol);
    } else {
        setStockNews([]);
    }
  }, [activeTab, filterSymbol, settings.useDemoData]);

  // 初始載入與設定變更時載入
  useEffect(() => {
    if (settings.googleScriptUrl || settings.useDemoData) {
        fetchData();
    }
  }, [fetchData, settings.googleScriptUrl, settings.useDemoData]);

  // 倒數計時器邏輯 (加入市場時間判斷)
  useEffect(() => {
    if (!settings.googleScriptUrl && !settings.useDemoData) return;
    
    // 如果正在載入中，不進行倒數
    if (loading) return;

    // 如果不在自動刷新時段 (09:00 - 14:00)，且不是 Demo 模式，則不倒數
    if (!marketStatus.canRefresh && !settings.useDemoData) return;

    const timer = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) return 0;
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, settings, marketStatus.canRefresh]);

  // 當倒數歸零時觸發刷新
  useEffect(() => {
    if (timeLeft === 0 && !loading && (settings.googleScriptUrl || settings.useDemoData)) {
        fetchData(undefined, false);
    }
  }, [timeLeft, loading, fetchData, settings]);

  const handleAddTransaction = async (txData: Omit<Transaction, 'id'>) => {
    if (settings.useDemoData) {
        const newTx = { ...txData, id: Math.random().toString(36).substr(2, 9) };
        if (editingTransaction) {
            setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? { ...txData, id: editingTransaction.id } : t));
        } else {
            setTransactions(prev => [...prev, newTx]);
        }
        setActiveTab(Tab.HOME);
        setEditingTransaction(null);
        return;
    }

    if (!settings.googleScriptUrl) return;

    const payload = {
        ...txData,
        stockSymbol: txData.symbol,
        stockName: txData.name,
        shares: txData.shares,
        pricePerShare: txData.price,
        fees: txData.fee,
        id: editingTransaction ? editingTransaction.id : new Date().getTime().toString(),
        action: editingTransaction ? 'UPDATE' : 'CREATE'
    };

    try {
        const response = await fetch(settings.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        await new Promise(r => setTimeout(r, 1500));
        await fetchData();
        setActiveTab(Tab.HOME);
    } catch (error) {
        console.error("Add/Update transaction error:", error);
        alert("連線失敗，請稍後再試。");
    } finally {
        setEditingTransaction(null);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (settings.useDemoData) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        return;
    }

    if (!settings.googleScriptUrl) return;

    try {
        await fetch(settings.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE', id })
        });
        await new Promise(r => setTimeout(r, 1000));
        await fetchData();
    } catch (error) {
        alert("刪除失敗");
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setActiveTab(Tab.ADD);
  };

  const handleCancelEdit = () => {
      setEditingTransaction(null);
      setActiveTab(Tab.HOME);
  };

  const { positions, summary, processedTransactions, closedTrades } = calculatePortfolio(transactions, prices);

  const handleSaveSettings = (newSettings: AppSettings) => {
    localStorage.setItem('twStockSettings', JSON.stringify(newSettings));
    setSettings(newSettings);
    setActiveTab(Tab.HOME);
    fetchData(newSettings, true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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
                {/* 倒數計時器 (只在可刷新時段或Demo模式顯示) */}
                {!loading && (settings.googleScriptUrl || settings.useDemoData) && (marketStatus.canRefresh || settings.useDemoData) && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700 animate-fade-in">
                        <Timer size={10} />
                        {formatTime(timeLeft)}
                    </div>
                )}

                {lastUpdated && !loading && (
                    <span className="hidden xs:flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full border border-slate-700">
                        <Clock size={10} /> {lastUpdated.toLocaleTimeString([], { hour12: false })}
                    </span>
                )}
                
                <button type="button" onClick={() => fetchData(undefined, true)} disabled={loading} className={`p-2 rounded-full hover:bg-slate-800 transition-colors ${loading ? 'text-blue-400' : 'text-slate-400'}`}>
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </header>
      )}

      <main className={`max-w-md mx-auto min-h-screen relative overflow-x-hidden transition-opacity duration-500 ${loading ? 'opacity-30' : 'opacity-100'}`}>
        {activeTab === Tab.HOME && <Dashboard summary={summary} positions={positions} onStockClick={(s) => { setFilterSymbol(s); setActiveTab(Tab.HISTORY); }} isMarketOpen={marketStatus.isOpen} />}
        
        {activeTab === Tab.HISTORY && (
            <HistoryList 
                transactions={processedTransactions} 
                closedTrades={closedTrades} 
                onDelete={handleDeleteTransaction} 
                onEdit={handleStartEdit}
                filterSymbol={filterSymbol} 
                onClearFilter={() => setFilterSymbol(null)} 
                news={stockNews} 
                newsLoading={newsLoading} 
            />
        )}
        
        {activeTab === Tab.ANALYSIS && <PortfolioAnalysis summary={summary} positions={positions} transactions={processedTransactions} />}
        
        {activeTab === Tab.ADD && (
            <AddTransaction 
                onAdd={handleAddTransaction} 
                onCancel={handleCancelEdit} 
                initialData={editingTransaction} 
            />
        )}
        
        {activeTab === Tab.SETTINGS && (
            <Settings 
                settings={settings} 
                onSave={handleSaveSettings} 
                linkedSheetName={sheetName}
                lastUpdated={lastUpdated}
            />
        )}
      </main>

      {/* Footer Nav */}
      {activeTab !== Tab.ADD && (
        <nav className="fixed bottom-0 w-full z-50 bg-cardBg/90 backdrop-blur-lg border-t border-slate-800 pb-safe">
            <div className="max-w-md mx-auto flex justify-around items-center p-2">
                <button onClick={() => setActiveTab(Tab.HOME)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.HOME ? 'text-blue-400' : 'text-slate-500'}`}><LayoutDashboard size={20} /><span className="text-[10px] mt-1 font-medium">總覽</span></button>
                <button onClick={() => setActiveTab(Tab.HISTORY)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.HISTORY ? 'text-blue-400' : 'text-slate-500'}`}><History size={20} /><span className="text-[10px] mt-1 font-medium">歷史</span></button>
                <button onClick={() => { setEditingTransaction(null); setActiveTab(Tab.ADD); }} className="flex flex-col items-center justify-center -mt-8 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 active:scale-95"><Plus size={28} /></button>
                <button onClick={() => setActiveTab(Tab.ANALYSIS)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.ANALYSIS ? 'text-blue-400' : 'text-slate-500'}`}><BarChart2 size={20} /><span className="text-[10px] mt-1 font-medium">分析</span></button>
                <button onClick={() => setActiveTab(Tab.SETTINGS)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.SETTINGS ? 'text-blue-400' : 'text-slate-500'}`}><SettingsIcon size={20} /><span className="text-[10px] mt-1 font-medium">設定</span></button>
            </div>
        </nav>
      )}
    </div>
  );
}

export default App;
