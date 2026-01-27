
import React from 'react';
import { PortfolioSummary, PortfolioPosition } from '../types';
import { TrendingUp, TrendingDown, Briefcase, Hash, ChevronRight } from 'lucide-react';

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
    <div className="p-4 pb-24 space-y-6 animate-fade-in">
      {/* Total Asset Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-1">
              <h2 className="text-slate-400 text-xs font-medium flex items-center gap-2 uppercase tracking-wider">
                 總資產市值
              </h2>
              
              {/* Market Status Indicator */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border backdrop-blur-sm transition-colors ${
                  isMarketOpen 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-700/30 border-slate-600/30 text-slate-500'
              }`}>
                  <div className="relative flex h-2 w-2">
                    {isMarketOpen && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isMarketOpen ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                  </div>
                  <span className="text-[10px] font-bold">
                      {isMarketOpen ? '盤中交易' : '已收盤'}
                  </span>
              </div>
          </div>
          
          <div className="text-4xl font-bold text-white tracking-tight mb-6">
            ${Math.round(summary.totalAssets).toLocaleString()}
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="text-[10px] text-slate-500 mb-1">未實現損益 <span className="text-[8px] opacity-60">(含費用)</span></div>
                    <div className={`text-lg font-bold ${getColor(summary.totalPL)} flex flex-col leading-tight`}>
                        <span>{summary.totalPL > 0 ? '+' : ''}{Math.round(summary.totalPL).toLocaleString()}</span>
                        <span className="text-[11px] mt-1 opacity-80 font-medium tracking-wide">
                            ({summary.totalPLPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="text-[10px] text-slate-500 mb-1">今日變動</div>
                    <div className={`text-lg font-bold ${getColor(summary.dayPL)} flex flex-col leading-tight`}>
                        <span>{summary.dayPL > 0 ? '+' : ''}{Math.round(summary.dayPL).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">已實現損益 <span className="text-[8px] opacity-60">已含交易成本</span></div>
                <div className={`text-sm font-bold ${getColor(summary.totalRealizedPL)}`}>
                    {summary.totalRealizedPL > 0 ? '+' : ''}{Math.round(summary.totalRealizedPL).toLocaleString()}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings List */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-400"/> 持股明細
        </h3>
        
        {positions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-cardBg rounded-2xl border border-slate-800">
                尚未有持股資料
            </div>
        ) : (
            <div className="space-y-3">
            {positions.map((pos) => (
                <div 
                    key={pos.symbol} 
                    onClick={() => onStockClick(pos.symbol)}
                    className="bg-cardBg p-4 rounded-2xl border border-slate-700/50 shadow-sm hover:border-blue-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group active:scale-[0.98]"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{pos.symbol}</span>
                                <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-800 rounded">{pos.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1 text-[9px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                    <Hash size={10} /> {pos.sector}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {pos.shares.toLocaleString()} 股 • 均費成本 {pos.avgCost.toFixed(1)}
                                </span>
                            </div>
                        </div>
                        <div className="text-right flex items-start gap-2">
                            <div>
                                <div className="text-lg font-bold text-white">${pos.currentPrice}</div>
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 ${getBgColor(pos.dayChangePercent)} ${getColor(pos.dayChangePercent)}`}>
                                    {pos.dayChangePercent > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    {Math.abs(pos.dayChangePercent)}%
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-500 mt-1 transition-colors" />
                        </div>
                    </div>
                    
                    <div className="h-px bg-slate-700/50 my-3"></div>
                    
                    <div className="flex justify-between items-end">
                         <div className="text-[10px] text-slate-500">
                            總市值 ${Math.round(pos.currentValue).toLocaleString()}
                         </div>
                         <div className="text-right">
                            <div className={`text-sm font-bold ${getColor(pos.unrealizedPL)}`}>
                                {pos.unrealizedPL > 0 ? '+' : ''}{Math.round(pos.unrealizedPL).toLocaleString()}
                            </div>
                            <div className={`text-[10px] font-medium ${getColor(pos.unrealizedPL)} opacity-80`}>
                                {pos.unrealizedPLPercent.toFixed(2)}%
                            </div>
                         </div>
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
