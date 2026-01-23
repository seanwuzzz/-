import React, { useState, useEffect, useRef } from 'react';
import { Transaction, StockPrice, AppSettings, Tab, StockNews } from './types';
import { DEMO_PRICES, DEMO_TRANSACTIONS } from './constants';
import { calculatePortfolio } from './services/portfolioService';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Settings from './components/Settings';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import HistoryList from './components/HistoryList';
import { LayoutDashboard, Plus, Settings as SettingsIcon, RefreshCw, BarChart2, History, Clock } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string | null>(null);
  const [stockNews, setStockNews] = useState<StockNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  
  const newsCache = useRef<Record<string, StockNews[]>>({});
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
        const saved = localStorage.getItem('twStockSettings');
        return saved ? JSON.parse(saved) : {
            googleScriptUrl: '',
            useDemoData: true
        };
    } catch (e) {
        return { googleScriptUrl: '', useDemoData: true };
    }
  });

  const fetchData = async (forceSettings?: AppSettings, isManualRefresh = false) => {
    const currentSettings = forceSettings || settings;
    
    if (currentSettings.useDemoData) {
        setTransactions([...DEMO_TRANSACTIONS]);
        setPrices(DEMO_PRICES);
        setLastUpdated(new Date());
        return;
    }

    let scriptUrl = currentSettings.googleScriptUrl?.trim();
    if (!scriptUrl) return;

    // 自動補全 /exec 避免常見的 Failed to fetch 錯誤
    if (scriptUrl.includes('script.google.com') && !scriptUrl.endsWith('/exec') && !scriptUrl.includes('/exec?')) {
        scriptUrl = scriptUrl.replace(/\/$/, '') + '/exec';
    }

    setLoading(true);
    try {
        const timestamp = new Date().getTime();
        const separator = scriptUrl.includes('?') ? '&' : '?';
        // 只有手動刷新時才傳送 action=REFRESH 觸發 GAS 重寫公式
        const action = isManualRefresh ? 'REFRESH' : 'GET_DATA';
        const url = `${scriptUrl}${separator}action=${action}&t=${timestamp}`;
        
        const response = await fetch(url, { 
            method: 'GET',
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.transactions) {
            const mappedTxs: Transaction[] = data.transactions.map((t: any) => ({
                id: String(t.id),
                date: t.date ? String(t.date).substring(0, 10) : '',
                symbol: String(t.stockSymbol).trim(),
                name: t.stockName,
                type: t.type,
                shares: Number(t.shares),
                price: Number(t.pricePerShare),
                fee: Number(t.fees)
            }));
            setTransactions(mappedTxs);
        }

        if (data.quotes) {
             const mappedPrices: StockPrice[] = data.quotes.map((q: any) => ({
                 symbol: String(q.symbol).trim(),
                 price: Number(q.price),
                 changePercent: Number(q.changePercent),
                 name: undefined,
                 sector: q.sector || '未分類'
             }));
             setPrices(mappedPrices);
        }
        setLastUpdated(new Date());
    } catch (error) {
        console.error("Fetch error details:", error);
        // 如果是 Failed to fetch，通常是 CORS 或 URL 錯誤
        if (error instanceof Error && error.message === 'Failed to fetch') {
            alert("連線失敗！請確認：\n1. Google Script 已部署為「網頁應用程式」。\n2. 存取權限已設為「任何人」(Anyone)。\n3. URL 是否正確以 /exec 結尾。");
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
        fetchData(undefined, false); // 背景自動同步不觸發重寫公式
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.googleScriptUrl, settings.useDemoData]);

  const handleStockDrillDown = async (symbol: string) => {
    setFilterSymbol(symbol);
    setActiveTab(Tab.HISTORY);
    
    if (newsCache.current[symbol]) {
        setStockNews(newsCache.current[symbol]);
        setNewsLoading(false);
        return;
    }

    setStockNews([]);
    setNewsLoading(true);
    
    try {
        let news: StockNews[] = [];
        if (settings.useDemoData || !settings.googleScriptUrl) {
            await new Promise(r => setTimeout(r, 600)); 
            news = [
                { title: `${symbol} 營收創新高，法人看好後市`, source: "工商時報", url: "#", snippet: "受惠於全球需求強勁，該公司上月營收表現優於預期...", date: "今日" },
                { title: `${symbol} 除息在即，投資人關注填息力道`, source: "經濟日報", url: "#", snippet: "即將進行年度除息，殖利率表現優異吸引買盤進駐...", date: "昨日" },
                { title: `台股盤中震盪，${symbol} 展現抗跌韌性`, source: "中央社", url: "#", snippet: "今日大盤走弱，但該股在支撐位表現穩定，吸引長線資金...", date: "前日" }
            ];
        } else {
            const response = await fetch(`${settings.googleScriptUrl}${settings.googleScriptUrl.includes('?') ? '&' : '?'}action=GET_NEWS&symbol=${symbol}`);
            news = await response.json();
        }
        newsCache.current[symbol] = news;
        setStockNews(news);
    } catch (e) {
        console.error("News error:", e);
    } finally {
        setNewsLoading(false);
    }
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const newId = new Date().getTime().toString();
    if (settings.useDemoData) {
        setTransactions(prev => [...prev, { ...newTx, id: newId }]);
        setActiveTab(Tab.HOME);
        return;
    }
    
    try {
        await fetch(settings.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ ...newTx, id: newId, stockSymbol: newTx.symbol, stockName: newTx.name, pricePerShare: newTx.price, fees: newTx.fee })
        });
        setTransactions(prev => [...prev, { ...newTx, id: newId }]);
        setActiveTab(Tab.HOME);
        setTimeout(() => fetchData(undefined, false), 1000);
    } catch (e) { console.error(e); }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (settings.useDemoData) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        return;
    }
    
    try {
        await fetch(settings.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'DELETE', id })
        });
        setTransactions(prev => prev.filter(t => t.id !== id));
        setTimeout(() => fetchData(undefined, false), 1000);
    } catch (e) { console.error(e); }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    let url = newSettings.googleScriptUrl?.trim() || '';
    if (url.includes('script.google.com') && !url.endsWith('/exec') && !url.includes('/exec?')) {
        url = url.replace(/\/$/, '') + '/exec';
    }

    const cleanedSettings = {
        ...newSettings,
        googleScriptUrl: url
    };
    
    setSettings(cleanedSettings);
    localStorage.setItem('twStockSettings', JSON.stringify(cleanedSettings));
    setActiveTab(Tab.HOME);
    fetchData(cleanedSettings, true);
  };

  const { positions, summary, processedTransactions } = calculatePortfolio(transactions, prices);

  return (
    <div className="bg-darkBg min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      {activeTab !== Tab.ADD && (
        <header className="sticky top-0 z-50 bg-darkBg/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
            <h1 className="font-bold text-xl tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                投資組合管理
            </h1>
            <div className="flex items-center gap-2">
                {lastUpdated && !loading && (
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-500 uppercase tracking-tighter">Last Update</span>
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </span>
                    </div>
                )}
                <button 
                    type="button"
                    onClick={() => fetchData(undefined, true)} 
                    disabled={loading} 
                    className={`p-2 rounded-full hover:bg-slate-800 transition-colors relative ${loading ? 'text-blue-400' : 'text-slate-400'}`}
                    title="強制重新計算並同步"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </header>
      )}

      <main className="max-w-md mx-auto min-h-screen relative overflow-x-hidden">
        {activeTab === Tab.HOME && <Dashboard summary={summary} positions={positions} onStockClick={handleStockDrillDown} />}
        {activeTab === Tab.HISTORY && (
            <HistoryList 
                transactions={processedTransactions} 
                onDelete={handleDeleteTransaction} 
                filterSymbol={filterSymbol}
                onClearFilter={() => { setFilterSymbol(null); setStockNews([]); }}
                news={stockNews}
                newsLoading={newsLoading}
            />
        )}
        {activeTab === Tab.ANALYSIS && <PortfolioAnalysis summary={summary} positions={positions} />}
        {activeTab === Tab.ADD && <AddTransaction onAdd={handleAddTransaction} onCancel={() => setActiveTab(Tab.HOME)} />}
        {activeTab === Tab.SETTINGS && <Settings settings={settings} onSave={handleSaveSettings} />}
      </main>

      {activeTab !== Tab.ADD && (
        <nav className="fixed bottom-0 w-full z-50 bg-cardBg/90 backdrop-blur-lg border-t border-slate-800 pb-safe">
            <div className="max-w-md mx-auto flex justify-around items-center p-2">
                <button type="button" onClick={() => { setActiveTab(Tab.HOME); setFilterSymbol(null); setStockNews([]); }} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.HOME ? 'text-blue-400' : 'text-slate-500'}`}><LayoutDashboard size={20} /><span className="text-[10px] mt-1 font-medium">總覽</span></button>
                <button type="button" onClick={() => setActiveTab(Tab.HISTORY)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.HISTORY ? 'text-blue-400' : 'text-slate-500'}`}><History size={20} /><span className="text-[10px] mt-1 font-medium">歷史</span></button>
                <button type="button" onClick={() => setActiveTab(Tab.ADD)} className="flex flex-col items-center justify-center -mt-8 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 active:scale-95"><Plus size={28} /></button>
                <button type="button" onClick={() => setActiveTab(Tab.ANALYSIS)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.ANALYSIS ? 'text-blue-400' : 'text-slate-500'}`}><BarChart2 size={20} /><span className="text-[10px] mt-1 font-medium">分析</span></button>
                <button type="button" onClick={() => setActiveTab(Tab.SETTINGS)} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.SETTINGS ? 'text-blue-400' : 'text-slate-500'}`}><SettingsIcon size={20} /><span className="text-[10px] mt-1 font-medium">設定</span></button>
            </div>
        </nav>
      )}
    </div>
  );
}

export default App;