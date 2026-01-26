
import { Transaction, ProcessedTransaction, StockPrice, PortfolioPosition, PortfolioSummary } from '../types';

export const calculatePortfolio = (
  transactions: Transaction[],
  prices: StockPrice[]
): { positions: PortfolioPosition[]; summary: PortfolioSummary; processedTransactions: ProcessedTransaction[] } => {
  
  const positionsMap = new Map<string, PortfolioPosition>();
  let totalRealizedPL = 0;
  const processedTransactions: ProcessedTransaction[] = [];

  const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTxs.forEach(tx => {
    const symbol = tx.symbol.trim();
    
    const current = positionsMap.get(symbol) || {
      symbol: symbol,
      name: tx.name,
      shares: 0,
      totalCost: 0,
      avgCost: 0,
      currentPrice: 0,
      currentValue: 0,
      unrealizedPL: 0,
      unrealizedPLPercent: 0,
      dayChangePercent: 0,
      dayChangeAmount: 0,
      realizedPL: 0,
      sector: '未分類',
      beta: 1
    };

    if (tx.name) current.name = tx.name;

    const netTransactionAmount = tx.type === 'BUY' 
      ? (tx.shares * tx.price) + tx.fee
      : (tx.shares * tx.price) - tx.fee;

    const processedTx: ProcessedTransaction = { 
      ...tx, 
      totalAmount: netTransactionAmount 
    };

    if (tx.type === 'BUY') {
      current.shares += tx.shares;
      current.totalCost += netTransactionAmount;
      current.avgCost = current.shares > 0 ? current.totalCost / current.shares : 0;
    } else {
      if (current.shares > 0) {
        const costOfSoldShares = current.avgCost * tx.shares;
        const gainLoss = netTransactionAmount - costOfSoldShares;
        
        current.realizedPL += gainLoss;
        totalRealizedPL += gainLoss;
        processedTx.realizedPL = gainLoss;

        current.shares -= tx.shares;
        current.totalCost = current.shares * current.avgCost;
      }
    }
    
    if(current.shares <= 0) {
        current.shares = 0;
        current.totalCost = 0;
        current.avgCost = 0;
    }

    positionsMap.set(symbol, current);
    processedTransactions.push(processedTx);
  });

  const positions: PortfolioPosition[] = [];
  let summary: PortfolioSummary = {
    totalAssets: 0,
    totalCost: 0,
    totalPL: 0,
    totalPLPercent: 0,
    totalRealizedPL: totalRealizedPL,
    dayPL: 0,
    portfolioBeta: 0
  };

  positionsMap.forEach((pos) => {
    const priceData = prices.find(p => p.symbol.trim() === pos.symbol);
    const currentPrice = priceData ? priceData.price : 0;
    const changePct = priceData ? priceData.changePercent : 0;
    const beta = priceData && priceData.beta !== undefined ? priceData.beta : 1;
    
    if (priceData && priceData.sector) {
      pos.sector = priceData.sector;
    }
    pos.beta = beta;

    if (pos.shares > 0) {
      pos.currentPrice = currentPrice;
      pos.currentValue = pos.shares * currentPrice;
      pos.unrealizedPL = pos.currentValue - pos.totalCost;
      pos.unrealizedPLPercent = pos.totalCost > 0 ? (pos.unrealizedPL / pos.totalCost) * 100 : 0;
      pos.dayChangePercent = changePct;
      
      // --- 正確計算今日變動金額 ---
      // 1. 計算昨日收盤價: Current / (1 + Change%)
      // 2. 漲跌金額 = (目前股價 - 昨日收盤價) * 股數
      const changeRate = changePct / 100;
      const prevClose = currentPrice / (1 + changeRate);
      pos.dayChangeAmount = (currentPrice - prevClose) * pos.shares;

      summary.totalAssets += pos.currentValue;
      summary.totalCost += pos.totalCost;
      summary.dayPL += pos.dayChangeAmount;
      
      positions.push(pos);
    }
  });

  let weightedBetaSum = 0;
  positions.forEach(pos => {
      const weight = summary.totalAssets > 0 ? pos.currentValue / summary.totalAssets : 0;
      weightedBetaSum += weight * pos.beta;
  });
  summary.portfolioBeta = summary.totalAssets > 0 ? weightedBetaSum : 0;

  summary.totalPL = summary.totalAssets - summary.totalCost;
  summary.totalPLPercent = summary.totalCost > 0 ? (summary.totalPL / summary.totalCost) * 100 : 0;

  positions.sort((a, b) => b.currentValue - a.currentValue);
  const history = [...processedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { positions, summary, processedTransactions: history };
};
