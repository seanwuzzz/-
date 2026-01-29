
import React from 'react';
import { PortfolioSummary, PortfolioPosition } from '../types';
import { TrendingUp, TrendingDown, Briefcase, Hash, ChevronRight, AlertTriangle, Loader2, Minus } from 'lucide-react';

interface Props {
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
  onStockClick: (symbol: string) => void;
  isMarketOpen: boolean;
}

const Dashboard: React.FC<Props> = ({ summary, positions, onStockClick, isMarketOpen }) => {
  
  const getColor = (val: number) => {
    if (val > 0) return 'text-twRed';
    if (val < 0) return 'text-twGreen';
    return 'text-slate-400';
  };

  const getBgColor = (val: number) => {
    if (val > 0) return 'bg-twRed/10 border-twRed/30';
    if (val < 0) return 'bg-twGreen/10 border-twGreen/30';
    return 'bg-slate-800 border-slate-700';
  };

  return (
    <div className="p-3 pb-24 space-y-4 animate-fade-in">
      {/* Total Asset Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-3xl shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-0.5">
              <h2 className="text-slate-400 text-[10px] font-medium flex items-center gap-2 uppercase tracking-wider">
                 總資產市值
              </h2>
              
              {/* Market Status Indicator */}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border backdrop-blur-sm transition-colors ${
                  isMarketOpen 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-700/30 border-slate-600/30 text-slate-500'
              }`}>
                  <div className="relative flex h-1.5 w-1.5">
                    {isMarketOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isMarketOpen ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                  </div>
                  <span className="text-[9px] font-bold">
                      {isMarketOpen ? '盤中' : '收盤'}
                  </span>
              </div>
          </div>
          
          <div className="text-3xl text-white tracking-tight mb-4 flex items-baseline gap-1 tabular-nums">
            <span className="text-xl text-slate-400">$</span>
            <span className="font-bold">{Math.round(summary.totalAssets).toLocaleString()}</span>
          </div>
          
          <div className="space-y-2">
            {/* Row 1: Total Performance Stats */}
            <div className="grid grid-cols-2 gap-2">
                {/* Total Unrealized */}
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <div className="text-[9px] text-slate-500 mb-0.5 font-light">未實現損益</div>
                    <div className={`text-base font-bold ${getColor(summary.totalPL)} flex items-baseline gap-1 tabular-nums`}>
                        <span className="tracking-tight">{summary.totalPL > 0 ? '+' : ''}{Math.round(summary.totalPL).toLocaleString()}</span>
                        <span className="text-[10px] opacity-80 font-medium tracking-wide">
                            ({summary.totalPLPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
                
                {/* Total Realized */}
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <div className="text-[9px] text-slate-500 mb-0.5 font-light">累積已實現</div>
                    <div className={`text-base font-bold ${getColor(summary.totalRealizedPL)} tabular-nums tracking-tight`}>
                        {summary.totalRealizedPL > 0 ? '+' : ''}{Math.round(summary.totalRealizedPL).toLocaleString()}
                    </div>
                </div>
            </div>
            
            {/* Row 2: Today's Performance (Combined) */}
            <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                     <div className="text-[9px] text-slate-500 font-light">今日帳面</div>
                     <div className={`text-sm font-bold ${getColor(summary.dayPL)} tabular-nums tracking-tight`}>
                        {summary.dayPL > 0 ? '+' : ''}{Math.round(summary.dayPL).toLocaleString()}
                     </div>
                </div>
                {/* Separator Line: Reduced opacity to slate-700/20 */}
                <div className="h-6 w-px bg-slate-700/20 mx-2"></div>
                <div className="flex flex-col text-right">
                     <div className="text-[9px] text-slate-500 font-light">今日已實現</div>
                     <div className={`text-sm font-bold ${getColor(summary.dayRealizedPL)} tabular-nums tracking-tight`}>
                        {summary.dayRealizedPL > 0 ? '+' : ''}{Math.round(summary.dayRealizedPL).toLocaleString()}
                     </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings List */}
      <div>
        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5 px-1">
            <Briefcase size={14} className="text-blue-400"/> 持股明細
        </h3>
        
        {positions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-cardBg rounded-2xl border border-slate-800 text-xs">
                尚未有持股資料
            </div>
        ) : (
            <div className="space-y-2">
            {positions.map((pos) => {
                const isUp = pos.dayChangePercent > 0;
                const isDown = pos.dayChangePercent < 0;
                const changeColorClass = isUp ? 'text-twRed' : (isDown ? 'text-twGreen' : 'text-slate-400');
                // Added background class logic for Daily Change
                const changeBgClass = isUp ? 'bg-twRed/10 border-twRed/20' : (isDown ? 'bg-twGreen/10 border-twGreen/20' : 'bg-slate-800 border-slate-700');

                return (
                <div 
                    key={pos.symbol} 
                    onClick={() => onStockClick(pos.symbol)}
                    className="bg-cardBg p-3 rounded-2xl border border-slate-700/50 shadow-sm hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group active:scale-[0.98] relative overflow-hidden"
                >
                    {/* Compact Header Row: Symbol/Name + Price/Change */}
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        {/* Left: Symbol & Name (Clean Style) */}
                        <div className="flex flex-col justify-center gap-0.5">
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-lg text-white tabular-nums tracking-tight">{pos.symbol}</span>
                                <span className="text-xs font-bold text-slate-200">{pos.name}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-medium">{pos.sector}</span>
                        </div>

                        {/* Right: Price & Change (Optimized Layout) */}
                        <div className="text-right flex flex-col items-end gap-1">
                             {/* Current Price */}
                             <div className="text-lg font-bold text-white tracking-tight tabular-nums leading-none">
                                {pos.currentPrice > 0 ? (
                                    <span>{pos.currentPrice.toLocaleString()}</span>
                                ) : (
                                    <Loader2 size={12} className="animate-spin inline text-slate-500" />
                                )}
                            </div>

                             {/* Daily Change Badge (Re-added Background) */}
                             {pos.currentPrice > 0 && (
                                <div className={`flex items-center justify-end gap-1.5 px-1.5 py-0.5 rounded-md border text-xs font-bold tabular-nums tracking-tight ${changeBgClass} ${changeColorClass}`}>
                                    <div className="flex items-center gap-0.5">
                                        {isUp ? <TrendingUp size={10} /> : (isDown ? <TrendingDown size={10} /> : <Minus size={10} />)}
                                        <span>{pos.dayChangePercent.toFixed(2)}%</span>
                                    </div>
                                    <span className="opacity-80 font-medium text-[10px] border-l border-current/20 pl-1.5">
                                        {pos.dayChangeAmount > 0 ? '+' : ''}{Math.round(pos.dayChangeAmount).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Redesigned Stats Block: 10-column grid for better spacing */}
                    <div className="bg-slate-900/40 rounded-lg p-2.5 grid grid-cols-10 gap-2 items-center relative z-10 border border-white/5">
                         {/* Col 1: Position Size (Shares + Market Value) - Span 3 */}
                         <div className="col-span-3 flex flex-col gap-0.5">
                             <span className="text-[9px] text-slate-500 font-medium">持有</span>
                             <div className="text-xs font-bold text-slate-200 tabular-nums">
                                 {pos.shares.toLocaleString()}<span className="text-[9px] font-normal text-slate-500 ml-0.5">股</span>
                             </div>
                             <div className="text-[9px] text-slate-500 tabular-nums tracking-tight opacity-60">
                                 ${Math.round(pos.currentValue).toLocaleString()}
                             </div>
                         </div>

                         {/* Col 2: P/L Amount (Separated) - Span 4 */}
                         <div className="col-span-4 flex flex-col items-end border-l border-r border-slate-700/50 px-2">
                             <span className="text-[9px] text-slate-500 font-medium">損益</span>
                             <div className={`text-sm font-bold tabular-nums tracking-tight ${getColor(pos.unrealizedPL)}`}>
                                 {pos.unrealizedPL > 0 ? '+' : ''}{Math.round(pos.unrealizedPL).toLocaleString()}
                             </div>
                         </div>

                         {/* Col 3: ROI % (Clean - No Background) - Span 3 */}
                         <div className="col-span-3 flex flex-col items-end">
                             <span className="text-[9px] text-slate-500 font-medium">報酬率</span>
                             <div className={`text-sm font-bold tabular-nums tracking-tight ${getColor(pos.unrealizedPL)}`}>
                                 {pos.unrealizedPLPercent > 0 ? '+' : ''}{pos.unrealizedPLPercent.toFixed(1)}%
                             </div>
                         </div>
                    </div>
                </div>
                );
            })}
            </div>
        )}
      </div>

      {/* Disclaimer - Simplified */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-yellow-500/50 text-[9px]">
          <AlertTriangle size={10} className="shrink-0" />
          <span>報價延遲，以券商為準。</span>
      </div>
    </div>
  );
};

export default Dashboard;
