import React, { useMemo, useState } from 'react';
import { PortfolioPosition, PortfolioSummary, Transaction } from '../types';
import { PieChart, BarChart3, Info, LayoutGrid, Flame, Activity, TrendingUp, Target, BrainCircuit, Calendar, Award, Zap } from 'lucide-react';

interface Props {
  positions: PortfolioPosition[];
  summary: PortfolioSummary;
  transactions: Transaction[];
}

enum AnalysisTab {
  ALLOCATION = '配置',
  PERFORMANCE = '損益',
  BEHAVIOR = '行為',
  INSIGHTS = '診斷'
}

const PortfolioAnalysis: React.FC<Props> = ({ positions, summary, transactions }) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalysisTab>(AnalysisTab.ALLOCATION);
  const [hoverDate, setHoverDate] = useState<{ date: string; count: number } | null>(null);

  if (positions.length === 0 && transactions.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500 italic">
        尚未有足夠資料進行分析。
      </div>
    );
  }

  // --- Common Styles ---
  const getColor = (val: number) => val >= 0 ? 'text-twRed' : 'text-twGreen';
  const getBgColor = (val: number) => val >= 0 ? 'bg-twRed' : 'bg-twGreen';

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

    // Calculate CAGR (Adjusted to include Realized P&L)
    let annualizedReturn = 0;
    let daysDiff = 0;
    if (transactions.length > 0) {
      const dates = transactions.map(t => new Date(t.date).getTime());
      const firstDate = new Date(Math.min(...dates));
      const today = new Date();
      daysDiff = Math.ceil((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0 && summary.totalCost > 0) {
        // formula: (( (CurrentValue + RealizedPL) / TotalCost) ^ (365 / days)) - 1
        // 我們將已實現損益加回資產終值，模擬這些獲利也是產出的一部分
        const effectiveFinalValue = summary.totalAssets + summary.totalRealizedPL;
        const totalMultiplier = effectiveFinalValue / summary.totalCost;
        
        if (totalMultiplier > 0) {
             annualizedReturn = (Math.pow(totalMultiplier, 365 / daysDiff) - 1) * 100;
        }
      }
    }

    return { sortedByPL, topWinners, topLosers, annualizedReturn, daysDiff, totalNetPL, totalNetPLPercent };
  }, [positions, transactions, summary]);

  // --- Tab 3: Behavior Logic (Heatmap & Metrics) ---
  const heatmapRows = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(tx => {
      const dateStr = tx.date;
      data[dateStr] = (data[dateStr] || 0) + 1;
    });

    const weeksToDisplay = 4;
    const today = new Date();
    // 找到本週的週日作為結束點
    const end = new Date(today);
    end.setDate(today.getDate() + (6 - today.getDay()));
    
    // 計算起始點（往前推 4 週的週日）
    const start = new Date(end);
    start.setDate(end.getDate() - (weeksToDisplay * 7) + 1);
    
    const rows: any[][] = [];
    let currentWeek: any[] = [];
    
    for (let i = 0; i < weeksToDisplay * 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      
      currentWeek.push({ 
        date: ds, 
        count: data[ds] || 0, 
        dayOfWeek: d.getDay(),
        isFuture: d > today
      });
      
      if (d.getDay() === 6) {
        rows.push(currentWeek);
        currentWeek = [];
      }
    }
    return rows;
  }, [transactions]);

  const behaviorMetrics = useMemo(() => {
    const total = transactions.length;
    const now = new Date();
    // 設定為當天結束，確保包含今天的所有交易
    now.setHours(23, 59, 59, 999);
    
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // 設定為當天開始
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const lastMonthCount = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= thirtyDaysAgo && tDate <= now;
    }).length;

    // 假設一個月約 4 週
    const weeklyFreq = lastMonthCount / 4;

    return { total, lastMonthCount, weeklyFreq };
  }, [transactions]);

  // --- Tab 4: Insights Logic ---
  const insightsData = useMemo(() => {
    // Diversification score (1-10)
    const stockCount = positions.length;
    const sectorCount = allocationData.sectorList.length;
    let score = Math.min(10, (stockCount * 0.5) + (sectorCount * 1.5));
    
    // Cost Basis Distance
    const costGapList = positions.map(pos => ({
        name: pos.name,
        gap: ((pos.currentPrice - pos.avgCost) / pos.avgCost) * 100
    })).sort((a, b) => b.gap - a.gap);

    // Beta Analysis
    const portfolioBeta = summary.portfolioBeta;
    let betaDesc = "";
    if (portfolioBeta < 0.8) betaDesc = "低波動 (保守)";
    else if (portfolioBeta > 1.2) betaDesc = "高波動 (積極)";
    else betaDesc = "與大盤同步";

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

  const getBetaColor = (beta: number) => {
      if (beta < 0.8) return 'text-twGreen';
      if (beta > 1.2) return 'text-twRed';
      return 'text-blue-400';
  };

  return (
    <div className="p-4 pb-24 space-y-6 animate-fade-in">
      <header className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">投資組合分析</h2>
        
        {/* Tab Selection Navigation */}
        <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700">
            {Object.values(AnalysisTab).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveSubTab(tab)}
                    className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all duration-300 ${activeSubTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest">{tab}</span>
                </button>
            ))}
        </div>
      </header>

      {/* --- Tab Content: ALLOCATION --- */}
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

      {/* --- Tab Content: PERFORMANCE --- */}
      {activeSubTab === AnalysisTab.PERFORMANCE && (
        <div className="space-y-6 animate-slide-up">
            {/* Core Performance Indicators */}
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
                            {performanceData.totalNetPL > 0 ? '+' : ''}${performanceData.totalNetPL.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full -mr-4 -mt-4 blur-xl"></div>
                        <div className="text-[10px] text-slate-500 mb-1">年化報酬 (CAGR)</div>
                        <div className={`text-xl font-bold ${getColor(performanceData.annualizedReturn)}`}>
                            {performanceData.annualizedReturn > 0 ? '+' : ''}{performanceData.annualizedReturn.toFixed(2)}%
                        </div>
                         <div className="text-[10px] text-slate-500 opacity-60 mt-1">
                            含已實現損益
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
                        <TrendingUp size={12} className="text-twGreen rotate-180" /> 主要虧損
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

            <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-purple-400" /> 未實現損益排行 (持倉中)
                </h3>
                {performanceData.sortedByPL.length > 0 ? (
                    <div className="space-y-4">
                        {performanceData.sortedByPL.map(pos => {
                            const maxAbsPL = Math.max(...positions.map(p => Math.abs(p.unrealizedPL)));
                            const barWidth = maxAbsPL > 0 ? (Math.abs(pos.unrealizedPL) / maxAbsPL) * 100 : 0;
                            
                            return (
                                <div key={pos.symbol} className="flex items-center gap-3">
                                    <div className="w-16 text-[10px] text-slate-400 truncate">{pos.name}</div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex justify-center">
                                            <div 
                                                className={`h-full ${getBgColor(pos.unrealizedPL)} rounded-full`}
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                        <div className={`w-16 text-right text-[10px] font-bold ${getColor(pos.unrealizedPL)}`}>
                                            {pos.unrealizedPL > 0 ? '+' : ''}{Math.round(pos.unrealizedPL).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : <div className="text-xs text-slate-500 text-center py-4">無持有部位</div>}
            </section>
        </div>
      )}

      {/* --- Tab Content: BEHAVIOR --- */}
      {activeSubTab === AnalysisTab.BEHAVIOR && (
        <div className="space-y-6 animate-slide-up">
            <section className="bg-cardBg p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Flame size={16} className="text-orange-500" /> 交易熱圖
                    </h3>
                    <div className="text-[10px] text-slate-500 font-mono">
                        {hoverDate ? `${hoverDate.date}: ${hoverDate.count} 次` : '最近 4 週活動'}
                    </div>
                </div>
                
                <div className="flex flex-col gap-4">
                    {/* 橫軸標籤：星期 */}
                    <div className="flex gap-2 pl-8">
                        {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                            <div key={day} className="flex-1 text-center text-[10px] text-slate-500 font-bold">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* 縱軸標籤 + 熱圖方塊 */}
                    <div className="space-y-2">
                        {heatmapRows.map((week, wIdx) => (
                            <div key={wIdx} className="flex items-center gap-2">
                                <span className="w-6 text-[8px] text-slate-600 font-mono text-right">W-{heatmapRows.length - wIdx}</span>
                                <div className="flex-1 flex gap-2">
                                    {week.map((day: any, dIdx: number) => (
                                        <div 
                                            key={dIdx}
                                            onMouseEnter={() => !day.isFuture && setHoverDate({ date: day.date, count: day.count })}
                                            onMouseLeave={() => setHoverDate(null)}
                                            className={`flex-1 aspect-square rounded-[4px] transition-all duration-300 ${getIntensityClass(day.count, day.isFuture)}`}
                                        />
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
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-blue-400" /> 交易數據摘要
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">總交易次數</div>
                        <div className="text-xl font-bold text-white">{behaviorMetrics.total} <span className="text-[10px] font-normal text-slate-400">次</span></div>
                    </div>
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">近 30 天交易</div>
                        <div className="text-xl font-bold text-white">{behaviorMetrics.lastMonthCount} <span className="text-[10px] font-normal text-slate-400">次</span></div>
                    </div>
                    <div className="col-span-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">近期週頻率</div>
                            <div className="text-xs text-slate-500 opacity-60">基於近 30 天活動計算</div>
                        </div>
                        <div className="text-xl font-bold text-white">{behaviorMetrics.weeklyFreq.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">次/週</span></div>
                    </div>
                </div>
            </section>
        </div>
      )}

      {/* --- Tab Content: INSIGHTS --- */}
      {activeSubTab === AnalysisTab.INSIGHTS && (
        <div className="space-y-6 animate-slide-up">
            <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <BrainCircuit size={16} className="text-pink-400" /> 投資組合診斷
                    </h3>
                    <div className="bg-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-pink-400 border border-pink-400/20">
                        健康度: {insightsData.score.toFixed(1)} / 10
                    </div>
                </div>
                
                <div className="space-y-4">
                    {/* BETA RISK ANALYSIS */}
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3 relative z-10">
                            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                <Zap size={14} className="text-yellow-400" /> 風險係數 (Beta)
                            </h4>
                            <span className={`text-lg font-bold ${getBetaColor(insightsData.portfolioBeta)}`}>
                                {insightsData.portfolioBeta.toFixed(2)}
                            </span>
                        </div>
                        
                        <div className="relative h-2 bg-slate-800 rounded-full mb-2 overflow-hidden">
                            {/* Gradient Bar: Green (Safe) -> Blue (Market) -> Red (Risky) */}
                            <div className="absolute inset-0 bg-gradient-to-r from-twGreen via-blue-500 to-twRed opacity-30"></div>
                            {/* Marker */}
                            <div 
                                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-1000"
                                style={{ left: `${Math.min(100, Math.max(0, (insightsData.portfolioBeta / 2) * 100))}%` }}
                            />
                        </div>
                        
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-2">
                            <span>0.0</span>
                            <span>1.0 (大盤)</span>
                            <span>2.0+</span>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            您的投資組合呈現<span className={`font-bold ${getBetaColor(insightsData.portfolioBeta)}`}> {insightsData.betaDesc} </span>特性。
                            {insightsData.portfolioBeta > 1.2 && " 波動性高於大盤，多頭市場可能獲利較高，但回檔風險也較大。"}
                            {insightsData.portfolioBeta < 0.8 && " 波動性低於大盤，表現相對穩健，適合保守防禦。"}
                        </p>
                    </div>

                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                            <Target size={14} className="text-blue-400" /> 安全邊際 (市價 vs 成本)
                        </h4>
                        {insightsData.costGapList.length > 0 ? (
                            <div className="space-y-3">
                                {insightsData.costGapList.slice(0, 5).map(item => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 w-16 truncate">{item.name}</span>
                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                            <div 
                                                className={`h-full ${item.gap >= 0 ? 'bg-blue-500' : 'bg-slate-600'}`}
                                                style={{ width: `${Math.min(100, Math.abs(item.gap))}%` }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-bold ${getColor(item.gap)} w-12 text-right`}>
                                            {item.gap > 0 ? '+' : ''}{item.gap.toFixed(1)}%
                                        </span>
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
                    {insightsData.score < 5 ? (
                        "您的投資組合過於集中。建議適度增加不同產業的持股以分散風險。"
                    ) : (
                        "您的投資組合分散程度良好，具有較佳的抗波動能力。"
                    )}
                    {insightsData.costGapList.length > 0 && (
                        <span>目前最大潛在獲利股為 <span className="text-white font-bold">{insightsData.costGapList[0]?.name}</span>。</span>
                    )}
                </div>
            </section>
        </div>
      )}
    </div>
  );
};

export default PortfolioAnalysis;