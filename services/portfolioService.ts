
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
  
  // 取得今日日期的字串 (YYYY-MM-DD)，使用本地時間
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let totalRealizedPL = 0;
  let totalDayRealizedPL = 0;

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
      // 1. 更新 Position (增加成本與股數)
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
      // SELL 邏輯 (全面改用 FIFO 計算)
      if (current.shares > 0) {
        let sharesToSell = tx.shares;
        
        // 用於計算此筆賣單的總成本 (FIFO Cost Basis)
        let totalFifoCostBasis = 0; 
        let weightedBuyPriceSum = 0;
        let totalMatchedShares = 0;
        
        // 記錄最早的買入日期
        let firstBuyDate = '';
        
        // 開始從 Queue 中扣除庫存
        while (sharesToSell > 0 && queue.length > 0) {
            const lot = queue[0];
            const take = Math.min(sharesToSell, lot.shares);
            
            // 計算這部分股數的原始成本 (含手續費)
            // 手續費按當初買入比例分攤: (take / lot.initialShares) * lot.fee
            const proratedBuyFee = (take / lot.initialShares) * lot.fee;
            const lotCost = (take * lot.price) + proratedBuyFee;
            
            totalFifoCostBasis += lotCost;
            weightedBuyPriceSum += (lot.price * take);
            totalMatchedShares += take;
            
            if (!firstBuyDate) firstBuyDate = lot.date;

            // 更新 Queue 狀態
            lot.shares -= take;
            sharesToSell -= take;
            
            // 如果這批貨賣完了，移出 Queue
            if (lot.shares <= 0.000001) { // 浮點數安全檢查
                queue.shift();
            }
        }

        // --- 核心修改：使用 FIFO 成本來計算已實現損益 ---
        // 注意：如果賣出股數 > 庫存 (sharesToSell > 0)，多出的部分無法計算成本，這裡假設成本為 0 (或可視為放空)
        // 為了避免數據異常，我們只計算有配對到的部分，或者如果完全沒配對到(例如資料錯誤)，則無法計算準確損益。
        
        // 該筆交易的收入 (已扣除賣出手續費)
        const revenue = netTransactionAmount; 
        
        // 已實現損益 = 賣出淨收入 - FIFO 買入總成本
        // 若有未配對到的股數(資料異常)，依比例扣除成本可能不準，但此處假設資料大致正確
        const realizedGainLoss = revenue - totalFifoCostBasis;

        // 更新數據
        current.realizedPL += realizedGainLoss;
        totalRealizedPL += realizedGainLoss;
        processedTx.realizedPL = realizedGainLoss;

        if (tx.date === todayStr) {
            totalDayRealizedPL += realizedGainLoss;
        }

        // 更新持倉：扣除股數與成本
        // 這裡的重要改變：總成本是減去「被賣掉的那批貨的真實成本」，而不是按比例減少
        // 這會導致剩餘持倉的平均成本發生變化 (通常在多頭市場賣出舊股票後，剩餘成本會變高)
        current.shares -= tx.shares;
        current.totalCost -= totalFifoCostBasis; 
        
        // 重新計算平均成本 (剩餘總成本 / 剩餘股數)
        if (current.shares > 0) {
            current.avgCost = current.totalCost / current.shares;
        } else {
            current.avgCost = 0;
            current.totalCost = 0; // 歸零確保無殘值
        }

        // 產生 Closed Trade 紀錄
        if (totalMatchedShares > 0) {
            const avgBuyPrice = weightedBuyPriceSum / totalMatchedShares;
            // 由於 closedTrade 可能只代表交易的一部分 (如果有未配對)，這裡依比例計算
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
                holdDays: Math.max(0, holdDays)
            });
        }
      }
    }
    
    // 防禦性歸零 (處理浮點數誤差)
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
      // 這裡的 totalCost 已經是經過 FIFO 扣除後的「剩餘庫存成本」
      pos.unrealizedPL = pos.currentValue - pos.totalCost;
      pos.unrealizedPLPercent = pos.totalCost > 0 ? (pos.unrealizedPL / pos.totalCost) * 100 : 0;
      pos.dayChangePercent = changePct;
      
      // --- 精確計算今日損益 (FIFO Queue 剩餘部分) ---
      const changeRate = changePct / 100;
      const prevClose = (1 + changeRate) !== 0 ? currentPrice / (1 + changeRate) : currentPrice;
      
      let dayChangeAmount = 0;
      const queue = buyQueues.get(pos.symbol) || [];

      queue.forEach(lot => {
          if (lot.shares > 0) {
              if (lot.date === todayStr) {
                  // A. 今日買入
                  dayChangeAmount += (currentPrice - lot.price) * lot.shares;
              } else {
                  // B. 舊庫存 (相對於昨日收盤價)
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
