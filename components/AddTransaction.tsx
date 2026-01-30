
import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { PlusCircle, Loader2, Calculator, AlertCircle, Save, X, StickyNote } from 'lucide-react';

interface Props {
  onAdd: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  onCancel: () => void;
  initialData?: Transaction | null;
}

const AddTransaction: React.FC<Props> = ({ onAdd, onCancel, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    name: '',
    type: 'BUY' as 'BUY' | 'SELL',
    shares: '',
    price: '',
    fee: '20',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date,
        symbol: initialData.symbol,
        name: initialData.name,
        type: initialData.type,
        shares: initialData.shares.toString(),
        price: initialData.price.toString(),
        fee: initialData.fee.toString(),
        notes: initialData.notes || ''
      });
    }
  }, [initialData]);

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setFormData({ ...formData, symbol: val });
  };

  const handleAutoCalculateFee = () => {
    setFeeError(null);

    if (!formData.price || !formData.shares) {
      setFeeError("請先輸入「股數」與「成交價」");
      return;
    }
    
    const price = parseFloat(formData.price);
    const shares = parseFloat(formData.shares);

    if (isNaN(price) || isNaN(shares)) {
       setFeeError("請輸入有效的數字");
       return;
    }

    const amount = price * shares;
    const rate = formData.type === 'BUY' ? 0.001425 : 0.004425;
    
    const calculated = Math.round(amount * rate);
    const finalFee = calculated < 1 ? 1 : calculated;

    setFormData(prev => ({ ...prev, fee: finalFee.toString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol || !formData.shares || !formData.price || !formData.name) return;
    
    setLoading(true);
    try {
        await onAdd({
            date: formData.date,
            symbol: formData.symbol.trim(),
            name: formData.name,
            type: formData.type,
            shares: Number(formData.shares),
            price: Number(formData.price),
            fee: Number(formData.fee),
            notes: formData.notes
        });
    } catch (err) {
        alert("操作失敗，請檢查網路連線。");
    } finally {
        setLoading(false);
    }
  };

  const inputClassName = "w-full h-[42px] bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm appearance-none";

  return (
    <div className="p-4 h-full flex flex-col justify-center max-w-lg mx-auto animate-fade-in pb-20">
      <div className="bg-cardBg rounded-3xl p-6 shadow-2xl border border-slate-700 relative">
        <button 
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
        >
            <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
            {initialData ? '編輯交易' : '新增交易'}
            {initialData && <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded">ID: {initialData.id}</span>}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs text-slate-400 mb-1">日期</label>
                <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className={inputClassName}
                />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1">股票代號</label>
                <input
                    type="text"
                    required
                    placeholder="例如: 2330"
                    value={formData.symbol}
                    onChange={handleSymbolChange}
                    className={inputClassName}
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
                className={inputClassName}
            />
          </div>

          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg h-[46px] items-center">
            {(['BUY', 'SELL'] as const).map(type => (
                <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, type})}
                    className={`flex-1 h-full rounded-md text-sm font-bold transition-all ${
                        formData.type === type 
                            ? (type === 'BUY' ? 'bg-twRed text-white shadow-md' : 'bg-twGreen text-white shadow-md')
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
                    inputMode="numeric"
                    placeholder="1000"
                    value={formData.shares}
                    onChange={e => {
                        setFormData({...formData, shares: e.target.value});
                        if (feeError) setFeeError(null);
                    }}
                    className={inputClassName}
                />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1">成交價</label>
                <input
                    type="number"
                    required
                    inputMode="decimal"
                    step="0.01"
                    placeholder="580"
                    value={formData.price}
                    onChange={e => {
                        setFormData({...formData, price: e.target.value});
                        if (feeError) setFeeError(null);
                    }}
                    className={inputClassName}
                />
            </div>
          </div>

          <div>
             <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                <span>手續費 ({formData.type === 'BUY' ? '0.1425%' : '0.4425%'})</span>
             </label>
             <div className="relative">
                <input
                    type="number"
                    required
                    inputMode="numeric"
                    value={formData.fee}
                    onChange={e => setFormData({...formData, fee: e.target.value})}
                    className={`${inputClassName} pr-24`}
                />
                <button
                    type="button"
                    onClick={handleAutoCalculateFee}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-blue-400 rounded-md text-xs font-bold flex items-center gap-1 transition-colors border border-slate-600 active:scale-95"
                >
                    <Calculator size={12} />
                    自動試算
                </button>
             </div>
             {feeError && (
                <div className="mt-2 text-xs text-twRed bg-twRed/10 p-2 rounded-lg border border-twRed/20 flex items-center gap-2 animate-pulse">
                    <AlertCircle size={14} className="shrink-0" />
                    {feeError}
                </div>
             )}
          </div>

          {/* Notes Field */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <StickyNote size={12} /> 備註 / 心得 (選填)
            </label>
            <textarea
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="記錄交易理由、心得或策略..."
                className={`${inputClassName} h-20 py-2 resize-none`}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold text-sm h-[48px]"
            >
                取消
            </button>
            <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-100 flex justify-center items-center gap-2 text-sm h-[48px]"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (initialData ? <Save size={18} /> : <PlusCircle size={18} />)}
                {initialData ? '儲存變更' : '確認新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;
