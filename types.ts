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
}

export interface StockPrice {
  symbol: string;
  price: number;
  changePercent: number;
  name?: string;
  sector?: string; // Added: sector information
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
  sector: string; // Added: carry over sector to position
}

export interface PortfolioSummary {
  totalAssets: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  totalRealizedPL: number;
  dayPL: number;
}

export interface AppSettings {
  googleScriptUrl: string;
  useDemoData: boolean;
}

export enum Tab {
  HOME = 'HOME',
  HISTORY = 'HISTORY',
  ANALYSIS = 'ANALYSIS',
  ADD = 'ADD',
  SETTINGS = 'SETTINGS'
}