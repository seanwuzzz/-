import React, { useState, useEffect, useRef } from 'react';
import { Transaction, StockPrice, AppSettings, Tab, StockNews } from './types';
import { DEMO_PRICES, DEMO_TRANSACTIONS } from './constants';
import { calculatePortfolio } from './services/portfolioService';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Settings from './components/Settings';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import HistoryList from './components/HistoryList';
import { LayoutDashboard, Plus, Settings as SettingsIcon, RefreshCw, BarChart2, History } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSymbol, setFilterSymbol] = useState<string | null>(null);
  const [stockNews, setStockNews] = useState<StockNews[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  
  const newsCache = useRef<Record<string, StockNews[]>>({});
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('twStockSettings');
    return saved ? JSON.parse(saved) : {
        googleScriptUrl: '',
        useDemoData: true
    };
  });

  const fetchData = async () => {
    if (settings.useDemoData) {
        if (transactions.length === 0) {
            setTransactions([...DEMO_TRANSACTIONS]);
        }
        setPrices(DEMO_PRICES);
        return;
    }

    if (!settings.googleScriptUrl) return;

    setLoading(true);
    try {
        const response = await fetch(settings.googleScriptUrl);
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
    } catch (error) {
        console.error("Fetch error", error);
    } finally {
        setLoading(false);
    }
  };

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
            // Demo Mode 模擬新聞
            await new Promise(r => setTimeout(r, 600)); // 模擬網路延遲
            news = [
                { title: `${symbol} 營收創新高，法人看好後市`, source: "工商時報", url: "#", snippet: "受惠於全球需求強勁，該公司上月營收表現優於預期...", date: "今日" },
                { title: `${symbol} 除息在即，投資人關注填息力道`, source: "經濟日報", url: "#", snippet: "即將進行年度除息，殖利率表現優異吸引買盤進駐...", date: "昨日" },
                { title: `台股盤中震盪，${symbol} 展現抗跌韌性`, source: "中央社", url: "#", snippet: "今日大盤走弱，但該股在支撐位表現穩定，吸引長線資金...", date: "前日" }
            ];
        } else {
            // 從 GAS Proxy 獲取 RSS 新聞
            const response = await fetch(`${settings.googleScriptUrl}?action=GET_NEWS&symbol=${symbol}`);
            news = await response.json();
        }

        newsCache.current[symbol] = news;
        setStockNews(news);
    } catch (e) {
        console.error("Failed to load news via GAS", e);
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
        const response = await fetch(settings.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ ...newTx, id: newId, stockSymbol: newTx.symbol, stockName: newTx.name, pricePerShare: newTx.price, fees: newTx.fee })
        });
        setTransactions(prev => [...prev, { ...newTx, id: newId }]);
        setActiveTab(Tab.HOME);
        fetchData();
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
        fetchData();
    } catch (e) { console.error(e); }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('twStockSettings', JSON.stringify(newSettings));
    setActiveTab(Tab.HOME);
  };

  useEffect(() => {
    fetchData();
  }, [settings.useDemoData, settings.googleScriptUrl]);

  const { positions, summary, processedTransactions } = calculatePortfolio(transactions, prices);

  return (
    <div className="bg-darkBg min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      {activeTab !== Tab.ADD && (
        <header className="sticky top-0 z-50 bg-darkBg/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
            <h1 className="font-bold text-xl tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                投資組合管理
            </h1>
            <button onClick={fetchData} disabled={loading} className={`p-2 rounded-full hover:bg-slate-800 transition-colors ${loading ? 'animate-spin' : ''}`}>
                <RefreshCw size={18} className="text-slate-400" />
            </button>
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
                <button onClick={() => { setActiveTab(Tab.HOME); setFilterSymbol(null); setStockNews([]); }} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.HOME ? 'text-blue-400' : 'text-slate-500'}`}><LayoutDashboard size={20} /><span className="text-[10px] mt-1 font-medium">總覽</span></button>
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