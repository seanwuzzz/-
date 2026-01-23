import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedTransaction, StockNews } from '../types';
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
  Clock
} from 'lucide-react';

interface Props {
  transactions: ProcessedTransaction[];
  onDelete: (id: string) => Promise<void>;
  filterSymbol?: string | null;
  onClearFilter?: () => void;
  news?: StockNews[];
  newsLoading?: boolean;
}

type SortField = 'date' | 'amount';
type SortOrder = 'desc' | 'asc';

const HistoryList: React.FC<Props> = ({ 
  transactions, 
  onDelete, 
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

  const getColor = (val: number) => (val >= 0 ? 'text-twRed' : 'text-twGreen');
  const getBgColor = (val: number) => (val >= 0 ? 'bg-twRed/10' : 'bg-twGreen/10');

  useEffect(() => {
    const handleClickOutside = () => setConfirmingId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsNewsExpanded(false);
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
        setSortField(field);
        setSortOrder('desc');
    }
  };

  const sortedTransactions = useMemo(() => {
    const filtered = filterSymbol 
        ? transactions.filter(t => t.symbol === filterSymbol)
        : [...transactions];

    return filtered.sort((a, b) => {
        let comparison = 0;
        if (sortField === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'amount') {
            comparison = a.totalAmount - b.totalAmount;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [transactions, filterSymbol, sortField, sortOrder]);

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white text-center flex items-center justify-center gap-2">
            <HistoryIcon size={24} className="text-blue-400" /> 
            {filterSymbol ? `${filterSymbol} 詳情` : '交易紀錄'}
        </h2>
        
        <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center justify-center gap-2">
                <button onClick={() => handleSort('date')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${sortField === 'date' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <CalendarDays size={14} /> 日期 {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                </button>
                <button onClick={() => handleSort('amount')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${sortField === 'amount' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <CircleDollarSign size={14} /> 成交淨額 {sortField === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                </button>
            </div>
            {filterSymbol && (
                <div className="flex justify-center">
                    <button onClick={onClearFilter} className="text-[10px] bg-slate-800 text-slate-500 px-3 py-1 rounded-full border border-slate-700 hover:text-white flex items-center gap-1 transition-all">
                        <FilterX size={12} /> 返回所有交易
                    </button>
                </div>
            )}
        </div>
      </div>

      {filterSymbol && (
        <section className="bg-slate-800/40 rounded-3xl border border-slate-700/50 mb-6 overflow-hidden transition-all duration-300">
            <button 
                onClick={() => setIsNewsExpanded(!isNewsExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/60 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Newspaper size={16} className="text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-200">最新動態</h3>
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
                                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{item.snippet}</p>
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

      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm italic">尚無符合條件的交易紀錄。</div>
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
                              <button type="button" onClick={(e) => handleDeleteClick(e, tx.id)} className="p-2.5 bg-slate-800 text-slate-400 hover:text-twRed hover:bg-slate-700 transition-all border border-slate-600 rounded-full shadow-sm"><Trash2 size={16} /></button>
                          )}
                      </div>
                      <div className={`transition-opacity ${confirmingId === tx.id ? 'opacity-30' : 'opacity-100'}`}>
                          <div className="flex justify-between items-start mb-2 pr-6">
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
                            <div className="text-right">
                              <div className="text-sm font-bold text-white">{tx.shares.toLocaleString()} 股</div>
                              <div className="text-[10px] text-slate-400">成交單價 ${tx.price.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
                              <div className="flex items-center gap-1 text-[10px] text-slate-500"><Tag size={12} /> 手續費: ${tx.fee}</div>
                              <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500">{tx.type === 'BUY' ? '總支出' : '總拿回'}: ${tx.totalAmount.toLocaleString()}</span>
                                  {tx.realizedPL !== undefined && (
                                      <div className={`text-xs font-bold px-3 py-1 rounded-full ${getBgColor(tx.realizedPL)} ${getColor(tx.realizedPL)}`}>
                                          {tx.realizedPL >= 0 ? '淨利' : '淨損'} ${Math.abs(Math.round(tx.realizedPL)).toLocaleString()}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default HistoryList;