import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { generatePortfolioAnalysis } from '../services/geminiService';
import { PortfolioPosition, PortfolioSummary } from '../types';
import { Sparkles, RefreshCcw } from 'lucide-react';

interface Props {
  apiKey: string;
  summary: PortfolioSummary;
  positions: PortfolioPosition[];
}

const AIAnalysis: React.FC<Props> = ({ apiKey, summary, positions }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(false);

  const runAnalysis = async () => {
    setLoading(true);
    const result = await generatePortfolioAnalysis(apiKey, summary, positions);
    setAnalysis(result);
    setLoading(false);
    setHasRun(true);
  };

  useEffect(() => {
    if (apiKey && positions.length > 0 && !hasRun) {
        // Auto-run if key exists and data exists, but only once per mount to save tokens
        // runAnalysis(); 
        // Better UX: Let user trigger it
    }
  }, [apiKey, positions, hasRun]);

  return (
    <div className="p-4 pb-24 h-full flex flex-col">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 rounded-3xl shadow-lg mb-6 text-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <Sparkles className="mx-auto text-yellow-300 mb-2" size={32} />
         <h2 className="text-2xl font-bold text-white relative z-10">AI 投資顧問</h2>
         <p className="text-purple-200 text-sm mt-2 relative z-10">
            由 Gemini 3 Flash 提供您的投資組合診斷
         </p>
      </div>

      <div className="flex-1 bg-cardBg rounded-2xl border border-slate-700 shadow-xl p-5 overflow-y-auto custom-scrollbar">
        {!apiKey ? (
           <div className="text-center text-slate-400 mt-10">
             請先至設定頁面輸入 Gemini API Key 才能使用此功能。
           </div>
        ) : positions.length === 0 ? (
           <div className="text-center text-slate-400 mt-10">
             請先新增交易紀錄以進行分析。
           </div>
        ) : loading ? (
           <div className="flex flex-col items-center justify-center h-48 space-y-4">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-300 animate-pulse">正在分析您的投資組合...</p>
           </div>
        ) : !analysis ? (
           <div className="flex flex-col items-center justify-center h-full">
             <p className="text-slate-400 mb-4 text-center">準備好分析您的 {positions.length} 檔持股了嗎？</p>
             <button 
                onClick={runAnalysis}
                className="bg-white text-indigo-900 px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
             >
                <Sparkles size={18} /> 開始分析
             </button>
           </div>
        ) : (
           <div className="prose prose-invert prose-sm max-w-none">
             <ReactMarkdown>{analysis}</ReactMarkdown>
             
             <div className="mt-8 pt-4 border-t border-slate-700 flex justify-center">
                <button 
                    onClick={runAnalysis}
                    className="text-slate-400 hover:text-white flex items-center gap-2 text-xs"
                >
                    <RefreshCcw size={14} /> 重新分析
                </button>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysis;