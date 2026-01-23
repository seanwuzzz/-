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
      sector: '未分類'
    };

    if (tx.name) current.name = tx.name;

    // 計算此筆交易的實際現金流 (成交額)
    const netTransactionAmount = tx.type === 'BUY' 
      ? (tx.shares * tx.price) + tx.fee  // 買進：支出 = 成交額 + 手續費
      : (tx.shares * tx.price) - tx.fee; // 賣出：拿回 = 成交額 - 手續費

    const processedTx: ProcessedTransaction = { 
      ...tx, 
      totalAmount: netTransactionAmount 
    };

    if (tx.type === 'BUY') {
      current.shares += tx.shares;
      // 累加總成本 (包含買進手續費)
      current.totalCost += netTransactionAmount;
      current.avgCost = current.shares > 0 ? current.totalCost / current.shares : 0;
    } else {
      if (current.shares > 0) {
        // 以目前的含費平均成本計算賣出部分的成本
        const costOfSoldShares = current.avgCost * tx.shares;
        // 實際賣出損益 = 賣出淨拿回 - 買進含費成本
        const gainLoss = netTransactionAmount - costOfSoldShares;
        
        current.realizedPL += gainLoss;
        totalRealizedPL += gainLoss;
        processedTx.realizedPL = gainLoss;

        current.shares -= tx.shares;
        // 更新剩餘持股的總成本
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
  };

  positionsMap.forEach((pos) => {
    const priceData = prices.find(p => p.symbol.trim() === pos.symbol);
    const currentPrice = priceData ? priceData.price : 0;
    const changePct = priceData ? priceData.changePercent : 0;
    
    if (priceData && priceData.sector) {
      pos.sector = priceData.sector;
    }

    if (pos.shares > 0) {
      pos.currentPrice = currentPrice;
      pos.currentValue = pos.shares * currentPrice;
      // 未實現損益 = 目前市值 - 含買進費用的總成本
      pos.unrealizedPL = pos.currentValue - pos.totalCost;
      // 未實現報酬率 = (未實現損益 / 含買進費用的總成本) * 100
      pos.unrealizedPLPercent = pos.totalCost > 0 ? (pos.unrealizedPL / pos.totalCost) * 100 : 0;
      pos.dayChangePercent = changePct;
      pos.dayChangeAmount = currentPrice * (changePct / 100) * pos.shares;

      summary.totalAssets += pos.currentValue;
      summary.totalCost += pos.totalCost;
      summary.dayPL += pos.dayChangeAmount;
      
      positions.push(pos);
    }
  });

  // 總報酬率同樣以「總投入成本(含費)」為基準
  summary.totalPL = summary.totalAssets - summary.totalCost;
  summary.totalPLPercent = summary.totalCost > 0 ? (summary.totalPL / summary.totalCost) * 100 : 0;

  positions.sort((a, b) => b.currentValue - a.currentValue);
  const history = [...processedTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { positions, summary, processedTransactions: history };
};