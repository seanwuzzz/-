import React, { useState, useEffect } from 'react';
import { ProcessedTransaction } from '../types';
import { ArrowUpRight, ArrowDownRight, History as HistoryIcon, Tag, Trash2, X, Check } from 'lucide-react';

interface Props {
  transactions: ProcessedTransaction[];
  onDelete: (id: string) => Promise<void>;
}

const HistoryList: React.FC<Props> = ({ transactions, onDelete }) => {
  // 用來追蹤哪一筆交易正處於「等待確認刪除」的狀態
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getColor = (val: number) => (val >= 0 ? 'text-twRed' : 'text-twGreen');
  const getBgColor = (val: number) => (val >= 0 ? 'bg-twRed/10' : 'bg-twGreen/10');

  // 如果點擊其他地方，取消確認狀態
  useEffect(() => {
    const handleClickOutside = () => setConfirmingId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // 防止觸發外層事件或視窗點擊監聽
    
    if (confirmingId === id) {
      // 第二次點擊：執行刪除
      console.log('HistoryList: 執行最終刪除, ID:', id);
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
      // 第一次點擊：進入確認模式
      console.log('HistoryList: 進入確認模式, ID:', id);
      setConfirmingId(id);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500">
        尚無交易紀錄。
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
        <HistoryIcon size={24} className="text-blue-400" /> 交易紀錄
      </h2>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-cardBg p-4 rounded-2xl border border-slate-700/50 shadow-sm relative overflow-visible transition-all">
            
            {/* 兩段式確認按鈕 */}
            <div className="absolute -top-1 -right-1 z-[100] flex gap-1">
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
                        className="p-2.5 bg-slate-800 text-slate-400 hover:text-twRed hover:bg-slate-700 active:scale-90 transition-all border border-slate-600 rounded-full shadow-xl"
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
                    
                    {tx.realizedPL !== undefined && (
                        <div className={`text-xs font-bold px-3 py-1 rounded-full ${getBgColor(tx.realizedPL)} ${getColor(tx.realizedPL)}`}>
                            {tx.realizedPL >= 0 ? '獲利' : '虧損'} ${Math.abs(Math.round(tx.realizedPL)).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;