
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
  
  // --- 日期邏輯更新 ---
  // 定義 "Reporting Date"：若當前時間 < 08:30，則視為 "昨日" (交易日尚未切換)
  const now = new Date();
  // 檢查是否早於 08:30
  if (now.getHours() < 8 || (now.getHours() === 8 && now.getMinutes() < 30)) {
    now.setDate(now.getDate() - 1);
  }
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let totalRealizedPL = 0;
  let totalDayRealizedPL = 0;
  let daySettlementAmount = 0; // 今日交割金額試算

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
      totalDividend: 0,
      sector: '未分類',
      beta: 1
    };

    if (tx.name) current.name = tx.name;

    // 計算交易淨額
    let netTransactionAmount = 0;
    
    if (tx.type === 'BUY') {
        netTransactionAmount = (tx.shares * tx.price) + tx.fee;
    } else if (tx.type === 'SELL') {
        netTransactionAmount = (tx.shares * tx.price) - tx.fee;
    } else if (tx.type === 'DIVIDEND') {
        netTransactionAmount = (tx.shares * tx.price) - tx.fee; // 股利收入 = (股數 * 配息) - 匯費
    }

    const processedTx: ProcessedTransaction = { 
      ...tx, 
      totalAmount: netTransactionAmount,
      notes: tx.notes
    };

    // 計算今日資金流向 (買進=流出, 賣出=流入)
    // 修正: 股利不計入 T+2 交割試算，因為通常是現金直接入帳，不影響交割款
    if (tx.date === todayStr) {
        if (tx.type === 'BUY') {
            daySettlementAmount += netTransactionAmount;
        } else if (tx.type === 'SELL') {
            // SELL 資金流入 (負數代表流入)
            daySettlementAmount -= netTransactionAmount;
        }
    }

    // 初始化 Buy Queue
    if (!buyQueues.has(symbol)) {
        buyQueues.set(symbol, []);
    }
    const queue = buyQueues.get(symbol)!;

    if (tx.type === 'BUY') {
      current.shares += tx.shares;
      current.totalCost += netTransactionAmount;
      current.avgCost = current.shares > 0 ? current.totalCost / current.shares : 0;
      
      queue.push({
          date: tx.date,
          shares: tx.shares,
          price: tx.price,
          fee: tx.fee,
          initialShares: tx.shares
      });

    } else if (tx.type === 'DIVIDEND') {
        // 股利邏輯：不影響持股數與平均成本，直接計入已實現損益
        current.realizedPL += netTransactionAmount;
        current.totalDividend += netTransactionAmount;
        totalRealizedPL += netTransactionAmount;
        
        // 股利交易也視為一種 "已實現損益"
        processedTx.realizedPL = netTransactionAmount;

        if (tx.date === todayStr) {
            totalDayRealizedPL += netTransactionAmount;
        }

    } else {
      // SELL 邏輯 (FIFO)
      if (current.shares > 0) {
        let sharesToSell = tx.shares;
        
        let totalFifoCostBasis = 0; 
        let weightedBuyPriceSum = 0;
        let totalMatchedShares = 0;
        
        let firstBuyDate = '';
        
        while (sharesToSell > 0 && queue.length > 0) {
            const lot = queue[0];
            const take = Math.min(sharesToSell, lot.shares);
            
            const proratedBuyFee = (take / lot.initialShares) * lot.fee;
            const lotCost = (take * lot.price) + proratedBuyFee;
            
            totalFifoCostBasis += lotCost;
            weightedBuyPriceSum += (lot.price * take);
            totalMatchedShares += take;
            
            if (!firstBuyDate) firstBuyDate = lot.date;

            lot.shares -= take;
            sharesToSell -= take;
            
            if (lot.shares <= 0.000001) {
                queue.shift();
            }
        }
        
        const revenue = netTransactionAmount; 
        const realizedGainLoss = revenue - totalFifoCostBasis;

        current.realizedPL += realizedGainLoss;
        totalRealizedPL += realizedGainLoss;
        processedTx.realizedPL = realizedGainLoss;

        if (tx.date === todayStr) {
            totalDayRealizedPL += realizedGainLoss;
        }

        current.shares -= tx.shares;
        current.totalCost -= totalFifoCostBasis; 
        
        if (current.shares > 0) {
            current.avgCost = current.totalCost / current.shares;
        } else {
            current.avgCost = 0;
            current.totalCost = 0;
        }

        // 產生 Closed Trade 紀錄
        if (totalMatchedShares > 0) {
            const avgBuyPrice = weightedBuyPriceSum / totalMatchedShares;
            const proportion = totalMatchedShares / tx.shares;
            const tradeRevenue = revenue * proportion;
            const tradePL = tradeRevenue - totalFifoCostBasis;
            const roi = totalFifoCostBasis > 0 ? (tradePL / totalFifoCostBasis) * 100 : 0;
            
            const sellTime = new Date(tx.date).getTime();
            const buyTime = new Date(firstBuyDate).getTime();
            const holdDays = Math.ceil((sellTime - buyTime) / (1000 * 60 * 60 * 24));

            closedTrades.push({
                id: tx.id,
                symbol: tx.symbol,
                name: tx.name,
                sellDate: tx.date,
                buyDate: firstBuyDate,
                shares: totalMatchedShares,
                avgBuyPrice: avgBuyPrice,
                sellPrice: tx.price,
                realizedPL: tradePL,
                roi: roi,
                holdDays: Math.max(0, holdDays),
                notes: tx.notes
            });
        }
      }
    }
    
    if(current.shares <= 0.001) {
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
    dayRealizedPL: totalDayRealizedPL, 
    daySettlementAmount: daySettlementAmount,
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

    // 只要有持股，或者雖然股數為0但有已實現損益(含股利)，都可能需要顯示 (視需求而定，目前邏輯是只顯示持倉)
    // 但因為計算 Summary 需要包含所有實現損益，所以已經在 totalRealizedPL 處理了
    if (pos.shares > 0) {
      pos.currentPrice = currentPrice;
      pos.currentValue = pos.shares * currentPrice;
      pos.unrealizedPL = pos.currentValue - pos.totalCost;
      pos.unrealizedPLPercent = pos.totalCost > 0 ? (pos.unrealizedPL / pos.totalCost) * 100 : 0;
      pos.dayChangePercent = changePct;
      
      const changeRate = changePct / 100;
      const prevClose = (1 + changeRate) !== 0 ? currentPrice / (1 + changeRate) : currentPrice;
      
      let dayChangeAmount = 0;
      const queue = buyQueues.get(pos.symbol) || [];

      queue.forEach(lot => {
          if (lot.shares > 0) {
              if (lot.date === todayStr) {
                  // 如果交易日期也是 todayStr (08:30前算昨日)，這裡就會正確對應
                  // 但注意: StockPrice 的 changePercent 通常是交易所的 "昨日收盤價" vs "目前價"
                  // 如果是 08:30 前，交易所尚未開盤，changePercent 可能是 0 或昨日的漲跌
                  // 這裡保持原本邏輯，主要依賴 stockPrice API 的回傳
                  dayChangeAmount += (currentPrice - lot.price) * lot.shares;
              } else {
                  dayChangeAmount += (currentPrice - prevClose) * lot.shares;
              }
          }
      });
      
      pos.dayChangeAmount = dayChangeAmount;

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
  
  closedTrades.sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());

  return { positions, summary, processedTransactions: history, closedTrades };
};
