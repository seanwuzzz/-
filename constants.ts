import { Transaction, StockPrice } from './types';

export const DEMO_PRICES: StockPrice[] = [
  { symbol: '2330', price: 780, changePercent: 1.5, name: '台積電', sector: '半導體' },
  { symbol: '2317', price: 145, changePercent: -0.5, name: '鴻海', sector: '電子代工' },
  { symbol: '0050', price: 160, changePercent: 0.8, name: '元大台灣50', sector: 'ETF' },
  { symbol: '2454', price: 950, changePercent: 2.1, name: '聯發科', sector: 'IC設計' },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-10-01', symbol: '2330', name: '台積電', type: 'BUY', shares: 1000, price: 550, fee: 200 },
  { id: '2', date: '2023-11-15', symbol: '2317', name: '鴻海', type: 'BUY', shares: 2000, price: 100, fee: 150 },
  { id: '3', date: '2024-01-20', symbol: '0050', name: '元大台灣50', type: 'BUY', shares: 500, price: 130, fee: 50 },
];

export const GAS_SCRIPT_TEMPLATE = `
/**
 * Google Apps Script 後端程式碼
 * 功能：提供資料存取介面，並支援強制重新計算 Google Sheets 公式。
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var priceSheet = ss.getSheetByName("Prices");
  var txSheet = ss.getSheetByName("Transactions");
  
  // --- 強制刷新機制 (關鍵點：清除並重寫公式以打破快取) ---
  if (action === "REFRESH") {
    if (priceSheet && priceSheet.getLastRow() > 1) {
      var lastRow = priceSheet.getLastRow();
      // 選取 B, C 欄 (價格、漲跌)
      var range = priceSheet.getRange(2, 2, lastRow - 1, 2); 
      var currentFormulas = range.getFormulas();
      
      // 1. 先清空內容
      range.clearContent();
      SpreadsheetApp.flush();
      
      // 2. 重新寫入公式，這會迫使 GOOGLEFINANCE 重新抓取
      range.setFormulas(currentFormulas);
      
      // 更新 E1 作為刷新時間標記
      priceSheet.getRange("E1").setValue("最後強制刷新: " + new Date().toLocaleString());
      
      SpreadsheetApp.flush();
      Utilities.sleep(1000); // 給予 Sheets 一些緩衝時間處理外部 API
    }
  }
  
  // --- 獲取交易資料 ---
  var txData = [];
  if (txSheet && txSheet.getLastRow() > 1) {
    var rows = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    txData = rows.map(function(r) {
      return {
        id: String(r[0]),
        date: r[1], 
        type: r[2], 
        stockSymbol: String(r[3]), 
        stockName: r[4], 
        shares: r[5], 
        pricePerShare: r[6], 
        fees: r[7]
      };
    });
  }

  // --- 獲取股價資料 ---
  var quotes = [];
  if (priceSheet && priceSheet.getLastRow() > 1) {
    var pRows = priceSheet.getRange(2, 1, priceSheet.getLastRow() - 1, 4).getValues();
    quotes = pRows.map(function(row) {
      return {
        symbol: String(row[0]).trim(),
        price: Number(row[1]),
        changePercent: Number(row[2]),
        sector: String(row[3] || "未分類")
      };
    }).filter(q => q.symbol !== "");
  }

  // 確保回傳正確的 CORS 標頭 (ContentService 自動處理)
  return ContentService.createTextOutput(JSON.stringify({
    transactions: txData,
    quotes: quotes,
    serverTime: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  var priceSheet = ss.getSheetByName("Prices");
  var data = JSON.parse(e.postData.contents);
  
  if (data.action === "DELETE") {
    if (!txSheet) return createResponse("error");
    var idToDelete = String(data.id).trim();
    var rows = txSheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === idToDelete) {
        txSheet.deleteRow(i + 1);
        return createResponse("success");
      }
    }
    return createResponse("not_found");
  }

  var cleanSymbol = String(data.stockSymbol).trim();
  txSheet.appendRow(["'" + data.id, data.date, data.type, "'" + cleanSymbol, data.stockName, data.shares, data.pricePerShare, data.fees]);
  
  var colA = priceSheet.getRange("A:A").getValues();
  var exists = false;
  for(var i=0; i<colA.length; i++) {
    if (String(colA[i][0]).trim() === cleanSymbol) { exists = true; break; }
  }
  
  if (!exists) {
    var nextRow = priceSheet.getLastRow() + 1;
    priceSheet.getRange(nextRow, 1).setValue("'" + cleanSymbol);
    priceSheet.getRange(nextRow, 2).setFormula('=GOOGLEFINANCE(A' + nextRow + ', "price")');
    priceSheet.getRange(nextRow, 3).setFormula('=GOOGLEFINANCE(A' + nextRow + ', "changepct")/100');
    priceSheet.getRange(nextRow, 4).setValue("未分類");
  }
  
  return createResponse("success");
}

function createResponse(status) {
  return ContentService.createTextOutput(JSON.stringify({status: status})).setMimeType(ContentService.MimeType.JSON);
}
`;