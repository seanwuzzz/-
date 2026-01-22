import React from 'react';
import { PortfolioSummary, PortfolioPosition } from '../types';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

interface Props {
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
}

const Dashboard: React.FC<Props> = ({ summary, positions }) => {
  
  // Helper for conditional coloring (TW: Red Up, Green Down)
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
          <h2 className="text-slate-400 text-sm font-medium mb-1 flex items-center gap-2">
            <DollarSign size={14} /> 總資產市值
          </h2>
          <div className="text-4xl font-bold text-white tracking-tight mb-4">
            ${summary.totalAssets.toLocaleString()}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 p-3 rounded-xl">
               <div className="text-xs text-slate-400 mb-1">總損益</div>
               <div className={`text-lg font-bold ${getColor(summary.totalPL)}`}>
                 {summary.totalPL > 0 ? '+' : ''}{summary.totalPL.toLocaleString()}
                 <span className="text-xs ml-1 opacity-80">({summary.totalPLPercent.toFixed(2)}%)</span>
               </div>
            </div>
            <div className="bg-black/20 p-3 rounded-xl">
               <div className="text-xs text-slate-400 mb-1">今日變動</div>
               <div className={`text-lg font-bold ${getColor(summary.dayPL)}`}>
                 {summary.dayPL > 0 ? '+' : ''}{summary.dayPL.toLocaleString()}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings List */}
      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <PieChart size={18} className="text-blue-400"/> 持股明細
        </h3>
        
        {positions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-cardBg rounded-2xl border border-slate-800">
                尚未有持股資料
            </div>
        ) : (
            <div className="space-y-3">
            {positions.map((pos) => (
                <div key={pos.symbol} className="bg-cardBg p-4 rounded-2xl border border-slate-700/50 shadow-sm hover:border-slate-600 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-white">{pos.symbol}</span>
                                <span className="text-sm text-slate-400 font-medium">{pos.name}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {pos.shares} 股 • 均價 {pos.avgCost.toFixed(1)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-white">${pos.currentPrice}</div>
                            <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 ${getBgColor(pos.dayChangePercent)} ${getColor(pos.dayChangePercent)}`}>
                                {pos.dayChangePercent > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {Math.abs(pos.dayChangePercent)}%
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-px bg-slate-700/50 my-3"></div>
                    
                    <div className="flex justify-between items-end">
                         <div className="text-xs text-slate-500">
                            市值 ${pos.currentValue.toLocaleString()}
                         </div>
                         <div className={`text-sm font-bold ${getColor(pos.unrealizedPL)}`}>
                            {pos.unrealizedPL > 0 ? '+' : ''}{pos.unrealizedPL.toLocaleString()} ({pos.unrealizedPLPercent.toFixed(2)}%)
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