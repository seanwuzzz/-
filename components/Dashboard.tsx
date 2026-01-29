
import React, { useState, useMemo, useRef } from 'react';
import { PortfolioSummary, PortfolioPosition } from '../types';
import { TrendingUp, TrendingDown, Briefcase, Hash, ChevronRight, AlertTriangle, Loader2, Minus, Eye, EyeOff, Share2, X, Copy, Check, Smartphone, Trophy, Image as ImageIcon, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

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
  const [generatingImg, setGeneratingImg] = useState(false);
  
  // 専用於截圖的 Ref (指向隱藏的 DOM 元素)
  const shareCaptureRef = useRef<HTMLDivElement>(null);

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

  const handleNativeShare = async () => {
    const text = generateShareText();
    if (navigator.share) {
        try {
            await navigator.share({
                title: '我的投資日報',
                text: text,
            });
        } catch (err) {
            console.log('Share canceled');
        }
    } else {
        handleCopyText();
    }
  };

  // Share Image Logic - 使用隱藏的專用 DOM 進行截圖
  const handleShareImage = async () => {
      if (!shareCaptureRef.current) return;
      setGeneratingImg(true);

      try {
          // 直接截取已經 render 在螢幕外且排版完美的元素
          const canvas = await html2canvas(shareCaptureRef.current, {
              backgroundColor: '#0f172a', // 強制深色背景
              scale: 2, // 高解析度
              useCORS: true,
              logging: false,
          });

          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error("Image generation failed");

          const file = new File([blob], `invest-daily-${new Date().getTime()}.png`, { type: 'image/png' });

          // 分享或下載
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                  files: [file],
                  title: '我的投資日報',
                  text: '今日投資績效總覽'
              });
          } else {
              const link = document.createElement('a');
              link.download = `投資日報_${new Date().toLocaleDateString()}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
          }
      } catch (err) {
          console.error("Image share failed:", err);
          alert("圖片生成失敗，請稍後再試。");
      } finally {
          setGeneratingImg(false);
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
          </div>
        </div>
      </div>

      {/* Share Button Area - Dedicated Section */}
      <div className="flex items-center justify-center">
        <button
            onClick={() => setShowShareModal(true)}
            className="w-full bg-slate-800/80 hover:bg-slate-700/80 active:scale-[0.98] transition-all border border-slate-700/50 p-3 rounded-xl flex items-center justify-center gap-2 group shadow-sm"
        >
            <div className="p-1.5 bg-blue-500/10 rounded-full group-hover:bg-blue-500/20 transition-colors">
                <Share2 size={16} className="text-blue-400" />
            </div>
            <span className="text-sm font-bold text-slate-300 group-hover:text-white">分享今日戰報</span>
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

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowShareModal(false)}>
            <div className="bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header with Close */}
                <div className="p-4 flex justify-between items-center border-b border-slate-800">
                    <h3 className="text-white font-bold flex items-center gap-2"><Share2 size={16} /> 分享戰報</h3>
                    <button onClick={() => setShowShareModal(false)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full transition-colors">
                        <X size={16} />
                    </button>
                </div>
                
                {/* Scrollable Content Area - Optimized Layout */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-slate-900">
                    
                    {/* --- PREVIEW AREA START (Horizontal Card - Square Frame, Rounded Inner) --- */}
                    <div className={`relative w-full overflow-hidden flex flex-row border border-white/10 shadow-2xl rounded-none ${summary.dayPL >= 0 ? 'bg-gradient-to-br from-red-900/40 via-slate-900 to-slate-900' : 'bg-gradient-to-br from-green-900/40 via-slate-900 to-slate-900'}`}>
                        
                        {/* Left Column: Hero Stats */}
                        <div className="w-5/12 p-3 flex flex-col justify-center items-center border-r border-white/5 bg-black/10">
                            <div className={`w-10 h-10 mb-2 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 ${summary.dayPL >= 0 ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
                                {summary.dayPL >= 0 ? <TrendingUp size={20} className="text-white" /> : <TrendingDown size={20} className="text-white" />}
                            </div>
                            <h3 className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">今日戰報</h3>
                            <div className="text-white font-mono text-[9px] opacity-50 mb-3">{new Date().toLocaleDateString()}</div>
                            
                            <div className={`text-xl font-black tabular-nums tracking-tight ${summary.dayPL >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {shareMaskAmount ? '****' : (
                                    <>{Math.abs(Math.round(summary.dayPL)).toLocaleString()}</>
                                )}
                            </div>
                            {/* ROI Pill */}
                             {(() => {
                                const prevAssets = summary.totalAssets - summary.dayPL;
                                const roi = prevAssets > 0 ? (summary.dayPL / prevAssets) * 100 : 0;
                                return (
                                    <div className={`text-[9px] font-bold mt-1 px-2 py-0.5 rounded-full border bg-opacity-10 ${summary.dayPL >= 0 ? 'bg-red-500 border-red-500/30 text-red-400' : 'bg-emerald-500 border-emerald-500/30 text-emerald-400'}`}>
                                        {summary.dayPL >= 0 ? '+' : ''}{roi.toFixed(2)}%
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Right Column: Details */}
                        <div className="w-7/12 p-3 flex flex-col justify-between">
                            {/* Realized */}
                            <div className="bg-slate-800/60 rounded-xl p-2 border border-white/5 flex justify-between items-center mb-2">
                                <span className="text-[9px] text-slate-400 font-medium">今日已實現</span>
                                <span className={`text-[10px] font-bold tabular-nums ${summary.dayRealizedPL >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {shareMaskAmount ? '****' : (
                                        <>
                                            {summary.dayRealizedPL > 0 ? '+' : ''}{Math.round(summary.dayRealizedPL).toLocaleString()}
                                        </>
                                    )}
                                </span>
                            </div>

                            {/* Top List */}
                            <div className="flex-1 min-h-0 mb-2">
                                <h4 className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Trophy size={9} className="text-yellow-500" /> 今日焦點
                                </h4>
                                <div className="space-y-1">
                                    {topPerformers.length > 0 ? topPerformers.slice(0, 3).map(p => (
                                        <div key={p.symbol} className="flex items-center justify-between p-1.5 bg-slate-800/40 rounded-lg border border-white/5">
                                            <span className="text-[9px] font-bold text-slate-300 truncate w-14">{p.name}</span>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-[9px] font-bold tabular-nums ${getColor(p.dayChangeAmount)}`}>
                                                    {shareMaskAmount ? '****' : Math.round(p.dayChangeAmount).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    )) : <div className="text-[9px] text-slate-600 text-center py-2">無顯著變動</div>}
                                </div>
                            </div>

                             {/* Footer */}
                            <div className="flex items-center justify-end gap-1 opacity-50">
                                <div className="w-3 h-3 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                                    <span className="text-[6px] font-bold text-white">M</span>
                                </div>
                                <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                                    投資管家
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* --- PREVIEW AREA END --- */}

                </div>

                {/* Actions Area */}
                <div className="bg-slate-800 p-4 border-t border-slate-700 space-y-3 shrink-0">
                    {/* Privacy Toggle */}
                    <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-xs text-slate-400">隱藏金額 (僅顯示百分比)</span>
                        <button 
                            onClick={() => setShareMaskAmount(!shareMaskAmount)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${shareMaskAmount ? 'bg-blue-500' : 'bg-slate-600'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${shareMaskAmount ? 'translate-x-5' : ''}`}></div>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleShareImage}
                            disabled={generatingImg}
                            className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            {generatingImg ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                            {generatingImg ? '生成中...' : '分享 / 下載圖片'}
                        </button>
                        
                        <button 
                            onClick={handleCopyText}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95"
                        >
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                            {copied ? '已複製' : '複製文字'}
                        </button>
                        <button 
                            onClick={handleNativeShare}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95"
                        >
                            <Share2 size={16} />
                            更多選項
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* 
        HIDDEN CAPTURE AREA (Landscape / Horizontal - Square Frame, Rounded Inner)
        固定寬度 600px，高度自動，採用左右分割佈局。
        樣式更新：
        1. 外層: rounded-none (方框)
        2. 內層: rounded-2xl, rounded-xl, rounded-lg, rounded-full (圓角)
      */}
      <div 
        ref={shareCaptureRef}
        style={{ 
            position: 'fixed', 
            top: 0, 
            left: '-9999px',
            width: '600px', // Horizontal Card Width
            zIndex: -50,
            visibility: 'visible',
            fontFamily: 'system-ui, sans-serif'
        }}
        className="bg-slate-900 text-white"
      >
        <div className={`w-full p-6 flex flex-row rounded-none ${summary.dayPL >= 0 ? 'bg-gradient-to-br from-red-900/40 via-slate-900 to-slate-900' : 'bg-gradient-to-br from-green-900/40 via-slate-900 to-slate-900'}`}>
            
            {/* Left Column: Hero Stats */}
            <div className="w-5/12 pr-6 border-r border-white/10 flex flex-col justify-center items-center">
                <div className={`w-16 h-16 mb-4 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 ${summary.dayPL >= 0 ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
                    {summary.dayPL >= 0 ? <TrendingUp size={36} className="text-white" /> : <TrendingDown size={36} className="text-white" />}
                </div>

                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-1">今日戰報</h3>
                <div className="text-white font-mono text-sm opacity-60 mb-4">{new Date().toLocaleDateString()}</div>
                
                <div className={`text-3xl font-black tabular-nums tracking-tight mb-2 ${summary.dayPL >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {shareMaskAmount ? '****' : (
                        <>{summary.dayPL > 0 ? '+' : ''}{Math.round(summary.dayPL).toLocaleString()}</>
                    )}
                </div>
                {/* ROI Pill */}
                {(() => {
                    const prevAssets = summary.totalAssets - summary.dayPL;
                    const roi = prevAssets > 0 ? (summary.dayPL / prevAssets) * 100 : 0;
                    return (
                        <div className={`text-sm font-bold px-3 py-1 rounded-full border bg-opacity-10 ${summary.dayPL >= 0 ? 'bg-red-500 border-red-500/30 text-red-400' : 'bg-emerald-500 border-emerald-500/30 text-emerald-400'}`}>
                            {summary.dayPL >= 0 ? '+' : ''}{roi.toFixed(2)}%
                        </div>
                    );
                })()}
            </div>

            {/* Right Column: Details */}
            <div className="w-7/12 pl-6 flex flex-col justify-center">
                {/* Realized */}
                <div className="bg-slate-800/80 rounded-xl p-3 border border-white/10 flex justify-between items-center mb-6 shadow-sm">
                    <span className="text-sm text-slate-400 font-medium">今日已實現</span>
                    <span className={`text-lg font-bold tabular-nums ${summary.dayRealizedPL >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {shareMaskAmount ? '****' : (
                            <>
                                {summary.dayRealizedPL > 0 ? '+' : ''}{Math.round(summary.dayRealizedPL).toLocaleString()}
                            </>
                        )}
                    </span>
                </div>

                {/* Top List */}
                <div className="flex-1">
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Trophy size={12} className="text-yellow-500" /> 今日焦點
                    </h4>
                    <div className="space-y-2">
                        {topPerformers.length > 0 ? topPerformers.slice(0, 3).map(p => (
                            <div key={p.symbol} className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-200">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold tabular-nums ${getColor(p.dayChangeAmount)}`}>
                                        {shareMaskAmount ? '****' : (
                                            <>{p.dayChangeAmount > 0 ? '+' : ''}{Math.round(p.dayChangeAmount).toLocaleString()}</>
                                        )}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${getBgColor(p.dayChangePercent)}`}>
                                        {p.dayChangePercent > 0 ? '+' : ''}{p.dayChangePercent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        )) : <div className="text-xs text-slate-600 text-center py-2">無顯著變動</div>}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 mt-6 opacity-60">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">M</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        投資管家 App
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
