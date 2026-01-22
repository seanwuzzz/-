export interface Transaction {
  id: string;
  date: string;
  symbol: string;
  name: string; // Stock Name
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  fee: number;
}

export interface StockPrice {
  symbol: string;
  price: number;
  changePercent: number; // 0.05 for 5%
  name?: string;
}

export interface PortfolioPosition {
  symbol: string;
  name: string; // Stock Name
  shares: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  unrealizedPL: number; // Profit/Loss
  unrealizedPLPercent: number;
  dayChangePercent: number;
  dayChangeAmount: number;
}

export interface PortfolioSummary {
  totalAssets: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  dayPL: number;
}

export interface AppSettings {
  googleScriptUrl: string;
  geminiApiKey: string;
  useDemoData: boolean;
}

export enum Tab {
  HOME = 'HOME',
  ADD = 'ADD',
  AI = 'AI',
  SETTINGS = 'SETTINGS'
}