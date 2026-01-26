
import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedTransaction, StockNews, ClosedTrade, Transaction } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  History as HistoryIcon, 
  Tag, 
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
  Calendar
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
  newsLoading = false
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isNewsExpanded, setIsNewsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('TRANSACTIONS');

  // --- 新增篩選狀態 ---
  const [showFilters, setShowFilters] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getColor = (val: number) => (val >= 0 ? 'text-twRed' : 'text-twGreen');
  const getBgColor = (val: number) => (val >= 0 ? 'bg-twRed/10' : 'bg-twGreen/10');

  useEffect(() => {
    const handleClickOutside = () => setConfirmingId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // 當外部傳入 filterSymbol 時 (從 Dashboard 點擊)，自動填入關鍵字並展開
  useEffect(() => {
    if (filterSymbol) {
        setKeyword(filterSymbol);
        setIsNewsExpanded(false);
        // 如果是外部觸發的篩選，不一定需要展開篩選面板，保持簡潔
        // setShowFilters(true); 
    } else {
        // 如果外部清除 filter (例如點擊 Dashboard 空白處或重整)，這裡不一定要清空，視需求而定
        // 但為了 UX 一致性，如果外部 filterSymbol 變更，我們通常跟隨
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

  // --- 交易明細篩選邏輯 ---
  const sortedTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. 關鍵字篩選 (代號或名稱)
    if (keyword) {
        const lowerKw = keyword.toLowerCase();
        result = result.filter(t => 
            t.symbol.toLowerCase().includes(lowerKw) || 
            t.name.toLowerCase().includes(lowerKw)
        );
    }

    // 2. 交易類型篩選
    if (filterType !== 'ALL') {
        result = result.filter(t => t.type === filterType);
    }

    // 3. 日期範圍篩選
    if (startDate) {
        result = result.filter(t => t.date >= startDate);
    }
    if (endDate) {
        result = result.filter(t => t.date <= endDate);
    }

    // 4. 排序
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

  // --- 已實現損益篩選邏輯 ---
  const filteredClosedTrades = useMemo(() => {
      let result = [...closedTrades];

      // 1. 關鍵字
      if (keyword) {
          const lowerKw = keyword.toLowerCase();
          result = result.filter(t => 
              t.symbol.toLowerCase().includes(lowerKw) || 
              t.name.toLowerCase().includes(lowerKw)
          );
      }
      
      // 注意: ClosedTrade 是一組買賣，通常我們篩選的是「賣出日期」(實現日期)
      if (startDate) {
          result = result.filter(t => t.sellDate >= startDate);
      }
      if (endDate) {
          result = result.filter(t => t.sellDate <= endDate);
      }

      // FilterType 對已實現損益沒有意義 (因為一定是賣出)，所以忽略

      // 預設依賣出日期排序
      return result.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());
  }, [closedTrades, keyword, startDate, endDate]); // filterType 不影響此處

  const inputClass = "w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-white text-center flex items-center justify-center gap-2 mb-4">
            <HistoryIcon size={24} className="text-blue-400" /> 
            歷史紀錄
        </h2>
        
        {/* View Mode Toggle */}
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700 max-w-[280px] mx-auto mb-4">
            <button
                onClick={() => setViewMode('TRANSACTIONS')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'TRANSACTIONS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
                交易明細
            </button>
            <button
                onClick={() => setViewMode('REALIZED')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'REALIZED' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
                已實現損益
            </button>
        </div>

        {/* --- 篩選控制面板 --- */}
        <div className="bg-cardBg rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden transition-all duration-300">
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`w-full flex items-center justify-between p-3 transition-colors ${showFilters ? 'bg-slate-800/80 border-b border-slate-700' : 'hover:bg-slate-800/50'}`}
            >
                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <Filter size={16} className={hasActiveFilters ? "text-blue-400" : "text-slate-500"} />
                    篩選條件
                    {hasActiveFilters && !showFilters && (
                        <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full ml-1">
                           已過濾
                        </span>
                    )}
                </div>
                {showFilters ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>

            {showFilters && (
                <div className="p-4 space-y-3 bg-slate-800/20 animate-slide-down">
                    {/* 關鍵字 */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="搜尋代號或名稱..." 
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value.toUpperCase())}
                            className={`${inputClass} pl-9`}
                        />
                        {keyword && (
                            <button 
                                onClick={() => setKeyword('')}
                                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* 交易類別 (僅在交易明細模式顯示) */}
                    {viewMode === 'TRANSACTIONS' && (
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            {(['ALL', 'BUY', 'SELL'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                        filterType === type 
                                            ? (type === 'BUY' ? 'bg-twRed text-white' : type === 'SELL' ? 'bg-twGreen text-white' : 'bg-slate-600 text-white')
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {type === 'ALL' ? '全部類型' : type === 'BUY' ? '買進' : '賣出'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 日期範圍 */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">起始日期</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={inputClass} 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 mb-1 block">結束日期</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={inputClass} 
                            />
                        </div>
                    </div>

                    {/* 清除按鈕 */}
                    <div className="flex justify-end pt-2 border-t border-slate-700/50">
                        <button 
                            onClick={handleClearAllFilters}
                            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
                        >
                            <FilterX size={12} /> 清除所有篩選
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Sort Controls (Transactions Only) */}
        {viewMode === 'TRANSACTIONS' && (
            <div className="flex items-center justify-between mt-4 px-1">
                <div className="flex gap-2">
                    <button onClick={() => handleSort('date')} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-medium border transition-all ${sortField === 'date' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-transparent border-slate-700 text-slate-500'}`}>
                        <CalendarDays size={12} /> 日期 {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                    <button onClick={() => handleSort('amount')} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-medium border transition-all ${sortField === 'amount' ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-transparent border-slate-700 text-slate-500'}`}>
                        <CircleDollarSign size={12} /> 金額 {sortField === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </button>
                </div>
                <div className="text-[10px] text-slate-500">
                    共 {sortedTransactions.length} 筆
                </div>
            </div>
        )}
      </div>

      {/* --- News Section (Linked to Keyword) --- */}
      {keyword && viewMode === 'TRANSACTIONS' && (
        <section className="bg-slate-800/40 rounded-3xl border border-slate-700/50 mb-6 overflow-hidden transition-all duration-300">
            <button 
                onClick={() => setIsNewsExpanded(!isNewsExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/60 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Newspaper size={16} className="text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-200">"{keyword}" 最新動態</h3>
                    {!isNewsExpanded && news.length > 0 && (
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse ml-1"></span>
                    )}
                </div>
                {isNewsExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
            
            {isNewsExpanded && (
                <div className="px-4 pb-4 animate-slide-down">
                    {newsLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-500">
                            <Loader2 size={24} className="animate-spin text-blue-400" />
                            <span className="text-xs">正在抓取最新新聞...</span>
                        </div>
                    ) : news.length > 0 ? (
                        <div className="space-y-3 pt-2">
                            {news.slice(0, 3).map((item, idx) => (
                                <a 
                                    key={idx} 
                                    href={item.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block bg-slate-900/50 p-3 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors group"
                                >
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-blue-400 uppercase">{item.source}</span>
                                            {item.date && (
                                                <span className="flex items-center gap-1 text-[8px] text-slate-500 font-mono mt-0.5">
                                                    <Clock size={8} /> {item.date}
                                                </span>
                                            )}
                                        </div>
                                        <ExternalLink size={10} className="text-slate-600 group-hover:text-blue-400" />
                                    </div>
                                    <h4 className="text-xs font-bold text-white mb-1 line-clamp-1 group-hover:text-blue-200">{item.title}</h4>
                                    <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed mt-1 opacity-80">{item.snippet}</p>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs text-slate-600">暫無相關即時新聞</div>
                    )}
                </div>
            )}
        </section>
      )}

      {/* --- View Mode: Transactions --- */}
      {viewMode === 'TRANSACTIONS' && (
        <div className="space-y-3 animate-slide-up">
            {sortedTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm italic bg-slate-800/20 rounded-2xl border border-slate-800">
                    尚無符合條件的交易紀錄。
                </div>
            ) : (
                sortedTransactions.map((tx) => {
                    return (
                        <div key={tx.id} className="bg-cardBg p-4 rounded-2xl border border-slate-700/50 shadow-sm relative transition-all">
                        <div className="absolute -top-1 -right-1 z-10 flex gap-1">
                            {confirmingId === tx.id ? (
                                <>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmingId(null); }} className="p-2.5 bg-slate-700 text-white rounded-full shadow-xl border border-slate-600"><X size={16} /></button>
                                    <button type="button" disabled={isDeleting} onClick={(e) => handleDeleteClick(e, tx.id)} className="flex items-center gap-1 px-3 py-2.5 bg-twRed text-white font-bold rounded-full shadow-xl border border-twRed/50 animate-pulse"><Check size={16} /><span className="text-xs">確定？</span></button>
                                </>
                            ) : (
                                <>
                                    {/* Edit Button */}
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleEditClick(e, tx)} 
                                        className="p-2.5 bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-all border border-slate-600 rounded-full shadow-sm"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    {/* Delete Button */}
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleDeleteClick(e, tx.id)} 
                                        className="p-2.5 bg-slate-800 text-slate-400 hover:text-twRed hover:bg-slate-700 transition-all border border-slate-600 rounded-full shadow-sm"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                        <div className={`transition-opacity ${confirmingId === tx.id ? 'opacity-30' : 'opacity-100'}`}>
                            <div className="flex justify-between items-start mb-2 pr-20">
                                <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${tx.type === 'BUY' ? 'bg-twRed/20 text-twRed' : 'bg-twGreen/20 text-twGreen'}`}>{tx.type === 'BUY' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}</div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{tx.symbol}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{tx.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">{tx.date} • {tx.type === 'BUY' ? '買進' : '賣出'}</div>
                                </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end mt-2">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500"><Tag size={12} /> 手續費: ${tx.fee}</div>
                                    <div className="text-[10px] text-slate-500">成交單價 ${tx.price.toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-white">{tx.shares.toLocaleString()} 股</div>
                                    <div className="flex items-center gap-2 mt-1 justify-end">
                                        <span className="text-[10px] text-slate-500">{tx.type === 'BUY' ? '總支出' : '總拿回'}: ${tx.totalAmount.toLocaleString()}</span>
                                        {tx.realizedPL !== undefined && (
                                            <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBgColor(tx.realizedPL)} ${getColor(tx.realizedPL)}`}>
                                                {tx.realizedPL >= 0 ? '+' : ''}{Math.abs(Math.round(tx.realizedPL)).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    );
                })
            )}
        </div>
      )}

      {/* --- View Mode: Realized PL --- */}
      {viewMode === 'REALIZED' && (
          <div className="space-y-3 animate-slide-up">
              {filteredClosedTrades.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm italic bg-slate-800/20 rounded-2xl border border-slate-800">
                      尚無符合條件的紀錄。
                  </div>
              ) : (
                  filteredClosedTrades.map((trade, idx) => (
                      <div key={`${trade.id}-${idx}`} className="bg-cardBg rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
                          {/* Card Header */}
                          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">{trade.symbol}</span>
                                  <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{trade.name}</span>
                              </div>
                              <div className={`flex flex-col items-end ${getColor(trade.realizedPL)}`}>
                                  <span className="text-sm font-bold">
                                      {trade.realizedPL > 0 ? '+' : ''}{Math.round(trade.realizedPL).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-medium opacity-80">
                                      {trade.roi.toFixed(2)}%
                                  </span>
                              </div>
                          </div>
                          
                          {/* Card Body */}
                          <div className="p-4 grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                              {/* Buy Info */}
                              <div className="flex flex-col gap-1">
                                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">買入</span>
                                  <div className="text-xs text-white font-mono">{trade.buyDate}</div>
                                  <div className="text-xs text-slate-400">均價 {trade.avgBuyPrice.toFixed(1)}</div>
                              </div>

                              {/* Arrow */}
                              <div className="flex flex-col items-center justify-center text-slate-600 gap-1">
                                  <div className="text-[9px] font-bold bg-slate-800 px-1.5 rounded text-slate-400">{trade.shares.toLocaleString()} 股</div>
                                  <ArrowRight size={16} />
                                  <div className="text-[9px] text-slate-500">{trade.holdDays} 天</div>
                              </div>

                              {/* Sell Info */}
                              <div className="flex flex-col gap-1 text-right">
                                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">賣出</span>
                                  <div className="text-xs text-white font-mono">{trade.sellDate}</div>
                                  <div className="text-xs text-slate-400">均價 {trade.sellPrice.toFixed(1)}</div>
                              </div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}
    </div>
  );
};

export default HistoryList;
