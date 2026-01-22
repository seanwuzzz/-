import React from 'react';
import { ProcessedTransaction } from '../types';
import { ArrowUpRight, ArrowDownRight, History as HistoryIcon, Tag } from 'lucide-react';

interface Props {
  transactions: ProcessedTransaction[];
}

const HistoryList: React.FC<Props> = ({ transactions }) => {
  const getColor = (val: number) => (val >= 0 ? 'text-twRed' : 'text-twGreen');
  const getBgColor = (val: number) => (val >= 0 ? 'bg-twRed/10' : 'bg-twGreen/10');

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
          <div key={tx.id} className="bg-cardBg p-4 rounded-2xl border border-slate-700/50 shadow-sm">
            <div className="flex justify-between items-start mb-2">
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
        ))}
      </div>
    </div>
  );
};

export default HistoryList;