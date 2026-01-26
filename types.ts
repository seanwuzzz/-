
export interface User {
  email: string;
  name: string;
  picture: string;
}

export interface Transaction {
  id: string;
  date: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  fee: number;
}

export interface ProcessedTransaction extends Transaction {
  realizedPL?: number;
  totalAmount: number; // 實際收付金額 (買進加計費用, 賣出扣除費用)
}

export interface StockPrice {
  symbol: string;
  price: number;
  changePercent: number;
  name?: string;
  sector?: string;
  beta?: number; // 新增: 個股 Beta 值
}

export interface PortfolioPosition {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dayChangePercent: number;
  dayChangeAmount: number;
  realizedPL: number;
  sector: string;
  beta: number; // 新增: 個股 Beta 值
}

export interface PortfolioSummary {
  totalAssets: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  totalRealizedPL: number;
  dayPL: number;
  portfolioBeta: number; // 新增: 投資組合加權 Beta
}

export interface StockNews {
  title: string;
  snippet: string;
  url: string;
  source: string;
  date?: string;
  _ts?: number;
}

export interface AppSettings {
  googleScriptUrl: string;
  useDemoData: boolean;
  googleClientId?: string; // 新增: 用於 Google Sign-In
}

export enum Tab {
  HOME = 'HOME',
  HISTORY = 'HISTORY',
  ANALYSIS = 'ANALYSIS',
  ADD = 'ADD',
  SETTINGS = 'SETTINGS'
}
