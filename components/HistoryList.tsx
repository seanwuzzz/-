
import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedTransaction, StockNews, ClosedTrade, Transaction, StockPrice } from '../types';
import { 
  History as HistoryIcon, 
  Trash2, 
  X, 
  Check, 
  FilterX, 
  CalendarDays,
  CircleDollarSign,
  Newspaper,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  Pencil,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Coins
} from 'lucide-react';

interface Props {
  transactions: ProcessedTransaction[];
  closedTrades: ClosedTrade[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (tx: Transaction) => void;
  filterSymbol?: string | null;
  onClearFilter?: () => void;
  news?: StockNews[];
  newsLoading?: boolean;
  prices?: StockPrice[];
}

type SortField = 'date' | 'amount';
type SortOrder = 'desc' | 'asc';
type ViewMode = 'TRANSACTIONS' | 'REALIZED';
type FilterType = 'ALL' | 'BUY' | 'SELL';

const HistoryList: React.FC<Props> = ({ 
  transactions, 
  closedTrades = [],
  onDelete, 
  onEdit,
  filterSymbol, 
  onClearFilter,
  news = [],
  newsLoading = false,
  prices = []
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isNewsExpanded, setIsNewsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('TRANSACTIONS');

  const [showFilters, setShowFilters] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Standard Colors (twRed/twGreen)
  const getColor = (val: number) => (val >= 0 ? 'text-twRed' : 'text-twGreen');
  const getBgColor = (val: number) => (val >= 0 ? 'bg-twRed/10 border-twRed/20 text-twRed' : 'bg-twGreen/10 border-twGreen/20 text-twGreen');
  const formatCurrency = (val: number) => Math.round(val).toLocaleString();

  useEffect(() => {
    const handleClickOutside = () => setConfirmingId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (filterSymbol) {
        setKeyword(filterSymbol);
        setIsNewsExpanded(false);
    } 
  }, [filterSymbol]);

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmingId === id) {
      setIsDeleting(true);
      try {
        await onDelete(id);
        setConfirmingId(null);
      } catch (err) {
        console.error('HistoryList Delete Error', err);
      } finally {
        setIsDeleting(false);
      }
    } else {
      setConfirmingId(id);
    }
  };

  const handleEditClick = (e: React.MouseEvent, tx: ProcessedTransaction) => {
    e.stopPropagation();
    const { totalAmount, realizedPL, ...rawTx } = tx;
    onEdit(rawTx);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
        setSortField(field);
        setSortOrder('desc');
    }
  };

  const handleClearAllFilters = () => {
      setKeyword('');
      setFilterType('ALL');
      setStartDate('');
      setEndDate('');
      if (onClearFilter) onClearFilter();
  };

  const hasActiveFilters = keyword || filterType !== 'ALL' || startDate || endDate;

  const sortedTransactions = useMemo(() => {
    let result = [...transactions];
    if (keyword) {
        const lowerKw = keyword.toLowerCase();
        result = result.filter(t => 
            t.symbol.toLowerCase().includes(lowerKw) || 
            t.name.toLowerCase().includes(lowerKw)
        );
    }
    if (filterType !== 'ALL') {
        result = result.filter(t => t.type === filterType);
    }
    if (startDate) result = result.filter(t => t.date >= startDate);
    if (endDate) result = result.filter(t => t.date <= endDate);

    return result.sort((a, b) => {
        let comparison = 0;
        if (sortField === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'amount') {
            comparison = a.totalAmount - b.totalAmount;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [transactions, keyword, filterType, startDate, endDate, sortField, sortOrder]);

  const filteredClosedTrades = useMemo(() => {
      let result = [...closedTrades];
      if (keyword) {
          const lowerKw = keyword.toLowerCase();
          result = result.filter(t => 
              t.symbol.toLowerCase().includes(lowerKw) || 
              t.name.toLowerCase().includes(lowerKw)
          );
      }
      if (startDate) result = result.filter(t => t.sellDate >= startDate);
      if (endDate) result = result.filter(t => t.sellDate <= endDate);

      return result.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());
  }, [closedTrades, keyword, startDate, endDate]);

  const inputClass = "w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <div className="p-3 pb-24 space-y-4 animate-fade-in">
      <div className="space-y-3">
        {/* Toggle Switch */}
        <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700/50 flex relative backdrop-blur-sm">
            <button
                onClick={() => setViewMode('TRANSACTIONS')}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all z-10 duration-300 ${viewMode === 'TRANSACTIONS' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
                交易流水帳
            </button>
            <button
                onClick={() => setViewMode('REALIZED')}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all z-10 duration-300 ${viewMode === 'REALIZED' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
                已實現損益
            </button>
            <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-700 border border-slate-600/50 rounded-lg shadow-lg transition-all duration-300 ease-out ${viewMode === 'TRANSACTIONS' ? 'left-1' : 'left-[calc(50%+2px)]'}`}
            ></div>
        </div>

        {/* Filter Panel */}
        <div className={`bg-cardBg rounded-xl border border-slate-700/50 shadow-sm overflow-hidden transition-all duration-300 ${showFilters ? 'ring-1 ring-blue-500/20' : ''}`}>
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full flex items-center justify-between p-3 transition-colors ${showFilters ? 'bg-slate-800/80 border-b border-slate-700/50' : 'hover:bg-slate-800/50'}`}
            >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Filter size={12} className={hasActiveFilters ? "text-blue-400" : "text-slate-500"} />
                    搜尋與篩選
                    {hasActiveFilters && !showFilters && (
                        <span className="flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                        </span>
                    )}
                </div>
                {showFilters ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
            </button>

            {showFilters && (
                <div className="p-3 space-y-2 bg-slate-900/30 animate-slide-down">
                    {/* Keyword */}
                    <div className="relative group">
                        <Search size={12} className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="搜尋代號或名稱 (例如: 2330)" 
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value.toUpperCase())}
                            className={`${inputClass} pl-8 py-1.5`}
                        />
                        {keyword && (
                            <button 
                                onClick={() => setKeyword('')}
                                className="absolute right-3 top-2 text-slate-500 hover:text-white"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Type Filter */}
                    {viewMode === 'TRANSACTIONS' && (
                        <div className="grid grid-cols-3 gap-2">
                            {(['ALL', 'BUY', 'SELL'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                                        filterType === type 
                                            ? (type === 'BUY' ? 'bg-twRed/20 border-twRed/50 text-twRed' : type === 'SELL' ? 'bg-twGreen/20 border-twGreen/50 text-twGreen' : 'bg-slate-600 border-slate-500 text-white')
                                            : 'bg-slate-800/50 border-transparent text-slate-500 hover:bg-slate-800'
                                    }`}
                                >
                                    {type === 'ALL' ? '全部' : type === 'BUY' ? '買進' : '賣出'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[9px] text-slate-500 mb-0.5 block ml-1">起始日期</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputClass} py-1.5`} />
                        </div>
                        <div>
                            <label className="text-[9px] text-slate-500 mb-0.5 block ml-1">結束日期</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${inputClass} py-1.5`} />
                        </div>
                    </div>

                    {/* Clear Button */}
                    <div className="flex justify-end pt-1 border-t border-slate-700/50">
                        <button onClick={handleClearAllFilters} className="text-[9px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors">
                            <FilterX size={10} /> 重設條件
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Sort Bar */}
        {viewMode === 'TRANSACTIONS' && (
            <div className="flex items-center justify-between px-2">
                <div className="flex gap-2">
                    <button onClick={() => handleSort('date')} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold border transition-all ${sortField === 'date' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800/50'}`}>
                        <CalendarDays size={10} /> 日期 {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button onClick={() => handleSort('amount')} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold border transition-all ${sortField === 'amount' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800/50'}`}>
                        <CircleDollarSign size={10} /> 金額 {sortField === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                </div>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/50">{sortedTransactions.length} 筆</span>
            </div>
        )}
      </div>

      {/* --- News Section (Compact) --- */}
      {keyword && viewMode === 'TRANSACTIONS' && (
        <div className="bg-cardBg rounded-xl border border-slate-700/50 mb-2 overflow-hidden shadow-sm">
            <button 
                onClick={() => setIsNewsExpanded(!isNewsExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-amber-500/10 rounded">
                        <Newspaper size={12} className="text-amber-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">"{keyword}" 相關新聞</span>
                </div>
                {isNewsExpanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
            </button>
            {isNewsExpanded && (
                <div className="px-3 pb-3 space-y-1.5 animate-slide-down">
                    {newsLoading ? (
                        <div className="flex items-center justify-center py-4 text-slate-500 gap-2"><Loader2 size={14} className="animate-spin" /><span className="text-[10px]">搜索中...</span></div>
                    ) : news.length > 0 ? (
                        news.slice(0, 3).map((item, idx) => (
                            <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-900/60 p-2.5 rounded-lg border border-white/5 hover:border-blue-500/30 hover:bg-slate-800 transition-all group">
                                <h4 className="text-[11px] font-bold text-slate-200 mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                                <div className="flex justify-between items-center text-[9px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <span className="w-0.5 h-0.5 rounded-full bg-slate-500"></span>
                                        {item.source} • {item.date}
                                    </span>
                                    <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </a>
                        ))
                    ) : <div className="text-center py-2 text-[10px] text-slate-600">無相關新聞</div>}
                </div>
            )}
        </div>
      )}

      {/* --- Transactions List (Highly Compact) --- */}
      {viewMode === 'TRANSACTIONS' && (
        <div className="space-y-2">
            {sortedTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
                    <HistoryIcon size={20} className="opacity-40 mb-2" />
                    <span className="text-[10px] font-bold text-slate-400">尚無交易紀錄</span>
                </div>
            ) : (
                sortedTransactions.map((tx) => {
                    const isBuy = tx.type === 'BUY';
                    const priceData = prices?.find(p => p.symbol === tx.symbol);
                    const currentPrice = priceData ? priceData.price : 0;
                    
                    let liveSnapshot = null;
                    if (isBuy && currentPrice > 0) {
                        const marketValue = tx.shares * currentPrice;
                        const unrealized = marketValue - tx.totalAmount;
                        const roi = tx.totalAmount > 0 ? (unrealized / tx.totalAmount) * 100 : 0;
                        liveSnapshot = { unrealized, roi };
                    }

                    return (
                        <div key={tx.id} className="relative group overflow-hidden bg-cardBg rounded-xl border border-slate-700/50 shadow-sm hover:border-blue-500/50 transition-all duration-300">
                            {/* Actions Overlay */}
                            {confirmingId === tx.id && (
                                <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur-md flex items-center justify-between px-4 animate-fade-in">
                                    <span className="text-xs font-bold text-white">確認刪除?</span>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setConfirmingId(null); }} className="p-2 rounded-full bg-slate-800 text-slate-400 border border-slate-700"><X size={14} /></button>
                                        <button onClick={(e) => handleDeleteClick(e, tx.id)} disabled={isDeleting} className="p-2 rounded-full bg-twRed text-white shadow-lg shadow-twRed/30"><Check size={14} /></button>
                                    </div>
                                </div>
                            )}

                            <div className="p-3 relative z-10">
                                {/* Header: Symbol + Name + Type | Amount */}
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-lg font-bold text-white tabular-nums tracking-tight">{tx.symbol}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isBuy ? 'bg-twRed/10 border-twRed/20 text-twRed' : 'bg-twGreen/10 border-twGreen/20 text-twGreen'}`}>
                                            {isBuy ? '買進' : '賣出'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{tx.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base font-bold text-white tabular-nums tracking-tight">
                                            ${formatCurrency(tx.totalAmount)}
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Row: Date | Shares x Price | P/L */}
                                <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/30 rounded-lg p-2 border border-slate-700/30">
                                    <div className="flex items-center gap-2">
                                        <span className="tabular-nums opacity-80">{tx.date}</span>
                                        <div className="w-px h-3 bg-slate-700"></div>
                                        <span className="tabular-nums font-medium text-slate-300">
                                            {formatCurrency(tx.shares)}股 @ {tx.price}
                                        </span>
                                    </div>
                                    
                                    <div className="tabular-nums font-bold">
                                         {tx.realizedPL !== undefined ? (
                                            <span className={getColor(tx.realizedPL)}>
                                                {tx.realizedPL > 0 ? '+' : ''}{formatCurrency(tx.realizedPL)}
                                            </span>
                                        ) : liveSnapshot ? (
                                            <span className={getColor(liveSnapshot.unrealized)}>
                                                {liveSnapshot.unrealized > 0 ? '+' : ''}{formatCurrency(liveSnapshot.unrealized)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">費: ${tx.fee}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Slim Action Footer */}
                                <div className="mt-2 pt-2 border-t border-dashed border-slate-700/50 flex justify-end gap-3 opacity-80">
                                     <button 
                                        onClick={(e) => handleEditClick(e, tx)} 
                                        className="text-[10px] font-bold text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors hover:bg-slate-800 px-1.5 rounded"
                                     >
                                        <Pencil size={10} /> 編輯
                                     </button>
                                     <button 
                                        onClick={(e) => handleDeleteClick(e, tx.id)} 
                                        className="text-[10px] font-bold text-slate-500 hover:text-twRed flex items-center gap-1 transition-colors hover:bg-slate-800 px-1.5 rounded"
                                     >
                                        <Trash2 size={10} /> 刪除
                                     </button>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      )}

      {/* --- Realized Trades List (Compact Journey) --- */}
      {viewMode === 'REALIZED' && (
        <div className="space-y-3">
            {filteredClosedTrades.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-10 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
                    <Coins size={20} className="opacity-40 mb-2" />
                    <span className="text-[10px] font-bold text-slate-400">尚無已實現損益紀錄</span>
                </div>
            ) : (
                filteredClosedTrades.map((trade, idx) => {
                    const isProfit = trade.realizedPL >= 0;
                    return (
                        <div key={`${trade.id}-${idx}`} className="bg-cardBg rounded-xl border border-slate-700/50 shadow-sm overflow-hidden relative group hover:border-blue-500/50 transition-all duration-300">
                            
                            {/* Decorative Background Glow - Fainter */}
                            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[50px] opacity-10 pointer-events-none ${isProfit ? 'bg-twRed' : 'bg-twGreen'}`}></div>

                            <div className="p-3 relative z-10">
                                {/* Header: Symbol | P/L */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg text-white tabular-nums tracking-tight">{trade.symbol}</span>
                                            <span className="text-[10px] font-medium text-slate-300 bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600/50">{trade.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-0.5 font-light">
                                            <Clock size={8} className="text-blue-400" />
                                            <span>持有 {trade.holdDays} 天</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-bold tabular-nums tracking-tight ${getColor(trade.realizedPL)}`}>
                                            {trade.realizedPL > 0 ? '+' : ''}{formatCurrency(trade.realizedPL)}
                                        </div>
                                        <div className={`text-[9px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md mt-0.5 ${getBgColor(trade.realizedPL)}`}>
                                            {isProfit ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                                            {trade.roi.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>

                                {/* Journey Row - Merged into one line grid */}
                                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/30 p-2 rounded-lg border border-slate-700/30">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 font-light flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-twRed"></div>買</span>
                                        <span className="tabular-nums text-slate-300 font-medium">{trade.buyDate} @ {trade.avgBuyPrice.toFixed(0)}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-l border-slate-700/50 pl-2">
                                        <span className="text-slate-500 font-light flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-twGreen"></div>賣</span>
                                        <span className="tabular-nums text-slate-300 font-medium">{trade.sellDate} @ {trade.sellPrice.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      )}
    </div>
  );
};

export default HistoryList;
