
import React, { useMemo, useState } from 'react';
import { PortfolioPosition, PortfolioSummary, Transaction, ProcessedTransaction } from '../types';
import { PieChart, BarChart3, Info, LayoutGrid, Flame, Activity, TrendingUp, Target, BrainCircuit, Calendar, Award, Zap, CalendarRange, TrendingDown, MousePointer2, ChevronRight } from 'lucide-react';

interface Props {
  positions: PortfolioPosition[];
  summary: PortfolioSummary;
  transactions: Transaction[];
}

enum AnalysisTab {
  ALLOCATION = '配置',
  PERFORMANCE = '損益',
  YEARLY = '年度',
  BEHAVIOR = '行為',
  INSIGHTS = '診斷'
}

const PortfolioAnalysis: React.FC<Props> = ({ positions, summary, transactions }) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalysisTab>(AnalysisTab.ALLOCATION);
  const [hoverDate, setHoverDate] = useState<{ date: string; count: number } | null>(null);
  
  // Interactive Chart State
  const [selectedChartPos, setSelectedChartPos] = useState<PortfolioPosition | null>(null);

  if (positions.length === 0 && transactions.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500 italic">
        尚未有足夠資料進行分析。
      </div>
    );
  }

  // --- Common Styles ---
  const getColor = (val: number) => val > 0 ? 'text-twRed' : (val < 0 ? 'text-twGreen' : 'text-slate-400');
  const getBgColor = (val: number) => val > 0 ? 'bg-twRed' : (val < 0 ? 'bg-twGreen' : 'bg-slate-600');

  // --- Tab 1: Allocation Logic ---
  const allocationData = useMemo(() => {
    const sectorMap = new Map<string, number>();
    positions.forEach(pos => {
      const currentVal = sectorMap.get(pos.sector) || 0;
      sectorMap.set(pos.sector, currentVal + pos.currentValue);
    });
    const sectorList = Array.from(sectorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const sortedByWeight = [...positions].sort((a, b) => b.currentValue - a.currentValue);
    return { sectorList, sortedByWeight };
  }, [positions]);

  // --- Tab 2: Performance Logic ---
  const performanceData = useMemo(() => {
    const sortedByPL = [...positions].sort((a, b) => b.unrealizedPL - a.unrealizedPL);
    const topWinners = sortedByPL.slice(0, 3).filter(p => p.unrealizedPL > 0);
    const topLosers = [...sortedByPL].reverse().slice(0, 3).filter(p => p.unrealizedPL < 0);

    // 計算總損益 (未實現 + 已實現)
    const totalNetPL = summary.totalPL + summary.totalRealizedPL;
    // 總報酬率 (基於目前投入成本)
    const totalNetPLPercent = summary.totalCost > 0 ? (totalNetPL / summary.totalCost) * 100 : 0;

    // Calculate CAGR
    let annualizedReturn = 0;
    let daysDiff = 0;
    if (transactions.length > 0) {
      const dates = transactions.map(t => new Date(t.date).getTime());
      const firstDate = new Date(Math.min(...dates));
      const today = new Date();
      daysDiff = Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0 && summary.totalCost > 0) {
        const effectiveFinalValue = summary.totalAssets + summary.totalRealizedPL;
        const totalMultiplier = effectiveFinalValue / summary.totalCost;
        if (totalMultiplier > 0) {
             annualizedReturn = (Math.pow(totalMultiplier, 365 / daysDiff) - 1) * 100;
        }
      }
    }
    
    // --- Chart Scaling Logic (Dampened) ---
    // 使用 Power Scale (0.6) 來壓縮極端值，讓小金額在圖表上也能被看見
    const maxAbsPL = Math.max(...positions.map(p => Math.abs(p.unrealizedPL))) || 1;
    
    // Scale function: Input Value -> Percentage (0-100 relative to center)
    // 這裡不直接用線性比例，而是用 Math.pow(val, 0.6)
    const power = 0.6;
    const transformedMax = Math.pow(maxAbsPL, power);

    const chartItems = sortedByPL.map(pos => {
        const absVal = Math.abs(pos.unrealizedPL);
        const transformedVal = Math.pow(absVal, power);
        const widthPercent = (transformedVal / transformedMax) * 50; // Max width is 50% (half of container)
        
        return {
            ...pos,
            widthPercent: Math.max(1, widthPercent) // Min 1% width for visibility
        };
    });

    return { 
        sortedByPL, 
        chartItems,
        topWinners, 
        topLosers, 
        annualizedReturn, 
        daysDiff, 
        totalNetPL, 
        totalNetPLPercent,
    };
  }, [positions, transactions, summary]);

  // --- Tab 3: Yearly Performance Logic ---
  const yearlyData = useMemo(() => {
    const stats: Record<string, { realizedPL: number, costBasis: number, buyCount: number, sellCount: number, buyVol: number, sellVol: number }> = {};
    transactions.forEach(tx => {
        const year = new Date(tx.date).getFullYear().toString();
        if (!stats[year]) stats[year] = { realizedPL: 0, costBasis: 0, buyCount: 0, sellCount: 0, buyVol: 0, sellVol: 0 };
        const amount = (tx as ProcessedTransaction).totalAmount;
        if (tx.type === 'SELL') {
            const pTx = tx as ProcessedTransaction;
            const pl = pTx.realizedPL !== undefined ? pTx.realizedPL : 0;
            const costOfSold = amount - pl;
            stats[year].realizedPL += pl;
            stats[year].costBasis += costOfSold;
            stats[year].sellCount += 1;
            stats[year].sellVol += amount;
        } else {
            stats[year].buyCount += 1;
            stats[year].buyVol += amount;
        }
    });
    return Object.entries(stats).map(([year, data]) => ({
        year,
        ...data,
        roi: data.costBasis > 0 ? (data.realizedPL / data.costBasis) * 100 : 0
    })).sort((a, b) => Number(b.year) - Number(a.year));
  }, [transactions]);

  // --- Tab 4: Behavior Logic ---
  const heatmapRows = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(tx => {
      const dateStr = tx.date;
      data[dateStr] = (data[dateStr] || 0) + 1;
    });
    const weeksToDisplay = 4;
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + (6 - today.getDay()));
    const start = new Date(end);
    start.setDate(end.getDate() - (weeksToDisplay * 7) + 1);
    const rows: any[][] = [];
    let currentWeek: any[] = [];
    for (let i = 0; i < weeksToDisplay * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      currentWeek.push({ date: ds, count: data[ds] || 0, dayOfWeek: d.getDay(), isFuture: d > today });
      if (d.getDay() === 6) { rows.push(currentWeek); currentWeek = []; }
    }
    return rows;
  }, [transactions]);

  const behaviorMetrics = useMemo(() => {
    const total = transactions.length;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const lastMonthCount = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= thirtyDaysAgo && tDate <= now;
    }).length;
    const weeklyFreq = lastMonthCount / 4;
    return { total, lastMonthCount, weeklyFreq };
  }, [transactions]);

  // --- Tab 5: Insights Logic ---
  const insightsData = useMemo(() => {
    const stockCount = positions.length;
    const sectorCount = allocationData.sectorList.length;
    let score = Math.min(10, (stockCount * 0.5) + (sectorCount * 1.5));
    const costGapList = positions.map(pos => ({
        name: pos.name,
        gap: ((pos.currentPrice - pos.avgCost) / pos.avgCost) * 100
    })).sort((a, b) => b.gap - a.gap);
    const portfolioBeta = summary.portfolioBeta;
    let betaDesc = portfolioBeta < 0.8 ? "低波動 (保守)" : portfolioBeta > 1.2 ? "高波動 (積極)" : "與大盤同步";
    return { score, costGapList, portfolioBeta, betaDesc };
  }, [positions, allocationData, summary]);

  // --- Helpers ---
  const getIntensityClass = (count: number, isFuture: boolean = false) => {
    if (isFuture) return 'bg-slate-900 opacity-20';
    if (count === 0) return 'bg-slate-800';
    if (count === 1) return 'bg-blue-900/60';
    if (count === 2) return 'bg-blue-700/80';
    if (count === 3) return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
    return 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]';
  };
  const getBetaColor = (beta: number) => beta < 0.8 ? 'text-twGreen' : beta > 1.2 ? 'text-twRed' : 'text-blue-400';

  return (
    <div className="p-4 pb-24 space-y-6 animate-fade-in">
      <header className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">投資組合分析</h2>
        
        {/* Tab Selection */}
        <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700 overflow-x-auto no-scrollbar">
            {Object.values(AnalysisTab).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveSubTab(tab)}
                    className={`flex-1 min-w-[60px] flex flex-col items-center py-2.5 rounded-xl transition-all duration-300 ${activeSubTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest">{tab}</span>
                </button>
            ))}
        </div>
      </header>

      {/* --- ALLOCATION --- */}
      {activeSubTab === AnalysisTab.ALLOCATION && (
        <div className="space-y-6 animate-slide-up">
            <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <LayoutGrid size={16} className="text-emerald-400" /> 產業權重
                </h3>
                {allocationData.sectorList.length > 0 ? (
                  <div className="space-y-4">
                      {allocationData.sectorList.map(sector => {
                          const weight = summary.totalAssets > 0 ? (sector.value / summary.totalAssets) * 100 : 0;
                          return (
                              <div key={sector.name} className="space-y-1">
                                  <div className="flex justify-between items-end">
                                      <span className="text-xs font-medium text-slate-300">{sector.name}</span>
                                      <span className="text-xs font-bold text-white">{weight.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${weight}%` }} />
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                ) : <div className="text-xs text-slate-500 text-center py-4">無持有部位</div>}
            </section>

            <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <PieChart size={16} className="text-blue-400" /> 個股持倉分佈
                </h3>
                {allocationData.sortedByWeight.length > 0 ? (
                  <div className="space-y-4">
                      {allocationData.sortedByWeight.map(pos => {
                          const weight = summary.totalAssets > 0 ? (pos.currentValue / summary.totalAssets) * 100 : 0;
                          return (
                              <div key={pos.symbol} className="space-y-1">
                                  <div className="flex justify-between items-end">
                                      <div className="flex flex-col">
                                          <span className="text-xs font-medium text-slate-300">{pos.name}</span>
                                          <span className="text-[9px] text-slate-500">{pos.symbol}</span>
                                      </div>
                                      <span className="text-xs font-bold text-white">{weight.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${weight}%` }} />
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                ) : <div className="text-xs text-slate-500 text-center py-4">無持有部位</div>}
            </section>
        </div>
      )}

      {/* --- PERFORMANCE --- */}
      {activeSubTab === AnalysisTab.PERFORMANCE && (
        <div className="space-y-6 animate-slide-up">
            {/* Core KPIs */}
            <section className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-3xl border border-slate-700 shadow-xl">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Award size={14} className="text-amber-400" /> 核心績效指標
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] text-slate-500 mb-1">總投報 (含已實現)</div>
                        <div className={`text-xl font-bold ${getColor(performanceData.totalNetPLPercent)}`}>
                            {performanceData.totalNetPLPercent > 0 ? '+' : ''}{performanceData.totalNetPLPercent.toFixed(2)}%
                        </div>
                        <div className={`text-[10px] font-medium mt-1 ${getColor(performanceData.totalNetPL)} opacity-80`}>
                            {performanceData.totalNetPL > 0 ? '+' : ''}${Math.round(performanceData.totalNetPL).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full -mr-4 -mt-4 blur-xl"></div>
                        <div className="text-[10px] text-slate-500 mb-1">年化報酬 (CAGR)</div>
                        <div className={`text-xl font-bold ${getColor(performanceData.annualizedReturn)}`}>
                            {performanceData.annualizedReturn > 0 ? '+' : ''}{performanceData.annualizedReturn.toFixed(2)}%
                        </div>
                         <div className="text-[10px] text-slate-500 opacity-60 mt-1">
                            總資產複合成長率
                        </div>
                    </div>
                    <div className="col-span-2 bg-black/20 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-slate-500" />
                            <span className="text-[10px] text-slate-500 uppercase">投資組合持有天數</span>
                        </div>
                        <span className="text-sm font-bold text-white">{performanceData.daysDiff} <span className="text-[10px] font-normal text-slate-400">天</span></span>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-cardBg p-4 rounded-2xl border border-slate-700">
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">
                        <TrendingUp size={12} className="text-twRed" /> 主要獲利
                    </h4>
                    {performanceData.topWinners.length > 0 ? (
                        performanceData.topWinners.map(p => (
                            <div key={p.symbol} className="flex justify-between items-center mb-1">
                                <span className="text-xs text-white truncate w-16">{p.name}</span>
                                <span className="text-xs font-bold text-twRed">+{Math.round(p.unrealizedPL).toLocaleString()}</span>
                            </div>
                        ))
                    ) : <div className="text-[10px] text-slate-600 italic">無帳面獲利</div>}
                </div>
                <div className="bg-cardBg p-4 rounded-2xl border border-slate-700">
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">
                        <TrendingDown size={12} className="text-twGreen" /> 主要虧損
                    </h4>
                    {performanceData.topLosers.length > 0 ? (
                        performanceData.topLosers.map(p => (
                            <div key={p.symbol} className="flex justify-between items-center mb-1">
                                <span className="text-xs text-white truncate w-16">{p.name}</span>
                                <span className="text-xs font-bold text-twGreen">-{Math.abs(Math.round(p.unrealizedPL)).toLocaleString()}</span>
                            </div>
                        ))
                    ) : <div className="text-[10px] text-slate-600 italic">無帳面虧損</div>}
                </div>
            </div>

            {/* HORIZONTAL DIVERGING BAR CHART (NEW) */}
            <section className="bg-cardBg p-5 rounded-2xl border border-slate-700 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <BarChart3 size={16} className="text-purple-400" /> 未實現損益排行
                    </h3>
                    <div className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded-full border border-slate-700 flex items-center gap-1">
                         <Info size={10} /> 縮放視圖
                    </div>
                </div>

                {/* Detail Overlay Card (Toggle or Default to Top) */}
                {performanceData.chartItems.length > 0 && (() => {
                    const displayPos = selectedChartPos || performanceData.chartItems[0];
                    return (
                        <div className="mb-6 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center animate-fade-in">
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-bold text-white">{displayPos.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{displayPos.symbol}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    {displayPos.shares.toLocaleString()} 股 • 成本 ${displayPos.avgCost.toFixed(1)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-lg font-bold ${getColor(displayPos.unrealizedPL)}`}>
                                    {displayPos.unrealizedPL > 0 ? '+' : ''}{Math.round(displayPos.unrealizedPL).toLocaleString()}
                                </div>
                                <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${getBgColor(displayPos.unrealizedPL)} ${getColor(displayPos.unrealizedPL)}`}>
                                    {displayPos.unrealizedPLPercent.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* The Chart */}
                {performanceData.chartItems.length > 0 ? (
                    <div className="space-y-4">
                        {performanceData.chartItems.map(pos => {
                            const isProfit = pos.unrealizedPL >= 0;
                            const isSelected = selectedChartPos?.symbol === pos.symbol;
                            
                            return (
                                <div 
                                    key={pos.symbol} 
                                    className={`group cursor-pointer transition-all ${isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                                    onClick={() => setSelectedChartPos(pos)}
                                >
                                    <div className="flex justify-between items-end mb-1 px-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-300 w-16 truncate">{pos.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-bold ${getColor(pos.unrealizedPL)}`}>
                                                {isProfit ? '+' : ''}{Math.round(pos.unrealizedPL).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Bar Track */}
                                    <div className="h-6 w-full bg-slate-800 rounded-md relative flex items-center overflow-hidden border border-slate-700/50">
                                        {/* Center Line */}
                                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-600 z-10"></div>
                                        
                                        {/* The Bar */}
                                        <div 
                                            className={`absolute h-4 rounded-sm transition-all duration-500 ${
                                                isProfit 
                                                  ? 'bg-gradient-to-r from-twRed/60 to-twRed border-r border-twRed/50' 
                                                  : 'bg-gradient-to-l from-twGreen/60 to-twGreen border-l border-twGreen/50'
                                            } ${isSelected ? 'shadow-[0_0_10px_rgba(255,255,255,0.1)]' : ''}`}
                                            style={{
                                                width: `${pos.widthPercent}%`,
                                                left: isProfit ? '50%' : undefined,
                                                right: isProfit ? undefined : '50%'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : <div className="text-xs text-slate-500 text-center py-4">無持有部位</div>}
            </section>
        </div>
      )}

      {/* --- YEARLY --- */}
      {activeSubTab === AnalysisTab.YEARLY && (
        <div className="space-y-6 animate-slide-up">
            <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <CalendarRange size={16} className="text-blue-400" /> 年度已實現績效
                    </h3>
                    <div className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 flex items-center gap-1">
                        <Info size={10} /> 僅計入已賣出部位
                    </div>
                </div>
                {yearlyData.length > 0 ? (
                    <div className="space-y-6">
                        <div className="flex items-end gap-2 h-32 pt-2 pb-2 px-2 border-b border-slate-700/50 mb-6">
                            {yearlyData.map((y, idx) => {
                                const maxAbsVal = Math.max(...yearlyData.map(d => Math.abs(d.realizedPL)));
                                const heightPct = maxAbsVal > 0 ? (Math.abs(y.realizedPL) / maxAbsVal) * 80 : 0;
                                return (
                                    <div key={y.year} className="flex-1 flex flex-col items-center gap-1 group">
                                        <div className="relative w-full flex justify-center h-full items-end">
                                            <div className={`w-4/5 min-w-[12px] max-w-[30px] rounded-t-sm transition-all duration-500 ${getBgColor(y.realizedPL)} group-hover:opacity-80`} style={{ height: `${Math.max(4, heightPct)}%` }} />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">{y.year}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="space-y-3">
                            {yearlyData.map((y) => (
                                <div key={y.year} className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-slate-200 font-mono">{y.year}</span>
                                            {y.sellCount > 0 ? (
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${y.realizedPL >= 0 ? 'bg-twRed/10 text-twRed' : 'bg-twGreen/10 text-twGreen'}`}>{y.realizedPL > 0 ? '+' : ''}{y.roi.toFixed(1)}%</span>
                                            ) : <span className="text-[10px] text-slate-500 italic">無賣出交易</span>}
                                        </div>
                                        <span className={`text-sm font-bold ${getColor(y.realizedPL)}`}>{y.realizedPL > 0 ? '+' : ''}${Math.round(y.realizedPL).toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                                        <div className="flex justify-between bg-slate-900/30 px-2 py-1 rounded"><span>賣出成本</span><span>${Math.round(y.costBasis).toLocaleString()}</span></div>
                                        <div className="flex justify-between bg-slate-900/30 px-2 py-1 rounded"><span>交易量</span><span>${Math.round(y.buyVol + y.sellVol).toLocaleString()}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : <div className="text-center py-8 text-slate-500 text-xs italic">尚無任何已實現損益紀錄</div>}
            </section>
        </div>
      )}

      {/* --- BEHAVIOR --- */}
      {activeSubTab === AnalysisTab.BEHAVIOR && (
        <div className="space-y-6 animate-slide-up">
            <section className="bg-cardBg p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Flame size={16} className="text-orange-500" /> 交易熱圖</h3>
                    <div className="text-[10px] text-slate-500 font-mono">{hoverDate ? `${hoverDate.date}: ${hoverDate.count} 次` : '最近 4 週活動'}</div>
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2 pl-8">{['日', '一', '二', '三', '四', '五', '六'].map((day) => (<div key={day} className="flex-1 text-center text-[10px] text-slate-500 font-bold">{day}</div>))}</div>
                    <div className="space-y-2">
                        {heatmapRows.map((week, wIdx) => (
                            <div key={wIdx} className="flex items-center gap-2">
                                <span className="w-6 text-[8px] text-slate-600 font-mono text-right">W-{heatmapRows.length - wIdx}</span>
                                <div className="flex-1 flex gap-2">
                                    {week.map((day: any, dIdx: number) => (
                                        <div key={dIdx} onMouseEnter={() => !day.isFuture && setHoverDate({ date: day.date, count: day.count })} onMouseLeave={() => setHoverDate(null)} className={`flex-1 aspect-square rounded-[4px] transition-all duration-300 ${getIntensityClass(day.count, day.isFuture)}`} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-6">
                    <span className="text-[8px] text-slate-500 uppercase tracking-tighter">少</span>
                    {[0, 1, 2, 3, 4].map(v => <div key={v} className={`w-[8px] h-[8px] rounded-[1px] ${getIntensityClass(v)}`}></div>)}
                    <span className="text-[8px] text-slate-500 uppercase tracking-tighter">多</span>
                </div>
            </section>
            <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Activity size={16} className="text-blue-400" /> 交易數據摘要</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-500 uppercase tracking-wider">總交易次數</div><div className="text-xl font-bold text-white">{behaviorMetrics.total} <span className="text-[10px] font-normal text-slate-400">次</span></div></div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700"><div className="text-[10px] text-slate-500 uppercase tracking-wider">近 30 天交易</div><div className="text-xl font-bold text-white">{behaviorMetrics.lastMonthCount} <span className="text-[10px] font-normal text-slate-400">次</span></div></div>
                    <div className="col-span-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div><div className="text-[10px] text-slate-500 uppercase tracking-wider">近期週頻率</div><div className="text-xs text-slate-500 opacity-60">基於近 30 天活動計算</div></div>
                        <div className="text-xl font-bold text-white">{behaviorMetrics.weeklyFreq.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">次/週</span></div>
                    </div>
                </div>
            </section>
        </div>
      )}

      {/* --- INSIGHTS --- */}
      {activeSubTab === AnalysisTab.INSIGHTS && (
        <div className="space-y-6 animate-slide-up">
            <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><BrainCircuit size={16} className="text-pink-400" /> 投資組合診斷</h3>
                    <div className="bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-pink-400 border border-pink-400/20">健康度: {insightsData.score.toFixed(1)} / 10</div>
                </div>
                <div className="space-y-4">
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5"><Zap size={14} className="text-yellow-400" /> 風險係數 (Beta)</h4>
                            <span className={`text-lg font-bold ${getBetaColor(insightsData.portfolioBeta)}`}>{insightsData.portfolioBeta.toFixed(2)}</span>
                        </div>
                        <div className="relative h-2 bg-slate-800 rounded-full mb-2 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-twGreen via-blue-500 to-twRed opacity-30"></div>
                            <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-1000" style={{ left: `${Math.min(100, Math.max(0, (insightsData.portfolioBeta / 2) * 100))}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-2"><span>0.0</span><span>1.0 (大盤)</span><span>2.0+</span></div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">您的投資組合呈現<span className={`font-bold ${getBetaColor(insightsData.portfolioBeta)}`}> {insightsData.betaDesc} </span>特性。</p>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5"><Target size={14} className="text-blue-400" /> 安全邊際 (市價 vs 成本)</h4>
                        {insightsData.costGapList.length > 0 ? (
                            <div className="space-y-3">
                                {insightsData.costGapList.slice(0, 5).map(item => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 w-16 truncate">{item.name}</span>
                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                            <div className={`h-full ${item.gap >= 0 ? 'bg-blue-500' : 'bg-slate-600'}`} style={{ width: `${Math.min(100, Math.abs(item.gap))}%` }} />
                                        </div>
                                        <span className={`text-[10px] font-bold ${getColor(item.gap)} w-12 text-right`}>{item.gap > 0 ? '+' : ''}{item.gap.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-xs text-slate-500 italic">無資料</div>}
                    </div>
                </div>
            </section>
            <section className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 flex gap-3">
                <Info className="text-blue-400 shrink-0" size={18} />
                <div className="text-[11px] text-slate-400 leading-relaxed">
                    {insightsData.score < 5 ? "您的投資組合過於集中。建議適度增加不同產業的持股以分散風險。" : "您的投資組合分散程度良好，具有較佳的抗波動能力。"}
                    {insightsData.costGapList.length > 0 && <span>目前最大潛在獲利股為 <span className="text-white font-bold">{insightsData.costGapList[0]?.name}</span>。</span>}
                </div>
            </section>
        </div>
      )}
    </div>
  );
};

export default PortfolioAnalysis;
