import React, { useState, useEffect } from 'react';
import { Transaction, StockPrice, AppSettings, Tab } from './types';
import { DEMO_PRICES, DEMO_TRANSACTIONS } from './constants';
import { calculatePortfolio } from './services/portfolioService';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import Settings from './components/Settings';
import AIAnalysis from './components/AIAnalysis';
import { LayoutDashboard, Plus, Settings as SettingsIcon, Bot, RefreshCw } from 'lucide-react';

function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<Tab>(Tab.HOME);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('twStockSettings');
    return saved ? JSON.parse(saved) : {
        googleScriptUrl: '',
        geminiApiKey: '',
        useDemoData: true
    };
  });

  // --- Actions ---

  const saveData = async () => {
    if (!settings.useDemoData && settings.googleScriptUrl) {
       await fetchData();
    } else {
        // Reset to demo
        setTransactions(DEMO_TRANSACTIONS);
        setPrices(DEMO_PRICES);
    }
  };

  const fetchData = async () => {
    if (settings.useDemoData) {
        setTransactions(DEMO_TRANSACTIONS);
        setPrices(DEMO_PRICES);
        return;
    }

    if (!settings.googleScriptUrl) return;

    setLoading(true);
    try {
        const response = await fetch(settings.googleScriptUrl);
        const data = await response.json();
        
        // Map GAS API structure to Internal App structure
        if (data.transactions) {
            const mappedTxs: Transaction[] = data.transactions.map((t: any) => ({
                id: String(t.id),
                date: t.date ? String(t.date).substring(0, 10) : '', // Ensure basic date string
                symbol: String(t.stockSymbol).trim().toUpperCase(),
                name: t.stockName,
                type: t.type,
                shares: Number(t.shares),
                price: Number(t.pricePerShare),
                fee: Number(t.fees)
            }));
            setTransactions(mappedTxs);
        }

        // GAS returns 'quotes', App uses 'prices'
        if (data.quotes) {
             const mappedPrices: StockPrice[] = data.quotes.map((q: any) => ({
                 symbol: String(q.symbol).trim().toUpperCase(),
                 price: Number(q.price),
                 changePercent: Number(q.changePercent),
                 name: undefined // GAS 'quotes' object doesn't have name
             }));
             setPrices(mappedPrices);
        } else if (data.prices) {
             // Fallback just in case
             setPrices(data.prices);
        }

    } catch (error) {
        console.error("Fetch error", error);
        alert("無法抓取資料，請檢查 URL 或網路連線。");
    } finally {
        setLoading(false);
    }
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    // Generate ID client-side because your GAS script requires it in the POST body
    const newId = new Date().getTime().toString();

    if (settings.useDemoData) {
        const mockTx = { ...newTx, id: newId };
        setTransactions([...transactions, mockTx]);
        setActiveTab(Tab.HOME);
        return;
    }

    try {
        // Prepare payload matching your GAS doPost expectation
        const payload = {
            id: newId,
            date: newTx.date,
            type: newTx.type,
            stockSymbol: newTx.symbol, // Already trimmed in component
            stockName: newTx.name,
            shares: newTx.shares,
            pricePerShare: newTx.price,
            fees: newTx.fee
        };

        const res = await fetch(settings.googleScriptUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const json = await res.json();
        if (json.status === 'error') {
            throw new Error(json.message);
        }

        await fetchData(); // Reload to get updated list
        setActiveTab(Tab.HOME);
    } catch (e) {
        console.error(e);
        alert("儲存失敗: " + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('twStockSettings', JSON.stringify(newSettings));
    // Data will reload in useEffect when settings change
    setActiveTab(Tab.HOME);
  };

  // --- Effects ---
  
  useEffect(() => {
    saveData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.useDemoData, settings.googleScriptUrl]);

  // --- Render Calc ---
  const { positions, summary } = calculatePortfolio(transactions, prices);

  // --- Render ---

  return (
    <div className="bg-darkBg min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      
      {/* Top Bar */}
      {activeTab !== Tab.ADD && (
        <header className="sticky top-0 z-50 bg-darkBg/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
            <h1 className="font-bold text-xl tracking-wide bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                TW Stock
            </h1>
            <button 
                onClick={fetchData} 
                disabled={loading}
                className={`p-2 rounded-full hover:bg-slate-800 transition-colors ${loading ? 'animate-spin' : ''}`}
            >
                <RefreshCw size={20} className="text-slate-400" />
            </button>
        </header>
      )}

      {/* Main Content Area */}
      <main className="max-w-md mx-auto min-h-screen relative">
        {activeTab === Tab.HOME && <Dashboard summary={summary} positions={positions} />}
        {activeTab === Tab.ADD && (
            <AddTransaction onAdd={handleAddTransaction} onCancel={() => setActiveTab(Tab.HOME)} />
        )}
        {activeTab === Tab.AI && (
            <AIAnalysis apiKey={settings.geminiApiKey} summary={summary} positions={positions} />
        )}
        {activeTab === Tab.SETTINGS && (
            <Settings settings={settings} onSave={handleSaveSettings} />
        )}
      </main>

      {/* Bottom Navigation */}
      {activeTab !== Tab.ADD && (
        <nav className="fixed bottom-0 w-full z-50 bg-cardBg/90 backdrop-blur-lg border-t border-slate-800 pb-safe">
            <div className="max-w-md mx-auto flex justify-around items-center p-2">
                <button 
                    onClick={() => setActiveTab(Tab.HOME)}
                    className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.HOME ? 'text-blue-400' : 'text-slate-500'}`}
                >
                    <LayoutDashboard size={24} />
                    <span className="text-[10px] mt-1 font-medium">總覽</span>
                </button>
                
                <button 
                    onClick={() => setActiveTab(Tab.ADD)}
                    className="flex flex-col items-center justify-center -mt-8 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus size={28} />
                </button>

                <button 
                    onClick={() => setActiveTab(Tab.AI)}
                    className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.AI ? 'text-purple-400' : 'text-slate-500'}`}
                >
                    <Bot size={24} />
                    <span className="text-[10px] mt-1 font-medium">AI 診斷</span>
                </button>
                
                 <button 
                    onClick={() => setActiveTab(Tab.SETTINGS)}
                    className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${activeTab === Tab.SETTINGS ? 'text-blue-400' : 'text-slate-500'}`}
                >
                    <SettingsIcon size={24} />
                    <span className="text-[10px] mt-1 font-medium">設定</span>
                </button>
            </div>
        </nav>
      )}
    </div>
  );
}

export default App;