
import React, { useState, useMemo } from 'react';
import { PortfolioSummary, PortfolioPosition } from '../types';
import { TrendingUp, TrendingDown, Briefcase, ChevronRight, Loader2, Minus, Eye, EyeOff, Share2, X, Copy, Check, Trophy, Camera, Wallet } from 'lucide-react';

interface Props {
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
  onStockClick: (symbol: string) => void;
  isMarketOpen: boolean;
  defaultShowBalance: boolean;
}

const Dashboard: React.FC<Props> = ({ summary, positions, onStockClick, isMarketOpen, defaultShowBalance }) => {
  const [showBalance, setShowBalance] = useState(defaultShowBalance);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMaskAmount, setShareMaskAmount] = useState(false);
  const [copied, setCopied] = useState(false);
  
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

  // Calculate Top 3 Performers (by Amount)
  const topPerformers = useMemo(() => {
    // Sort by dayChangeAmount descending
    return [...positions]
      .sort((a, b) => b.dayChangeAmount - a.dayChangeAmount)
      .slice(0, 3)
      .filter(p => p.dayChangeAmount !== 0); // Optional: Exclude flat stocks
  }, [positions]);

  // Share Text Logic
  const generateShareText = () => {
    const date = new Date().toLocaleDateString();
    const sign = summary.dayPL > 0 ? '+' : '';
    const emoji = summary.dayPL > 0 ? '🔥' : (summary.dayPL < 0 ? '🥗' : '😐');
    
    const yesterdayAssets = summary.totalAssets - summary.dayPL;
    const dayRoi = yesterdayAssets > 0 ? (summary.dayPL / yesterdayAssets) * 100 : 0;
    const dayRoiStr = `${dayRoi > 0 ? '+' : ''}${dayRoi.toFixed(2)}%`;

    let text = `📅 投資日報 ${date}\n` +
               `${emoji} 今日損益: ${sign}${shareMaskAmount ? '****' : Math.round(summary.dayPL).toLocaleString()} (${dayRoiStr})\n` +
               `💰 已實現: ${summary.dayRealizedPL > 0 ? '+' : ''}${shareMaskAmount ? '****' : Math.round(summary.dayRealizedPL).toLocaleString()}\n`;

    if (topPerformers.length > 0) {
        text += `\n🏆 今日焦點:\n`;
        topPerformers.forEach(p => {
            const pSign = p.dayChangeAmount > 0 ? '+' : '';
            const pVal = shareMaskAmount ? '****' : `${pSign}${Math.round(p.dayChangeAmount).toLocaleString()}`;
            text += `${p.name}: ${pVal} (${p.dayChangePercent > 0 ? '+' : ''}${p.dayChangePercent.toFixed(2)}%)\n`;
        });
    }

    text += `\n🚀 投資管家`;
    return text;
  };

  const handleCopyText = async () => {
    const text = generateShareText();
    try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    } catch (err) {
        console.error('Copy failed', err);
    }
  };

  return (
    <div className="p-3 pb-24 space-y-4 animate-fade-in relative">
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
            <div className="bg-black/20 p-2 rounded-xl border border-white/5 flex items-center justify-between relative">
                <div className="flex flex-col pl-1 flex-1">
                     <div className="text-[9px] text-slate-500 font-light">今日帳面</div>
                     <div className={`text-sm font-bold ${getColor(summary.dayPL)} tabular-nums tracking-tight`}>
                        {renderValue(
                            <>{summary.dayPL > 0 ? '+' : ''}{Math.round(summary.dayPL).toLocaleString()}</>
                        )}
                     </div>
                </div>
                {/* Separator Line */}
                <div className="h-6 w-px bg-slate-700/20 mx-2"></div>
                <div className="flex flex-col text-right pr-1 flex-1">
                     <div className="text-[9px] text-slate-500 font-light">今日已實現</div>
                     <div className={`text-sm font-bold ${getColor(summary.dayRealizedPL)} tabular-nums tracking-tight`}>
                        {renderValue(
                            <>{summary.dayRealizedPL > 0 ? '+' : ''}{Math.round(summary.dayRealizedPL).toLocaleString()}</>
                        )}
                     </div>
                </div>
            </div>

            {/* Row 3: T+2 Settlement (New Feature) */}
            <div className={`bg-black/20 p-2 rounded-xl border border-white/5 flex items-center justify-between px-3 ${summary.daySettlementAmount > 0 ? 'bg-orange-500/5 border-orange-500/10' : (summary.daySettlementAmount < 0 ? 'bg-emerald-500/5 border-emerald-500/10' : '')}`}>
                <div className="flex items-center gap-1.5">
                    <Wallet size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">今日交割試算 (T+2)</span>
                </div>
                <div className="flex items-center gap-2">
                    {summary.daySettlementAmount !== 0 ? (
                        <>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${summary.daySettlementAmount > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {summary.daySettlementAmount > 0 ? '需補款' : '預計入帳'}
                            </span>
                            <span className={`text-sm font-bold tabular-nums tracking-tight ${summary.daySettlementAmount > 0 ? 'text-orange-300' : 'text-emerald-300'}`}>
                                {renderValue(Math.abs(Math.round(summary.daySettlementAmount)).toLocaleString())}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs font-bold text-slate-500">無</span>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Button Area - COMPACT VERSION */}
      <div className="flex items-center justify-center">
        <button
            onClick={() => setShowShareModal(true)}
            className="w-full bg-slate-800/80 hover:bg-slate-700/80 active:scale-[0.98] transition-all border border-slate-700/50 py-2.5 rounded-xl flex items-center justify-center gap-2 group shadow-sm"
        >
            <div className="p-1 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                <Share2 size={14} className="text-blue-400" />
            </div>
            <span className="text-xs font-bold text-slate-300 group-hover:text-white">分享戰報圖卡</span>
        </button>
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

                             {/* Daily Change */}
                             {pos.currentPrice > 0 && (
                                <div className={`flex items-center justify-end gap-1.5 text-xs font-bold tabular-nums tracking-tight ${getColor(pos.dayChangePercent)}`}>
                                    <span className="opacity-90">
                                        {renderValue(
                                            <>{pos.dayChangeAmount > 0 ? '+' : ''}{Math.round(pos.dayChangeAmount).toLocaleString()}</>
                                        )}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] border flex items-center gap-0.5 ${getBgColor(pos.dayChangePercent)} ${getColor(pos.dayChangePercent)}`}>
                                        {isUp ? <TrendingUp size={10} /> : (isDown ? <TrendingDown size={10} /> : <Minus size={10} />)}
                                        <span>{Math.abs(pos.dayChangePercent).toFixed(2)}%</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Stats Block */}
                    <div className="bg-slate-900/40 rounded-lg p-3 grid grid-cols-2 gap-4 items-center relative z-10 border border-white/5">
                         {/* Left: Holdings */}
                         <div className="flex flex-col gap-0.5">
                             <span className="text-[9px] text-slate-500 font-medium">持有股數</span>
                             <div className="text-sm font-bold text-slate-200 tabular-nums tracking-tight">
                                 {renderValue(<>{pos.shares.toLocaleString()}<span className="text-[10px] font-normal text-slate-500 ml-0.5">股</span></>)}
                             </div>
                             <div className="text-[10px] text-slate-500 tabular-nums tracking-tight opacity-60">
                                 ${renderValue(Math.round(pos.currentValue).toLocaleString())}
                             </div>
                         </div>

                         {/* Right: P/L */}
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

      {/* --- SHARE MODAL (Restored to Larger Size) --- */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setShowShareModal(false)}>
            <div className="w-full max-w-sm flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                
                {/* The Vertical Card - Center Stage - RESTORED HEIGHT to 75vh */}
                <div className={`w-full aspect-[9/16] max-h-[75vh] rounded-3xl overflow-hidden shadow-2xl relative flex flex-col border border-white/10 ${summary.dayPL >= 0 ? 'bg-gradient-to-b from-red-900 via-slate-900 to-slate-950' : 'bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950'}`}>
                    
                    {/* Card Content - Centered */}
                    <div className="flex-1 flex flex-col items-center justify-center p-5 text-center space-y-5">
                        
                        {/* Header */}
                        <div className="flex flex-col items-center gap-2">
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 ${summary.dayPL >= 0 ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                                {summary.dayPL >= 0 ? <TrendingUp size={28} className="text-white" /> : <TrendingDown size={28} className="text-white" />}
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-slate-200 text-xs font-bold uppercase tracking-[0.3em] mb-1">今日戰報</h3>
                                <div className="text-white/60 font-mono text-xs">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* Main Number - RESTORED FONT SIZE */}
                        <div className="space-y-1">
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">今日損益</div>
                             <div className={`text-4xl font-black tabular-nums tracking-tight drop-shadow-md ${summary.dayPL >= 0 ? 'text-red-100' : 'text-emerald-100'}`}>
                                {shareMaskAmount ? '****' : (
                                    <>{summary.dayPL > 0 ? '+' : ''}{Math.round(summary.dayPL).toLocaleString()}</>
                                )}
                             </div>
                        </div>

                        {/* Secondary Stats Row */}
                        <div className="grid grid-cols-2 gap-3 w-full max-w-[220px]">
                            {/* ROI */}
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5 flex flex-col items-center gap-0.5">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">日報酬率</span>
                                <span className={`text-base font-bold tabular-nums ${summary.dayPL >= 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                                     {(() => {
                                        const prevAssets = summary.totalAssets - summary.dayPL;
                                        const roi = prevAssets > 0 ? (summary.dayPL / prevAssets) * 100 : 0;
                                        return <>{summary.dayPL >= 0 ? '+' : ''}{roi.toFixed(2)}%</>;
                                     })()}
                                </span>
                            </div>
                            {/* Realized */}
                            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/5 flex flex-col items-center gap-0.5">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">今日已實現</span>
                                <span className={`text-base font-bold tabular-nums ${summary.dayRealizedPL >= 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                                    {shareMaskAmount ? '****' : (
                                        <>{summary.dayRealizedPL > 0 ? '+' : ''}{Math.round(summary.dayRealizedPL).toLocaleString()}</>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="w-full max-w-[240px] bg-black/20 rounded-2xl p-4 border border-white/5">
                             <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
                                <Trophy size={12} className="text-yellow-500" /> 今日焦點
                             </h4>
                             <div className="space-y-2">
                                 {topPerformers.length > 0 ? topPerformers.slice(0, 3).map(p => (
                                     <div key={p.symbol} className="flex items-center justify-between border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                                         <span className="text-xs font-bold text-slate-200">{p.name}</span>
                                         <div className="flex items-center gap-2">
                                             <span className={`text-xs font-bold tabular-nums ${getColor(p.dayChangeAmount)}`}>
                                                 {shareMaskAmount ? '****' : Math.round(p.dayChangeAmount).toLocaleString()}
                                             </span>
                                             <span className={`text-[10px] font-medium opacity-80 tabular-nums w-12 text-right ${getColor(p.dayChangePercent)}`}>
                                                 {p.dayChangePercent > 0 ? '+' : ''}{p.dayChangePercent.toFixed(1)}%
                                             </span>
                                         </div>
                                     </div>
                                 )) : <div className="text-[10px] text-slate-500 italic">無顯著變動</div>}
                             </div>
                        </div>
                    </div>

                    {/* Footer Branding */}
                    <div className="p-4 flex items-center justify-center gap-2 opacity-40">
                        <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center text-[8px] font-bold text-white">M</div>
                        <span className="text-[9px] font-bold text-white uppercase tracking-[0.2em]">投資管家 APP</span>
                    </div>
                </div>

                {/* Controls & Hint */}
                <div className="w-full flex flex-col gap-3 animate-slide-up">
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm mx-auto border border-white/5">
                        <Camera size={14} />
                        <span>請直接截圖此畫面分享</span>
                    </div>

                    <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                             <button 
                                onClick={() => setShareMaskAmount(!shareMaskAmount)}
                                className={`p-2 rounded-xl transition-all ${shareMaskAmount ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                             >
                                {shareMaskAmount ? <EyeOff size={18} /> : <Eye size={18} />}
                             </button>
                             <span className="text-xs text-slate-300 font-medium">{shareMaskAmount ? '金額已隱藏' : '顯示金額'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button onClick={handleCopyText} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                複製文字
                            </button>
                            <button onClick={() => setShowShareModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
