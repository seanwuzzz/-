import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedTransaction } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  History as HistoryIcon, 
  Tag, 
  Trash2, 
  X, 
  Check, 
  FilterX, 
  ArrowUpDown,
  CalendarDays,
  CircleDollarSign
} from 'lucide-react';

interface Props {
  transactions: ProcessedTransaction[];
  onDelete: (id: string) => Promise<void>;
  filterSymbol?: string | null;
  onClearFilter?: () => void;
}

type SortField = 'date' | 'amount';
type SortOrder = 'desc' | 'asc';

const HistoryList: React.FC<Props> = ({ transactions, onDelete, filterSymbol, onClearFilter }) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const getColor = (val: number) => (val >= 0 ? 'text-twRed' : 'text-twGreen');
  const getBgColor = (val: number) => (val >= 0 ? 'bg-twRed/10' : 'bg-twGreen/10');

  useEffect(() => {
    const handleClickOutside = () => setConfirmingId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirmingId === id) {
      setIsDeleting(true);
      try {
        await onDelete(id);
        setConfirmingId(null);
      } catch (err) {
        console.error('HistoryList: 刪除出錯', err);
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
            const amountA = a.shares * a.price;
            const amountB = b.shares * b.price;
            comparison = amountA - amountB;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [transactions, filterSymbol, sortField, sortOrder]);

  if (transactions.length === 0) {
    return (
      <div className="p-10 text-center flex flex-col items-center gap-4">
        <div className="text-slate-500">尚無交易紀錄。</div>
      </div>
    );
  }

  if (sortedTransactions.length === 0 && filterSymbol) {
    return (
      <div className="p-10 text-center flex flex-col items-center gap-4">
        <div className="text-slate-500">{`尚無 ${filterSymbol} 的交易紀錄。`}</div>
        <button 
            onClick={onClearFilter}
            className="text-blue-400 text-sm flex items-center gap-1 hover:underline"
        >
            <FilterX size={16} /> 查看所有交易
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white text-center flex items-center justify-center gap-2">
            <HistoryIcon size={24} className="text-blue-400" /> 
            {filterSymbol ? `${filterSymbol} 交易紀錄` : '交易紀錄'}
        </h2>
        
        <div className="flex flex-col gap-3 mt-4">
            {/* Sorting Controls */}
            <div className="flex items-center justify-center gap-2">
                <button 
                    onClick={() => handleSort('date')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        sortField === 'date' 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                >
                    <CalendarDays size={14} />
                    日期 {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
                </button>
                <button 
                    onClick={() => handleSort('amount')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        sortField === 'amount' 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                >
                    <CircleDollarSign size={14} />
                    金額 {sortField === 'amount' && (sortOrder === 'desc' ? '↓' : '↑')}
                </button>
            </div>

            {filterSymbol && (
                <div className="flex justify-center">
                    <button 
                        onClick={onClearFilter}
                        className="text-[10px] bg-slate-800 text-slate-500 px-3 py-1 rounded-full border border-slate-700 hover:text-white hover:border-slate-500 flex items-center gap-1 transition-all"
                    >
                        <FilterX size={12} /> 清除代號過濾 ({filterSymbol})
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="space-y-3">
        {sortedTransactions.map((tx) => (
          <div key={tx.id} className="bg-cardBg p-4 rounded-2xl border border-slate-700/50 shadow-sm relative overflow-visible transition-all">
            <div className="absolute -top-1 -right-1 z-10 flex gap-1">
                {confirmingId === tx.id ? (
                    <>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmingId(null); }}
                            className="p-2.5 bg-slate-700 text-white rounded-full shadow-xl border border-slate-600"
                        >
                            <X size={16} />
                        </button>
                        <button 
                            type="button"
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteClick(e, tx.id)}
                            className="flex items-center gap-1 px-3 py-2.5 bg-twRed text-white font-bold rounded-full shadow-xl border border-twRed/50 animate-pulse"
                        >
                            <Check size={16} />
                            <span className="text-xs">確定？</span>
                        </button>
                    </>
                ) : (
                    <button 
                        type="button"
                        onClick={(e) => handleDeleteClick(e, tx.id)}
                        className="p-2.5 bg-slate-800 text-slate-400 hover:text-twRed hover:bg-slate-700 active:scale-90 transition-all border border-slate-600 rounded-full shadow-sm"
                        aria-label="刪除紀錄"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className={`transition-opacity ${confirmingId === tx.id ? 'opacity-30' : 'opacity-100'}`}>
                <div className="flex justify-between items-start mb-2 pr-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${tx.type === 'BUY' ? 'bg-twRed/20 text-twRed' : 'bg-twGreen/20 text-twGreen'}`}>
                        {tx.type === 'BUY' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{tx.symbol}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{tx.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                            {tx.date} • {tx.type === 'BUY' ? '買進' : '賣出'}
                        </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                        {tx.shares.toLocaleString()} 股
                    </div>
                    <div className="text-[10px] text-slate-400">
                        單價 ${tx.price.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Tag size={12} /> 手續費: ${tx.fee}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">成交額: ${(tx.shares * tx.price).toLocaleString()}</span>
                        {tx.realizedPL !== undefined && (
                            <div className={`text-xs font-bold px-3 py-1 rounded-full ${getBgColor(tx.realizedPL)} ${getColor(tx.realizedPL)}`}>
                                {tx.realizedPL >= 0 ? '獲利' : '虧損'} ${Math.abs(Math.round(tx.realizedPL)).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;