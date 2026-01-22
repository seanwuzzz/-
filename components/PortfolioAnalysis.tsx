import React from 'react';
import { PortfolioPosition, PortfolioSummary } from '../types';
import { PieChart, BarChart3, Info, LayoutGrid } from 'lucide-react';

interface Props {
  positions: PortfolioPosition[];
  summary: PortfolioSummary;
}

const PortfolioAnalysis: React.FC<Props> = ({ positions, summary }) => {
  if (positions.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500">
        尚未有足夠資料進行分析。
      </div>
    );
  }

  // Calculate Asset Weights
  const sortedByWeight = [...positions].sort((a, b) => b.currentValue - a.currentValue);
  
  // Calculate Sector Weights
  const sectorMap = new Map<string, number>();
  positions.forEach(pos => {
    const currentVal = sectorMap.get(pos.sector) || 0;
    sectorMap.set(pos.sector, currentVal + pos.currentValue);
  });
  const sectorList = Array.from(sectorMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Calculate Profit/Loss leaders
  const sortedByPL = [...positions].sort((a, b) => b.unrealizedPL - a.unrealizedPL);

  const getColor = (val: number) => val >= 0 ? 'text-twRed' : 'text-twGreen';
  const getBgColor = (val: number) => val >= 0 ? 'bg-twRed' : 'bg-twGreen';

  return (
    <div className="p-4 pb-24 space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">投資組合分析</h2>

      {/* Sector Distribution */}
      <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <LayoutGrid size={18} className="text-emerald-400" /> 產業分佈 (按市值)
        </h3>
        <div className="space-y-5">
            {sectorList.map(sector => {
                const weight = (sector.value / summary.totalAssets) * 100;
                return (
                    <div key={sector.name} className="space-y-1">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-medium text-slate-200">{sector.name}</span>
                            <span className="text-sm font-bold text-white">{weight.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${weight}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
      </section>

      {/* Asset Distribution */}
      <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-blue-400" /> 個股佔比
        </h3>
        <div className="space-y-5">
            {sortedByWeight.map(pos => {
                const weight = (pos.currentValue / summary.totalAssets) * 100;
                return (
                    <div key={pos.symbol} className="space-y-1">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-200">{pos.name}</span>
                                <span className="text-[10px] text-slate-500">{pos.symbol} • {pos.sector}</span>
                            </div>
                            <span className="text-sm font-bold text-white">{weight.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 rounded-full" 
                                style={{ width: `${weight}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
      </section>

      {/* Performance Distribution */}
      <section className="bg-cardBg p-5 rounded-2xl border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-400" /> 未實現損益貢獻
        </h3>
        <div className="space-y-4">
            {sortedByPL.map(pos => {
                const maxAbsPL = Math.max(...positions.map(p => Math.abs(p.unrealizedPL)));
                const barWidth = maxAbsPL > 0 ? (Math.abs(pos.unrealizedPL) / maxAbsPL) * 100 : 0;
                
                return (
                    <div key={pos.symbol} className="flex items-center gap-3">
                        <div className="w-20 text-xs text-slate-400 truncate">{pos.name}</div>
                        <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden flex justify-center">
                                <div 
                                    className={`h-full ${getBgColor(pos.unrealizedPL)} rounded-full`}
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                            <div className={`w-20 text-right text-xs font-bold ${getColor(pos.unrealizedPL)}`}>
                                {pos.unrealizedPL > 0 ? '+' : ''}{pos.unrealizedPL.toLocaleString()}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </section>

      {/* Diversification Summary */}
      <section className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 flex gap-3">
        <Info className="text-blue-400 shrink-0" size={20} />
        <div className="text-xs text-slate-400 leading-relaxed">
            目前持股橫跨 <span className="text-white font-bold">{sectorList.length}</span> 個產業。
            資產最集中的產業是 <span className="text-white font-bold">{sectorList[0].name}</span>，
            佔比約 <span className="text-white font-bold">{((sectorList[0].value / summary.totalAssets) * 100).toFixed(1)}%</span>。
        </div>
      </section>
    </div>
  );
};

export default PortfolioAnalysis;