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

    // Robust URL cleaning
    try {
        // Remove trailing slashes
        scriptUrl = scriptUrl.replace(/\/+$/, '');

        // Handle editor URLs (e.g. .../edit#gid=0)
        if (scriptUrl.includes('/edit')) {
            scriptUrl = scriptUrl.split('/edit')[0];
        }
        
        // Handle dev deployments
        if (scriptUrl.endsWith('/dev')) {
            scriptUrl = scriptUrl.slice(0, -4);
        }

        // Ensure it ends with /exec if it's not already there (and not a query param)
        if (scriptUrl.includes('script.google.com') && !scriptUrl.endsWith('/exec') && !scriptUrl.includes('/exec?')) {
            scriptUrl = scriptUrl + '/exec';
        }
    } catch (e) {
        console.error("URL parsing error", e);
    }

    setLoading(true);
    try {
        const timestamp = new Date().getTime();
        const separator = scriptUrl.includes('?') ? '&' : '?';
        const action = isManualRefresh ? 'REFRESH' : 'GET_DATA';
        const url = `${scriptUrl}${separator}action=${action}&t=${timestamp}`;
        
        // Added mode: 'cors' and redirect: 'follow' explicitly
        const response = await fetch(url, { 
            method: 'GET', 
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        });
        
        if (!response.ok) {
            // Try to read error text if available
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }
        
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
        // Optional: show a toast or alert here if needed, but for now we rely on console
        if (isManualRefresh) {
            alert("更新失敗，請檢查網址或網路連線。\n" + (error instanceof Error ? error.message : String(error)));
        }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => { fetchData(undefined, false); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings.googleScriptUrl, settings.useDemoData]);

  const { positions, summary, processedTransactions } = calculatePortfolio(transactions, prices);

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
        const stockPos = positions.find(p => p.symbol === symbol);
        const stockName = stockPos ? stockPos.name : '';
        
        let news: StockNews[] = [];
        if (settings.useDemoData || !settings.googleScriptUrl) {
            await new Promise(r => setTimeout(r, 600)); 
            news = [
                { title: `[範例] ${symbol} ${stockName} 市場即時報`, source: "範例時報", url: "#", snippet: "範例模式僅顯示此條預設訊息。", date: "剛剛", _ts: Date.now() }
            ];
        } else {
            let scriptUrl = settings.googleScriptUrl.trim();
            
            // Same robust URL cleaning for news fetch
            scriptUrl = scriptUrl.replace(/\/+$/, '');
            if (scriptUrl.includes('/edit')) scriptUrl = scriptUrl.split('/edit')[0];
            if (scriptUrl.endsWith('/dev')) scriptUrl = scriptUrl.slice(0, -4);
            if (scriptUrl.includes('script.google.com') && !scriptUrl.endsWith('/exec') && !scriptUrl.includes('/exec?')) {
                scriptUrl = scriptUrl + '/exec';
            }

            const separator = scriptUrl.includes('?') ? '&' : '?';
            const url = `${scriptUrl}${separator}action=GET_NEWS&symbol=${symbol}&name=${encodeURIComponent(stockName)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                redirect: 'follow'
            });

            if (!response.ok) throw new Error("Backend News Error");
            const rawNews: StockNews[] = await response.json();
            
            // 後端已經回傳 Top 5 並轉換過時間戳記
            news = rawNews.sort((a, b) => (b._ts || 0) - (a._ts || 0));
        }
        newsCache.current[symbol] = news;
        setStockNews(news);
    } catch (e) {
        console.error("News error:", e);
        setStockNews([]);
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
    
    let scriptUrl = settings.googleScriptUrl.trim();
    // Same robust URL cleaning for post
    scriptUrl = scriptUrl.replace(/\/+$/, '');
    if (scriptUrl.includes('/edit')) scriptUrl = scriptUrl.split('/edit')[0];
    if (scriptUrl.endsWith('/dev')) scriptUrl = scriptUrl.slice(0, -4);
    if (scriptUrl.includes('script.google.com') && !scriptUrl.endsWith('/exec') && !scriptUrl.includes('/exec?')) {
        scriptUrl = scriptUrl + '/exec';
    }

    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors', // POST to GAS often uses no-cors due to redirect handling limitations in some browsers, but user should check if this is the issue
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newTx, id: newId, stockSymbol: newTx.symbol, stockName: newTx.name, pricePerShare: newTx.price, fees: newTx.fee })
        });
        setTransactions(prev => [...prev, { ...newTx, id: newId }]);
        setActiveTab(Tab.HOME);
        setTimeout(() => fetchData(undefined, false), 1500); // Increased delay slightly
    } catch (e) { console.error(e); }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (settings.useDemoData) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        return;
    }

    let scriptUrl = settings.googleScriptUrl.trim();
    // Same robust URL cleaning
    scriptUrl = scriptUrl.replace(/\/+$/, '');
    if (scriptUrl.includes('/edit')) scriptUrl = scriptUrl.split('/edit')[0];
    if (scriptUrl.endsWith('/dev')) scriptUrl = scriptUrl.slice(0, -4);
    if (scriptUrl.includes('script.google.com') && !scriptUrl.endsWith('/exec') && !scriptUrl.includes('/exec?')) {
        scriptUrl = scriptUrl + '/exec';
    }

    try {
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE', id })
        });
        setTransactions(prev => prev.filter(t => t.id !== id));
        setTimeout(() => fetchData(undefined, false), 1500);
    } catch (e) { console.error(e); }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    let url = newSettings.googleScriptUrl?.trim() || '';
    // Apply cleaning immediately on save
    if (url) {
        url = url.replace(/\/+$/, '');
        if (url.includes('/edit')) url = url.split('/edit')[0];
        if (url.endsWith('/dev')) url = url.slice(0, -4);
        if (url.includes('script.google.com') && !url.endsWith('/exec') && !url.includes('/exec?')) {
            url = url + '/exec';
        }
    }
    const cleanedSettings = { ...newSettings, googleScriptUrl: url };
    setSettings(cleanedSettings);
    localStorage.setItem('twStockSettings', JSON.stringify(cleanedSettings));
    setActiveTab(Tab.HOME);
    fetchData(cleanedSettings, true);
  };

  return (
    <div className="bg-darkBg min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      {activeTab !== Tab.ADD && (
        <header className="sticky top-0 z-50 bg-darkBg/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
            <h1 className="font-bold text-xl tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">投資組合管理</h1>
            <div className="flex items-center gap-2">
                {lastUpdated && !loading && (
                    <div className="flex flex-col items-end">
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1"><Clock size={10} />{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                    </div>
                )}
                <button type="button" onClick={() => fetchData(undefined, true)} disabled={loading} className={`p-2 rounded-full hover:bg-slate-800 transition-colors ${loading ? 'text-blue-400' : 'text-slate-400'}`}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
            </div>
        </header>
      )}

      <main className="max-w-md mx-auto min-h-screen relative overflow-x-hidden">
        {activeTab === Tab.HOME && <Dashboard summary={summary} positions={positions} onStockClick={handleStockDrillDown} />}
        {activeTab === Tab.HISTORY && <HistoryList transactions={processedTransactions} onDelete={handleDeleteTransaction} filterSymbol={filterSymbol} onClearFilter={() => { setFilterSymbol(null); setStockNews([]); }} news={stockNews} newsLoading={newsLoading} />}
        {activeTab === Tab.ANALYSIS && <PortfolioAnalysis summary={summary} positions={positions} transactions={processedTransactions} />}
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