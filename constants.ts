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
// Google Apps Script Code
// 此腳本優化了寫入邏輯，會優先填入 Prices 頁面 A 欄 (Symbol) 的第一個空行。

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  var priceSheet = ss.getSheetByName("Prices");
  
  var txData = [];
  if (txSheet && txSheet.getLastRow() > 1) {
    var rows = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    txData = rows.map(function(r) {
      return {
        id: r[0], 
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

  var quotes = [];
  if (priceSheet && priceSheet.getLastRow() > 1) {
    // 讀取 A:D 欄 (代號, 價格, 漲跌, 產業)
    var pRows = priceSheet.getRange(2, 1, priceSheet.getLastRow() - 1, 4).getValues();
    for(var i=0; i<pRows.length; i++) {
       var row = pRows[i];
       var sym = String(row[0]).trim();
       if(sym !== "") {
          quotes.push({
            symbol: sym,
            price: Number(row[1]),
            changePercent: Number(row[2]),
            sector: String(row[3] || "未分類")
          });
       }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    transactions: txData,
    quotes: quotes
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  var priceSheet = ss.getSheetByName("Prices");
  
  try {
    var data = JSON.parse(e.postData.contents);
    var cleanSymbol = String(data.stockSymbol).trim();
    
    // 1. 寫入交易紀錄 (Transactions 頁面直接附加在末尾)
    if (txSheet) {
      txSheet.appendRow([
        data.id, 
        data.date, 
        data.type, 
        "'" + cleanSymbol, 
        data.stockName, 
        data.shares, 
        data.pricePerShare, 
        data.fees
      ]);
    }
    
    // 2. 更新或新增股票代號 (Prices 頁面)
    if (priceSheet) {
      // 抓取整條 A 欄來搜尋
      var colAValues = priceSheet.getRange("A:A").getValues();
      var exists = false;
      var firstEmptyRow = -1;
      
      for (var i = 0; i < colAValues.length; i++) {
        var cellVal = String(colAValues[i][0]).trim();
        
        // 檢查是否已存在
        if (cellVal === cleanSymbol) {
          exists = true;
          break;
        }
        
        // 尋找第一個 A 欄為空的行 (跳過標題列 i=0)
        if (i > 0 && cellVal === "" && firstEmptyRow === -1) {
          firstEmptyRow = i + 1;
        }
      }
      
      if (!exists) {
        // 如果沒找到中間的空行，就使用 getLastRow() + 1
        var targetRow = firstEmptyRow !== -1 ? firstEmptyRow : (priceSheet.getLastRow() + 1);
        
        // 只寫入代號、價格公式、漲跌公式。產業別留空或由使用者自行輸入。
        priceSheet.getRange(targetRow, 1).setValue("'" + cleanSymbol);
        priceSheet.getRange(targetRow, 2).setFormula('=IFERROR(GOOGLEFINANCE("TPE:" & A' + targetRow + ', "price"), 0)');
        priceSheet.getRange(targetRow, 3).setFormula('=IFERROR(GOOGLEFINANCE("TPE:" & A' + targetRow + ', "changepct"), 0)');
      }
    }

    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;