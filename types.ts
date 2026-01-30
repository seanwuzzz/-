
export interface Transaction {
  id: string;
  date: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  fee: number;
  notes?: string; // 新增: 交易心得/備註
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
  portfolioBeta: number;
}

export interface ClosedTrade {
  id: string; // 使用賣出交易的 ID
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
  notes?: string; // 新增: 交易心得
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
