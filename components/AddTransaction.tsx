import React, { useState } from 'react';
import { Transaction } from '../types';
import { PlusCircle, Loader2 } from 'lucide-react';

interface Props {
  onAdd: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const AddTransaction: React.FC<Props> = ({ onAdd, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    name: '',
    type: 'BUY' as 'BUY' | 'SELL',
    shares: '',
    price: '',
    fee: '20'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.shares || !formData.price || !formData.name) return;
    
    setLoading(true);
    try {
        await onAdd({
            date: formData.date,
            symbol: formData.symbol.trim().toUpperCase(),
            name: formData.name,
            type: formData.type,
            shares: Number(formData.shares),
            price: Number(formData.price),
            fee: Number(formData.fee)
        });
    } catch (err) {
        alert("Failed to add transaction");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col justify-center max-w-lg mx-auto">
      <div className="bg-cardBg rounded-3xl p-6 shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">新增交易</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs text-slate-400 mb-1">日期</label>
                <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1">股票代號</label>
                <input
                    type="text"
                    required
                    placeholder="2330"
                    value={formData.symbol}
                    onChange={e => setFormData({...formData, symbol: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 uppercase"
                />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">股票名稱</label>
            <input
                type="text"
                required
                placeholder="台積電"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
            {(['BUY', 'SELL'] as const).map(type => (
                <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, type})}
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                        formData.type === type 
                            ? (type === 'BUY' ? 'bg-twRed text-white' : 'bg-twGreen text-white')
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    {type === 'BUY' ? '買進' : '賣出'}
                </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs text-slate-400 mb-1">股數</label>
                <input
                    type="number"
                    required
                    placeholder="1000"
                    value={formData.shares}
                    onChange={e => setFormData({...formData, shares: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1">成交價</label>
                <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="580"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                />
            </div>
          </div>

          <div>
             <label className="block text-xs text-slate-400 mb-1">手續費</label>
             <input
                type="number"
                required
                value={formData.fee}
                onChange={e => setFormData({...formData, fee: e.target.value})}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold"
            >
                取消
            </button>
            <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-100 flex justify-center items-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : <PlusCircle size={20} />}
                新增
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;