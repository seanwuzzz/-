
import React, { useState } from 'react';
import { PortfolioSummary, PortfolioPosition } from '../types';
import { TrendingUp, TrendingDown, Briefcase, Hash, ChevronRight, AlertTriangle, Loader2, Minus, Eye, EyeOff } from 'lucide-react';

interface Props {
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
  onStockClick: (symbol: string) => void;
  isMarketOpen: boolean;
  defaultShowBalance: boolean;
}

const Dashboard: React.FC<Props> = ({ summary, positions, onStockClick, isMarketOpen, defaultShowBalance }) => {
  const [showBalance, setShowBalance] = useState(defaultShowBalance);

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

  // Helper to mask sensitive values
  const renderValue = (val: React.ReactNode, isSensitive = true) => {
    if (isSensitive && !showBalance) return <span className="font-mono tracking-widest opacity-60">****</span>;
    return val;
  };

  return (
    <div className="p-3 pb-24 space-y-4 animate-fade-in">
      {/* Total Asset Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-3xl shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                    總資產市值
                </h2>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
                    className="text-slate-500 hover:text-white transition-colors p-1 rounded-full active:bg-white/10"
                >
                    {showBalance ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
              
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
            <span className="font-bold">
                {renderValue(Math.round(summary.totalAssets).toLocaleString())}
            </span>
          </div>
          
          <div className="space-y-2">
            {/* Row 1: Total Performance Stats */}
            <div className="grid grid-cols-2 gap-2">
                {/* Total Unrealized */}
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <div className="text-[9px] text-slate-500 mb-0.5 font-light">未實現損益</div>
                    <div className={`text-base font-bold ${getColor(summary.totalPL)} flex items-baseline gap-1 tabular-nums`}>
                        <span className="tracking-tight">
                            {renderValue(
                                <>{summary.totalPL > 0 ? '+' : ''}{Math.round(summary.totalPL).toLocaleString()}</>
                            )}
                        </span>
                        <span className="text-[10px] opacity-80 font-medium tracking-wide">
                            ({renderValue(<>{summary.totalPLPercent.toFixed(2)}%</>)})
                        </span>
                    </div>
                </div>
                
                {/* Total Realized */}
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <div className="text-[9px] text-slate-500 mb-0.5 font-light">累積已實現</div>
                    <div className={`text-base font-bold ${getColor(summary.totalRealizedPL)} tabular-nums tracking-tight`}>
                        {renderValue(
                            <>{summary.totalRealizedPL > 0 ? '+' : ''}{Math.round(summary.totalRealizedPL).toLocaleString()}</>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Row 2: Today's Performance (Combined) */}
            <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                     <div className="text-[9px] text-slate-500 font-light">今日帳面</div>
                     <div className={`text-sm font-bold ${getColor(summary.dayPL)} tabular-nums tracking-tight`}>
                        {renderValue(
                            <>{summary.dayPL > 0 ? '+' : ''}{Math.round(summary.dayPL).toLocaleString()}</>
                        )}
                     </div>
                </div>
                {/* Separator Line: Reduced opacity to slate-700/20 */}
                <div className="h-6 w-px bg-slate-700/20 mx-2"></div>
                <div className="flex flex-col text-right">
                     <div className="text-[9px] text-slate-500 font-light">今日已實現</div>
                     <div className={`text-sm font-bold ${getColor(summary.dayRealizedPL)} tabular-nums tracking-tight`}>
                        {renderValue(
                            <>{summary.dayRealizedPL > 0 ? '+' : ''}{Math.round(summary.dayRealizedPL).toLocaleString()}</>
                        )}
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
                        <div className="text-right flex flex-col items-end justify-center gap-1">
                             {/* Current Price with Label (Inline) */}
                             <div className="flex items-baseline gap-0.5">
                                <span className="text-[10px] text-slate-500 font-bold">$</span>
                                <div className="text-lg font-bold text-white tracking-tight tabular-nums leading-none">
                                    {pos.currentPrice > 0 ? (
                                        <span>{pos.currentPrice.toLocaleString()}</span>
                                    ) : (
                                        <Loader2 size={12} className="animate-spin inline text-slate-500" />
                                    )}
                                </div>
                             </div>

                             {/* Daily Change - Optimized: Amount + Percentage Pill with Arrow */}
                             {pos.currentPrice > 0 && (
                                <div className={`flex items-center justify-end gap-1.5 text-xs font-bold tabular-nums tracking-tight ${getColor(pos.dayChangePercent)}`}>
                                    {/* Amount (Sensitive: Masked) */}
                                    <span className="opacity-90">
                                        {renderValue(
                                            <>{pos.dayChangeAmount > 0 ? '+' : ''}{Math.round(pos.dayChangeAmount).toLocaleString()}</>
                                        )}
                                    </span>
                                    {/* Percentage Pill (Public Data: Unmasked) with Arrow and Bg Color matching Text Color Hue */}
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] border flex items-center gap-0.5 ${getBgColor(pos.dayChangePercent)} ${getColor(pos.dayChangePercent)}`}>
                                        {isUp ? <TrendingUp size={10} /> : (isDown ? <TrendingDown size={10} /> : <Minus size={10} />)}
                                        {/* REMOVED sign, using absolute value for percentage */}
                                        <span>{Math.abs(pos.dayChangePercent).toFixed(2)}%</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Stats Block: 2 Columns - Holdings Left, Performance Right (Stacked) */}
                    <div className="bg-slate-900/40 rounded-lg p-3 grid grid-cols-2 gap-4 items-center relative z-10 border border-white/5">
                         {/* Left: Holdings (Prioritizing Shares) */}
                         <div className="flex flex-col gap-0.5">
                             <span className="text-[9px] text-slate-500 font-medium">持有股數</span>
                             <div className="text-sm font-bold text-slate-200 tabular-nums tracking-tight">
                                 {renderValue(<>{pos.shares.toLocaleString()}<span className="text-[10px] font-normal text-slate-500 ml-0.5">股</span></>)}
                             </div>
                             <div className="text-[10px] text-slate-500 tabular-nums tracking-tight opacity-60">
                                 ${renderValue(Math.round(pos.currentValue).toLocaleString())}
                             </div>
                         </div>

                         {/* Right: P/L & ROI (Stacked) */}
                         <div className="flex flex-col items-end gap-0.5 border-l border-slate-700/30 pl-4">
                             <span className="text-[9px] text-slate-500 font-medium">總損益</span>
                             <div className={`text-sm font-bold tabular-nums tracking-tight ${getColor(pos.unrealizedPL)}`}>
                                 {renderValue(
                                     <>{pos.unrealizedPL > 0 ? '+' : ''}{Math.round(pos.unrealizedPL).toLocaleString()}</>
                                 )}
                             </div>
                             <div className={`text-[11px] font-bold tabular-nums tracking-tight opacity-90 ${getColor(pos.unrealizedPL)}`}>
                                 {renderValue(<>{pos.unrealizedPLPercent > 0 ? '+' : ''}{pos.unrealizedPLPercent.toFixed(2)}%</>)}
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
