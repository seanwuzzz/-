
export interface Transaction {
  id: string;
  date: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND'; // 新增 DIVIDEND
  shares: number;
  price: number;
  fee: number;
  notes?: string;
}

export interface ProcessedTransaction extends Transaction {
  realizedPL?: number;
  totalAmount: number; // 實際收付金額 (買進加計費用, 賣出/股利扣除費用)
}

export interface StockPrice {
  symbol: string;
  price: number;
  changePercent: number;
  name?: string;
  sector?: string;
  beta?: number;
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
  totalDividend: number; // 新增: 累計股利
  sector: string;
  beta: number;
}

export interface PortfolioSummary {
  totalAssets: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  totalRealizedPL: number;
  dayPL: number;
  dayRealizedPL: number;
  daySettlementAmount: number;
  portfolioBeta: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  name: string;
  sellDate: string;
  buyDate: string;
  shares: number;
  avgBuyPrice: number;
  sellPrice: number;
  realizedPL: number;
  roi: number;
  holdDays: number;
  notes?: string;
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
  defaultShowBalance: boolean;
}

export enum Tab {
  HOME = 'HOME',
  HISTORY = 'HISTORY',
  ANALYSIS = 'ANALYSIS',
  ADD = 'ADD',
  SETTINGS = 'SETTINGS'
}
