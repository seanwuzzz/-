
import React, { useMemo, useState } from 'react';
import { PortfolioPosition, PortfolioSummary, Transaction, ProcessedTransaction } from '../types';
import { PieChart, BarChart3, Info, LayoutGrid, Flame, Activity, TrendingUp, Target, BrainCircuit, Calendar, Award, Zap, CalendarRange, TrendingDown, ShieldCheck, Layers, ChevronDown, ChevronUp } from 'lucide-react';

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

// Chart Color Palette - Premium Fintech / Professional
const CHART_COLORS = [
  '#6366f1', // Indigo (Primary)
  '#14b8a6', // Teal (Calm)
  '#f43f5e', // Rose (Accent)
  '#eab308', // Yellow (Warning)
  '#8b5cf6', // Violet (Deep)
  '#3b82f6', // Blue (Standard)
  '#ec4899', // Pink (Vibrant)
  '#84cc16', // Lime (Fresh)
];

const OTHERS_COLOR = '#64748b'; // Slate 500 for "Others" category

const PortfolioAnalysis: React.FC<Props> = ({ positions, summary, transactions }) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalysisTab>(AnalysisTab.ALLOCATION);
  const [hoverDate, setHoverDate] = useState<{ date: string; count: number } | null>(null);
  const [selectedChartPos, setSelectedChartPos] = useState<PortfolioPosition | null>(null);
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [showAllHoldings, setShowAllHoldings] = useState(false);

  if (positions.length === 0 && transactions.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500 italic">
        尚未有足夠資料進行分析。
      </div>
    );
  }

  const getColor = (val: number) => val > 0 ? 'text-twRed' : (val < 0 ? 'text-twGreen' : 'text-slate-400');
  const getBgColor = (val: number) => val > 0 ? 'bg-twRed' : (val < 0 ? 'bg-twGreen' : 'bg-slate-600');

  // --- Tab 1: Allocation Logic ---
  const allocationData = useMemo(() => {
    const sectorMap = new Map<string, number>();
    positions.forEach(pos => {
      const currentVal = sectorMap.get(pos.sector) || 0;
      sectorMap.set(pos.sector, currentVal + pos.currentValue);
    });
    
    let allSectors = Array.from(sectorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const MAX_SLICES = 5;
    let displayList = [];
    
    if (allSectors.length > MAX_SLICES) {
        const topSectors = allSectors.slice(0, MAX_SLICES);
        const otherSectors = allSectors.slice(MAX_SLICES);
        const othersValue = otherSectors.reduce((sum, s) => sum + s.value, 0);
        
        displayList = topSectors.map((s, i) => ({
            ...s,
            color: CHART_COLORS[i]
        }));
        displayList.push({
            name: '其他產業',
            value: othersValue,
            color: OTHERS_COLOR
        });
    } else {
        displayList = allSectors.map((s, i) => ({
            ...s,
            color: CHART_COLORS[i % CHART_COLORS.length]
        }));
    }

    let cumulativePercent = 0;
    const donutSegments = displayList.map(sector => {
        const percent = summary.totalAssets > 0 ? (sector.value / summary.totalAssets) : 0;
        const startPercent = cumulativePercent;
        cumulativePercent += percent;
        return {
            ...sector,
            percent,
            startPercent,
            endPercent: cumulativePercent
        };
    });

    const sortedByWeight = [...positions].sort((a, b) => b.currentValue - a.currentValue);
    const top3Concentration = sortedByWeight.slice(0, 3).reduce((acc, curr) => acc + curr.currentValue, 0);
    const concentrationPct = summary.totalAssets > 0 ? (top3Concentration / summary.totalAssets) * 100 : 0;

    return { sectorList: donutSegments, sortedByWeight, concentrationPct, totalSectorsRaw: allSectors.length };
  }, [positions, summary.totalAssets]);

  // --- Tab 2: Performance Logic ---
  const performanceData = useMemo(() => {
    const sortedByPL = [...positions].sort((a, b) => b.unrealizedPL - a.unrealizedPL);
    const topWinners = sortedByPL.slice(0, 3).filter(p => p.unrealizedPL > 0);
    const topLosers = [...sortedByPL].reverse().slice(0, 3).filter(p => p.unrealizedPL < 0);

    const totalNetPL = summary.totalPL + summary.totalRealizedPL;
    const totalNetPLPercent = summary.totalCost > 0 ? (totalNetPL / summary.totalCost) * 100 : 0;

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
    
    const maxAbsPL = Math.max(...positions.map(p => Math.abs(p.unrealizedPL))) || 1;
    const power = 0.6;
    const transformedMax = Math.pow(maxAbsPL, power);

    const chartItems = sortedByPL.map(pos => {
        const absVal = Math.abs(pos.unrealizedPL);
        const transformedVal = Math.pow(absVal, power);
        const widthPercent = (transformedVal / transformedMax) * 50; 
        
        return {
            ...pos,
            widthPercent: Math.max(1, widthPercent) 
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

  // --- Tab 3: Yearly Logic ---
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
    const diversificationScore = Math.min(8, (stockCount * 0.5) + (sectorCount * 1.5));
    
    const portfolioBeta = summary.portfolioBeta;
    let betaScore = 0;
    const distFromOne = Math.abs(portfolioBeta - 1);
    
    if (distFromOne <= 0.2) betaScore = 2;
    else if (distFromOne <= 0.5) betaScore = 1;

    const score = Math.min(10, diversificationScore + betaScore);
    
    let betaDesc = "";
    let volatilityText = "";
    
    if (portfolioBeta < 0.8) {
        betaDesc = "防禦型 (低波動)";
        volatilityText = `比大盤波動低 ${Math.round((1 - portfolioBeta) * 100)}%`;
    } else if (portfolioBeta > 1.2) {
        betaDesc = "積極型 (高波動)";
        volatilityText = `比大盤波動高 ${Math.round((portfolioBeta - 1) * 100)}%`;
    } else {
        betaDesc = "市場型 (同步大盤)";
        volatilityText = "與大盤走勢接近";
    }

    const sortedByBeta = [...positions].map(p => ({
        ...p,
        beta: p.beta || 1 // fallback
    })).sort((a, b) => b.beta - a.beta);

    return { score, portfolioBeta, betaDesc, volatilityText, sortedByBeta };
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
  
  const getBetaColorClass = (beta: number) => {
      if (beta > 1.2) return 'text-twRed bg-twRed/10 border-twRed/20';
      if (beta < 0.8) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  const getBetaLabel = (beta: number) => {
      if (beta > 1.2) return { text: '積極', icon: <Flame size={10} /> };
      if (beta < 0.8) return { text: '防禦', icon: <ShieldCheck size={10} /> };
      return { text: '穩健', icon: <Activity size={10} /> };
  };

  const visibleHoldings = showAllHoldings 
      ? allocationData.sortedByWeight 
      : allocationData.sortedByWeight.slice(0, 5); 
  const hiddenCount = allocationData.sortedByWeight.length - 5;

  return (
    <div className="p-3 pb-24 space-y-4 animate-fade-in">
      <header className="mb-2">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">投資組合分析</h2>
        
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
        <div className="space-y-4 animate-slide-up">
            
            <section className="bg-cardBg p-4 rounded-2xl border border-slate-700 shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        <LayoutGrid size={14} className="text-emerald-400" /> 產業權重分佈
                    </h3>
                    <div className="text-[9px] font-numeric text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full font-medium">
                        共 {allocationData.totalSectorsRaw} 類
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    {/* SVG Donut Chart */}
                    <div className="relative w-48 h-48 mb-6">
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }} className="w-full h-full">
                            {allocationData.sectorList.map((sector) => {
                                if (sector.value === 0) return null;
                                const isHovered = hoveredSector === sector.name;
                                return (
                                    <circle
                                        key={sector.name}
                                        cx="0" cy="0" r="0.8" 
                                        fill="transparent"
                                        stroke={sector.color}
                                        strokeWidth={isHovered ? "0.25" : "0.2"} 
                                        strokeDasharray={`${sector.percent * Math.PI * 1.6} ${Math.PI * 1.6}`} 
                                        strokeDashoffset={-sector.startPercent * Math.PI * 1.6}
                                        strokeLinecap="round" 
                                        className="transition-all duration-300 cursor-pointer hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                                        onMouseEnter={() => setHoveredSector(sector.name)}
                                        onMouseLeave={() => setHoveredSector(null)}
                                        style={{ opacity: hoveredSector && !isHovered ? 0.3 : 1 }}
                                    />
                                );
                            })}
                        </svg>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">總資產</span>
                            <span className="text-lg font-bold text-white tracking-tight tabular-nums">${(summary.totalAssets / 10000).toFixed(0)}萬</span>
                            
                            {hoveredSector && (
                                <div className="absolute top-32 flex flex-col items-center bg-slate-800/90 px-3 py-1.5 rounded-2xl border border-slate-600 backdrop-blur-md animate-fade-in z-20 shadow-xl">
                                    <span className="text-[9px] text-slate-400 mb-0.5">{hoveredSector}</span>
                                    <span className="text-xs font-bold text-white tabular-nums">
                                        {(allocationData.sectorList.find(s => s.name === hoveredSector)?.percent! * 100).toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full">
                         {allocationData.sectorList.map((sector) => (
                             <div 
                                key={sector.name} 
                                className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent ${hoveredSector === sector.name ? 'bg-slate-700/50 border-slate-600' : 'hover:bg-slate-800/30'}`}
                                onMouseEnter={() => setHoveredSector(sector.name)}
                                onMouseLeave={() => setHoveredSector(null)}
                             >
                                 <div className="flex items-center gap-2 min-w-0">
                                     <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sector.color }}></div>
                                     <span className="text-[11px] text-slate-300 font-medium truncate">{sector.name}</span>
                                 </div>
                                 <span className="text-[11px] font-bold text-slate-400 tabular-nums">{(sector.percent * 100).toFixed(1)}%</span>
                             </div>
                         ))}
                    </div>
                </div>
            </section>

            {/* Individual Holdings Card */}
            <section className="bg-cardBg p-4 rounded-2xl border border-slate-700 shadow-md">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        <PieChart size={14} className="text-blue-400" /> 持股權重排行
                    </h3>
                    
                    <div className={`px-2 py-0.5 rounded-full border flex items-center gap-1 ${allocationData.concentrationPct > 70 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                        <Layers size={10} />
                        <span className="text-[9px] font-bold tabular-nums">CR3: {allocationData.concentrationPct.toFixed(0)}%</span>
                    </div>
                </div>

                {allocationData.sortedByWeight.length > 0 ? (
                  <div className="space-y-3">
                      {visibleHoldings.map((pos, idx) => {
                          const weight = summary.totalAssets > 0 ? (pos.currentValue / summary.totalAssets) * 100 : 0;
                          return (
                              <div key={pos.symbol} className="relative group">
                                  <div className="flex justify-between items-center mb-1 relative z-10">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold border tabular-nums ${idx < 3 ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                              {idx + 1}
                                          </div>
                                          <div className="flex flex-col">
                                              <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">{pos.name}</span>
                                          </div>
                                      </div>
                                      <div className="text-right flex items-baseline gap-2">
                                          <span className="text-[9px] text-slate-500 tabular-nums hidden xs:inline">${(pos.currentValue / 1000).toFixed(0)}k</span>
                                          <span className="text-xs font-bold text-white w-10 text-right tabular-nums">{weight.toFixed(1)}%</span>
                                      </div>
                                  </div>
                                  
                                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ 
                                            width: `${weight}%`,
                                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length], 
                                        }} 
                                      />
                                  </div>
                              </div>
                          );
                      })}

                      {allocationData.sortedByWeight.length > 5 && (
                          <button 
                            onClick={() => setShowAllHoldings(!showAllHoldings)}
                            className="w-full py-2 mt-1 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all active:scale-95"
                          >
                              {showAllHoldings ? (
                                  <>收合清單 <ChevronUp size={12} /></>
                              ) : (
                                  <>查看全部持股 (還有 {hiddenCount} 檔) <ChevronDown size={12} /></>
                              )}
                          </button>
                      )}
                  </div>
                ) : <div className="text-xs text-slate-500 text-center py-4">無持有部位</div>}
            </section>
        </div>
      )}

      {/* --- PERFORMANCE --- */}
      {activeSubTab === AnalysisTab.PERFORMANCE && (
        <div className="space-y-4 animate-slide-up">
            <section className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-slate-700 shadow-xl">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Award size={12} className="text-amber-400" /> 核心績效指標
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <div className="text-[9px] text-slate-500 mb-1 font-light">總投報 (含已實現)</div>
                        <div className={`text-xl font-bold tabular-nums ${getColor(performanceData.totalNetPLPercent)}`}>
                            {performanceData.totalNetPLPercent > 0 ? '+' : ''}{performanceData.totalNetPLPercent.toFixed(2)}%
                        </div>
                        <div className={`text-[9px] font-medium mt-0.5 tabular-nums ${getColor(performanceData.totalNetPL)} opacity-80`}>
                            {performanceData.totalNetPL > 0 ? '+' : ''}${Math.round(performanceData.totalNetPL).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full -mr-4 -mt-4 blur-xl"></div>
                        <div className="text-[9px] text-slate-500 mb-1 font-light">年化報酬 (CAGR)</div>
                        <div className={`text-xl font-bold tabular-nums ${getColor(performanceData.annualizedReturn)}`}>
                            {performanceData.annualizedReturn > 0 ? '+' : ''}{performanceData.annualizedReturn.toFixed(2)}%
                        </div>
                         <div className="text-[9px] text-slate-500 opacity-60 mt-0.5 font-light">
                            總資產複合成長率
                        </div>
                    </div>
                    <div className="col-span-2 bg-black/20 p-2.5 rounded-lg border border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-slate-500" />
                            <span className="text-[9px] text-slate-500 uppercase">投資組合持有天數</span>
                        </div>
                        <span className="text-sm font-bold text-white tabular-nums">{performanceData.daysDiff} <span className="text-[9px] font-light text-slate-400 font-sans">天</span></span>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-cardBg p-3 rounded-xl border border-slate-700">
                    <h4 className="text-[9px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">
                        <TrendingUp size={10} className="text-twRed" /> 主要獲利
                    </h4>
                    {performanceData.topWinners.length > 0 ? (
                        performanceData.topWinners.map(p => (
                            <div key={p.symbol} className="flex justify-between items-center mb-1">
                                <span className="text-[11px] text-white truncate w-16 font-medium">{p.name}</span>
                                <span className="text-[11px] font-bold text-twRed tabular-nums">+{Math.round(p.unrealizedPL).toLocaleString()}</span>
                            </div>
                        ))
                    ) : <div className="text-[9px] text-slate-600 italic">無帳面獲利</div>}
                </div>
                <div className="bg-cardBg p-3 rounded-xl border border-slate-700">
                    <h4 className="text-[9px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">
                        <TrendingDown size={10} className="text-twGreen" /> 主要虧損
                    </h4>
                    {performanceData.topLosers.length > 0 ? (
                        performanceData.topLosers.map(p => (
                            <div key={p.symbol} className="flex justify-between items-center mb-1">
                                <span className="text-[11px] text-white truncate w-16 font-medium">{p.name}</span>
                                <span className="text-[11px] font-bold text-twGreen tabular-nums">-{Math.abs(Math.round(p.unrealizedPL)).toLocaleString()}</span>
                            </div>
                        ))
                    ) : <div className="text-[9px] text-slate-600 italic">無帳面虧損</div>}
                </div>
            </div>

            {/* HORIZONTAL DIVERGING BAR CHART */}
            <section className="bg-cardBg p-4 rounded-2xl border border-slate-700 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        <BarChart3 size={14} className="text-purple-400" /> 未實現損益排行
                    </h3>
                    <div className="text-[9px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1">
                         <Info size={10} /> 縮放視圖
                    </div>
                </div>

                {/* Detail Overlay Card */}
                {performanceData.chartItems.length > 0 && (() => {
                    const displayPos = selectedChartPos || performanceData.chartItems[0];
                    return (
                        <div className="mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center animate-fade-in">
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-base font-bold text-white">{displayPos.name}</span>
                                    <span className="text-[9px] text-slate-400 tabular-nums font-light">{displayPos.symbol}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 tabular-nums font-light">
                                    {displayPos.shares.toLocaleString()} 股 • 成本 ${displayPos.avgCost.toFixed(1)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-base font-bold tabular-nums tracking-tight ${getColor(displayPos.unrealizedPL)}`}>
                                    {displayPos.unrealizedPL > 0 ? '+' : ''}{Math.round(displayPos.unrealizedPL).toLocaleString()}
                                </div>
                                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block tabular-nums ${getBgColor(displayPos.unrealizedPL)} ${getColor(displayPos.unrealizedPL)}`}>
                                    {displayPos.unrealizedPLPercent.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* The Chart */}
                {performanceData.chartItems.length > 0 ? (
                    <div className="space-y-3">
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
                                            <span className="text-[11px] font-semibold text-slate-300 w-16 truncate">{pos.name}</span>
                                        </div>
                                        <div className="text-right flex items-center justify-end gap-2">
                                            <span className={`text-[9px] font-medium opacity-70 tabular-nums ${getColor(pos.unrealizedPL)}`}>
                                                {pos.unrealizedPLPercent > 0 ? '+' : ''}{pos.unrealizedPLPercent.toFixed(2)}%
                                            </span>
                                            <span className={`text-[11px] font-bold tabular-nums ${getColor(pos.unrealizedPL)}`}>
                                                {isProfit ? '+' : ''}{Math.round(pos.unrealizedPL).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="h-4 w-full bg-slate-800 rounded-md relative flex items-center overflow-hidden border border-slate-700/50">
                                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-600 z-10"></div>
                                        <div 
                                            className={`absolute h-3 rounded-sm transition-all duration-500 ${
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
        <div className="space-y-4 animate-slide-up">
            <section className="bg-cardBg p-4 rounded-2xl border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        <CalendarRange size={14} className="text-blue-400" /> 年度已實現績效
                    </h3>
                    <div className="text-[9px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 flex items-center gap-1">
                        <Info size={10} /> 僅計入已賣出部位
                    </div>
                </div>
                {yearlyData.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-end gap-2 h-24 pt-2 pb-2 px-2 border-b border-slate-700/50 mb-4">
                            {yearlyData.map((y, idx) => {
                                const maxAbsVal = Math.max(...yearlyData.map(d => Math.abs(d.realizedPL)));
                                const heightPct = maxAbsVal > 0 ? (Math.abs(y.realizedPL) / maxAbsVal) * 80 : 0;
                                return (
                                    <div key={y.year} className="flex-1 flex flex-col items-center gap-1 group">
                                        <div className="relative w-full flex justify-center h-full items-end">
                                            <div className={`w-3/5 min-w-[10px] max-w-[24px] rounded-t-sm transition-all duration-500 ${getBgColor(y.realizedPL)} group-hover:opacity-80`} style={{ height: `${Math.max(4, heightPct)}%` }} />
                                        </div>
                                        <span className="text-[9px] text-slate-400 tabular-nums">{y.year}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="space-y-2">
                            {yearlyData.map((y) => (
                                <div key={y.year} className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-200 tabular-nums">{y.year}</span>
                                            {y.sellCount > 0 ? (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums ${y.realizedPL >= 0 ? 'bg-twRed/10 text-twRed' : 'bg-twGreen/10 text-twGreen'}`}>{y.realizedPL > 0 ? '+' : ''}{y.roi.toFixed(1)}%</span>
                                            ) : <span className="text-[9px] text-slate-500 italic">無賣出交易</span>}
                                        </div>
                                        <span className={`text-xs font-bold tabular-nums ${getColor(y.realizedPL)}`}>{y.realizedPL > 0 ? '+' : ''}${Math.round(y.realizedPL).toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500">
                                        <div className="flex justify-between bg-slate-900/30 px-2 py-0.5 rounded"><span>賣出成本</span><span className="tabular-nums font-medium">${Math.round(y.costBasis).toLocaleString()}</span></div>
                                        <div className="flex justify-between bg-slate-900/30 px-2 py-0.5 rounded"><span>交易量</span><span className="tabular-nums font-medium">${Math.round(y.buyVol + y.sellVol).toLocaleString()}</span></div>
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
        <div className="space-y-4 animate-slide-up">
            <section className="bg-cardBg p-4 rounded-2xl border border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2"><Flame size={14} className="text-orange-500" /> 交易熱圖</h3>
                    <div className="text-[9px] text-slate-500 tabular-nums">{hoverDate ? `${hoverDate.date}: ${hoverDate.count} 次` : '最近 4 週活動'}</div>
                </div>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 pl-8">{['日', '一', '二', '三', '四', '五', '六'].map((day) => (<div key={day} className="flex-1 text-center text-[9px] text-slate-500 font-bold">{day}</div>))}</div>
                    <div className="space-y-1.5">
                        {heatmapRows.map((week, wIdx) => (
                            <div key={wIdx} className="flex items-center gap-2">
                                <span className="w-6 text-[8px] text-slate-600 tabular-nums text-right">W-{heatmapRows.length - wIdx}</span>
                                <div className="flex-1 flex gap-2">
                                    {week.map((day: any, dIdx: number) => (
                                        <div key={dIdx} onMouseEnter={() => !day.isFuture && setHoverDate({ date: day.date, count: day.count })} onMouseLeave={() => setHoverDate(null)} className={`flex-1 aspect-square rounded-[3px] transition-all duration-300 ${getIntensityClass(day.count, day.isFuture)}`} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-4">
                    <span className="text-[8px] text-slate-500 uppercase tracking-tighter">少</span>
                    {[0, 1, 2, 3, 4].map(v => <div key={v} className={`w-[6px] h-[6px] rounded-[1px] ${getIntensityClass(v)}`}></div>)}
                    <span className="text-[8px] text-slate-500 uppercase tracking-tighter">多</span>
                </div>
            </section>
            <section className="bg-cardBg p-4 rounded-2xl border border-slate-700">
                <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Activity size={14} className="text-blue-400" /> 交易數據摘要</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700"><div className="text-[9px] text-slate-500 uppercase tracking-wider font-light">總交易次數</div><div className="text-lg font-bold text-white tabular-nums">{behaviorMetrics.total} <span className="text-[9px] font-light text-slate-400 font-sans">次</span></div></div>
                    <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700"><div className="text-[9px] text-slate-500 uppercase tracking-wider font-light">近 30 天交易</div><div className="text-lg font-bold text-white tabular-nums">{behaviorMetrics.lastMonthCount} <span className="text-[9px] font-light text-slate-400 font-sans">次</span></div></div>
                    <div className="col-span-2 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div><div className="text-[9px] text-slate-500 uppercase tracking-wider font-light">近期週頻率</div><div className="text-[9px] text-slate-500 opacity-60">基於近 30 天活動計算</div></div>
                        <div className="text-lg font-bold text-white tabular-nums">{behaviorMetrics.weeklyFreq.toFixed(1)} <span className="text-[9px] font-light text-slate-400 font-sans">次/週</span></div>
                    </div>
                </div>
            </section>
        </div>
      )}

      {/* --- INSIGHTS --- */}
      {activeSubTab === AnalysisTab.INSIGHTS && (
        <div className="space-y-4 animate-slide-up">
            <section className="bg-cardBg p-4 rounded-2xl border border-slate-700">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2"><BrainCircuit size={14} className="text-pink-400" /> 投資組合診斷</h3>
                    <div className="bg-slate-800 px-2 py-0.5 rounded-full text-[9px] font-bold text-pink-400 border border-pink-400/20 tabular-nums">健康度: {insightsData.score.toFixed(1)} / 10</div>
                </div>
                
                <div className="space-y-4">
                    {/* 投資組合 Beta 儀表板 */}
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <div>
                                <h4 className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5"><Zap size={12} className="text-yellow-400" /> 整體風險係數 (Beta) <span className="text-[9px] text-slate-500 font-light ml-1">(近半年)</span></h4>
                                <p className="text-[9px] text-slate-400 mt-0.5">{insightsData.volatilityText}</p>
                            </div>
                            <span className={`text-xl font-bold tabular-nums ${insightsData.portfolioBeta > 1.2 ? 'text-twRed' : insightsData.portfolioBeta < 0.8 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {insightsData.portfolioBeta.toFixed(2)}
                            </span>
                        </div>
                        <div className="relative h-1.5 bg-slate-800 rounded-full mb-1.5 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-blue-500 to-red-500 opacity-50"></div>
                            {/* Marker */}
                            <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-1000 border border-black/20 rounded-full z-10" style={{ left: `${Math.min(100, Math.max(0, (insightsData.portfolioBeta / 2) * 100))}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-500 tabular-nums font-light">
                            <span>0.5 (低)</span>
                            <span>1.0 (大盤)</span>
                            <span>1.5 (高)</span>
                        </div>
                    </div>

                    {/* 個股 Beta 風險屬性列表 */}
                    <div>
                        <h4 className="text-[11px] font-bold text-white mb-2 flex items-center gap-1.5">
                            <Target size={12} className="text-blue-400" /> 個股波動風險屬性 <span className="text-[9px] text-slate-500 font-normal ml-1">(近半年)</span>
                        </h4>
                        <div className="space-y-1.5">
                            {insightsData.sortedByBeta.map((pos) => {
                                const { text, icon } = getBetaLabel(pos.beta);
                                const colorClass = getBetaColorClass(pos.beta);
                                const weight = summary.totalAssets > 0 ? (pos.currentValue / summary.totalAssets) * 100 : 0;
                                
                                return (
                                    <div key={pos.symbol} className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {/* Beta Box */}
                                            <div className={`w-8 h-8 shrink-0 rounded-lg flex flex-col items-center justify-center font-bold text-[10px] ${colorClass}`}>
                                                <span className="tabular-nums font-bold">{pos.beta.toFixed(2)}</span>
                                                <span className="text-[7px] opacity-70">Beta</span>
                                            </div>
                                            
                                            {/* Stock Info + Weight Bar */}
                                            <div className="flex flex-col flex-1 min-w-0 mr-3">
                                                <div className="flex justify-between items-baseline mb-0.5">
                                                    <span className="text-[11px] font-semibold text-slate-200 truncate">{pos.name}</span>
                                                    <span className={`text-[8px] flex items-center gap-1 font-medium ${colorClass} shrink-0`}>
                                                        {icon} {text}
                                                    </span>
                                                </div>
                                                
                                                {/* Weight Visual Bar */}
                                                <div className="flex flex-col w-full gap-0.5">
                                                     <div className="flex justify-between items-end">
                                                        <span className="text-[7px] text-slate-500 font-light">權重</span>
                                                        <span className="text-[7px] text-slate-400 tabular-nums font-medium">{weight.toFixed(1)}%</span>
                                                     </div>
                                                     <div className="h-0.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${weight}%` }}></div>
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Beta vs Market Bar */}
                                        <div className="flex flex-col items-end gap-0.5 w-12 shrink-0 border-l border-slate-700/50 pl-1.5">
                                            <span className="text-[7px] text-slate-500 mb-0.5 font-light">vs 大盤</span>
                                            <div className="w-full h-1 bg-slate-700 rounded-full relative overflow-hidden">
                                                {/* Center Line at 1.0 */}
                                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500 z-10"></div>
                                                <div 
                                                    className={`absolute h-full rounded-full ${pos.beta > 1 ? 'bg-red-400' : 'bg-emerald-400'}`}
                                                    style={{
                                                        left: pos.beta > 1 ? '50%' : `${Math.max(0, (pos.beta / 2) * 100)}%`,
                                                        width: `${Math.abs(pos.beta - 1) * 50}%` // Simple visual scale
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>
        </div>
      )}
    </div>
  );
};

export default PortfolioAnalysis;
