import { Transaction, StockPrice, PortfolioPosition, PortfolioSummary } from '../types';

export const calculatePortfolio = (
  transactions: Transaction[],
  prices: StockPrice[]
): { positions: PortfolioPosition[]; summary: PortfolioSummary } => {
  
  const positionsMap = new Map<string, PortfolioPosition>();

  // 1. Process Transactions
  transactions.forEach(tx => {
    const current = positionsMap.get(tx.symbol) || {
      symbol: tx.symbol,
      name: tx.name, // Initialize with transaction name
      shares: 0,
      totalCost: 0,
      avgCost: 0,
      currentPrice: 0,
      currentValue: 0,
      unrealizedPL: 0,
      unrealizedPLPercent: 0,
      dayChangePercent: 0,
      dayChangeAmount: 0
    };

    // Update name if valid in transaction (in case of empty string in older records)
    if (tx.name) current.name = tx.name;

    if (tx.type === 'BUY') {
      current.shares += tx.shares;
      current.totalCost += (tx.shares * tx.price) + tx.fee;
    } else {
      // Simplified FIFO/Avg cost reduction logic for selling
      if (current.shares > 0) {
        const avgCostPerShare = current.totalCost / current.shares;
        current.shares -= tx.shares;
        current.totalCost -= (tx.shares * avgCostPerShare); 
      }
    }
    
    // Clean up sold out positions
    if(current.shares <= 0) {
        current.shares = 0;
        current.totalCost = 0;
    }

    positionsMap.set(tx.symbol, current);
  });

  // 2. Enrich with Price Data
  const positions: PortfolioPosition[] = [];
  let summary: PortfolioSummary = {
    totalAssets: 0,
    totalCost: 0,
    totalPL: 0,
    totalPLPercent: 0,
    dayPL: 0,
  };

  positionsMap.forEach((pos) => {
    if (pos.shares > 0) {
      const priceData = prices.find(p => p.symbol === pos.symbol);
      const currentPrice = priceData ? priceData.price : 0;
      const changePct = priceData ? priceData.changePercent : 0;
      
      // If price data has a name, it might be more authoritative, but user input is also fine.
      // We stick to user input (pos.name) or fallback to priceData.name if missing
      if (!pos.name && priceData?.name) {
        pos.name = priceData.name;
      }

      pos.avgCost = pos.totalCost / pos.shares;
      pos.currentPrice = currentPrice;
      pos.currentValue = pos.shares * currentPrice;
      pos.unrealizedPL = pos.currentValue - pos.totalCost;
      pos.unrealizedPLPercent = pos.totalCost > 0 ? (pos.unrealizedPL / pos.totalCost) * 100 : 0;
      pos.dayChangePercent = changePct;
      pos.dayChangeAmount = currentPrice * (changePct / 100) * pos.shares;

      summary.totalAssets += pos.currentValue;
      summary.totalCost += pos.totalCost;
      summary.dayPL += pos.dayChangeAmount;
      
      positions.push(pos);
    }
  });

  summary.totalPL = summary.totalAssets - summary.totalCost;
  summary.totalPLPercent = summary.totalCost > 0 ? (summary.totalPL / summary.totalCost) * 100 : 0;

  // Sort by asset value
  positions.sort((a, b) => b.currentValue - a.currentValue);

  return { positions, summary };
};