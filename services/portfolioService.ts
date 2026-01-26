
import { Transaction, ProcessedTransaction, StockPrice, PortfolioPosition, PortfolioSummary, ClosedTrade } from '../types';

interface BuyLot {
  date: string;
  shares: number;
  price: number;
  fee: number;
  initialShares: number; // 用於計算手續費比例
}

export const calculatePortfolio = (
  transactions: Transaction[],
  prices: StockPrice[]
): { 
  positions: PortfolioPosition[]; 
  summary: PortfolioSummary; 
  processedTransactions: ProcessedTransaction[];
  closedTrades: ClosedTrade[];
} => {
  
  const positionsMap = new Map<string, PortfolioPosition>();
  const buyQueues = new Map<string, BuyLot[]>(); // FIFO Queue for each stock
  const closedTrades: ClosedTrade[] = [];
  
  let totalRealizedPL = 0;
  const processedTransactions: ProcessedTransaction[] = [];

  const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTxs.forEach(tx => {
    const symbol = tx.symbol.trim();
    
    // 初始化 Position
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

    // 初始化 Buy Queue
    if (!buyQueues.has(symbol)) {
        buyQueues.set(symbol, []);
    }
    const queue = buyQueues.get(symbol)!;

    if (tx.type === 'BUY') {
      // 1. 更新 Position
      current.shares += tx.shares;
      current.totalCost += netTransactionAmount;
      current.avgCost = current.shares > 0 ? current.totalCost / current.shares : 0;
      
      // 2. 加入 Queue (FIFO)
      queue.push({
          date: tx.date,
          shares: tx.shares,
          price: tx.price,
          fee: tx.fee,
          initialShares: tx.shares
      });

    } else {
      // SELL 邏輯
      if (current.shares > 0) {
        // 1. 更新 Position (簡單加權平均邏輯)
        const costOfSoldSharesPos = current.avgCost * tx.shares;
        const gainLossPos = netTransactionAmount - costOfSoldSharesPos;
        
        current.realizedPL += gainLossPos;
        totalRealizedPL += gainLossPos;
        processedTx.realizedPL = gainLossPos;

        current.shares -= tx.shares;
        current.totalCost = current.shares * current.avgCost; // 剩餘成本依比例減少

        // 2. 處理 Closed Trade (FIFO 邏輯)
        let sharesToSell = tx.shares;
        let accumulatedCost = 0;
        let weightedBuyPriceSum = 0;
        let totalSoldShares = 0; // 實際能配對到的股數 (防禦性)
        
        // 記錄最早的買入日期
        let firstBuyDate = '';
        
        while (sharesToSell > 0 && queue.length > 0) {
            const lot = queue[0];
            const take = Math.min(sharesToSell, lot.shares);
            
            // 計算這部分股數的原始成本 (含手續費)
            // 手續費按比例分攤: (take / lot.initialShares) * lot.fee
            const proratedFee = (take / lot.initialShares) * lot.fee;
            const lotCost = (take * lot.price) + proratedFee;
            
            accumulatedCost += lotCost;
            weightedBuyPriceSum += (lot.price * take);
            totalSoldShares += take;
            
            if (!firstBuyDate) firstBuyDate = lot.date;

            // 更新 Queue
            lot.shares -= take;
            sharesToSell -= take;
            
            // 如果這批貨賣完了，移出 Queue
            if (lot.shares <= 0) {
                queue.shift();
            }
        }

        // 只有當有配對到買入紀錄時才產生 ClosedTrade
        if (totalSoldShares > 0) {
            const avgBuyPrice = weightedBuyPriceSum / totalSoldShares;
            // 賣出總收入 (已扣除賣出手續費)
            // 注意: 這裡的 netTransactionAmount 是整筆賣單的淨收入
            // 如果 sharesToSell > 0 (代表賣超/放空或是資料不全)，我們只需計算有配對到的部分的比例
            const proportion = totalSoldShares / tx.shares;
            const revenue = netTransactionAmount * proportion;
            
            const pnl = revenue - accumulatedCost;
            const roi = accumulatedCost > 0 ? (pnl / accumulatedCost) * 100 : 0;
            
            // 計算持有天數 (賣出日 - 最早買入日)
            const sellTime = new Date(tx.date).getTime();
            const buyTime = new Date(firstBuyDate).getTime();
            const holdDays = Math.ceil((sellTime - buyTime) / (1000 * 60 * 60 * 24));

            closedTrades.push({
                id: tx.id,
                symbol: tx.symbol,
                name: tx.name,
                sellDate: tx.date,
                buyDate: firstBuyDate,
                shares: totalSoldShares,
                avgBuyPrice: avgBuyPrice,
                sellPrice: tx.price,
                realizedPL: pnl,
                roi: roi,
                holdDays: Math.max(0, holdDays)
            });
        }
      }
    }
    
    // 防禦性歸零
    if(current.shares <= 0.001) { // 浮點數誤差容許
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
  
  // 排序 Closed Trades (日期新到舊)
  closedTrades.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());

  return { positions, summary, processedTransactions: history, closedTrades };
};
