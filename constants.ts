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
// 此腳本支援新增、讀取以及刪除交易紀錄。

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  var priceSheet = ss.getSheetByName("Prices");
  
  var txData = [];
  if (txSheet && txSheet.getLastRow() > 1) {
    var rows = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    txData = rows.map(function(r) {
      return {
        id: String(r[0]), // 強制轉為字串
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
    
    // --- 處理刪除邏輯 ---
    if (data.action === "DELETE") {
      if (txSheet) {
        var idToDelete = String(data.id).trim();
        var rows = txSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          // 強制將工作表中的 ID 也轉為字串並去空白進行比對
          if (String(rows[i][0]).trim() === idToDelete) {
            txSheet.deleteRow(i + 1);
            return ContentService.createTextOutput(JSON.stringify({status: "success", deletedId: idToDelete}))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "找不到該交易 ID: " + data.id}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- 處理新增邏輯 ---
    var cleanSymbol = String(data.stockSymbol).trim();
    
    if (txSheet) {
      txSheet.appendRow([
        "'" + data.id, // ID 前加單引號強制儲存為字串
        data.date, 
        data.type, 
        "'" + cleanSymbol, 
        data.stockName, 
        data.shares, 
        data.pricePerShare, 
        data.fees
      ]);
    }
    
    // 更新價格表邏輯...
    if (priceSheet) {
      var colAValues = priceSheet.getRange("A:A").getValues();
      var exists = false;
      for (var i = 0; i < colAValues.length; i++) {
        if (String(colAValues[i][0]).trim() === cleanSymbol) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        var nextRow = priceSheet.getLastRow() + 1;
        priceSheet.getRange(nextRow, 1).setValue("'" + cleanSymbol);
        priceSheet.getRange(nextRow, 2).setFormula('=IFERROR(GOOGLEFINANCE("TPE:" & A' + nextRow + ', "price"), 0)');
        priceSheet.getRange(nextRow, 3).setFormula('=IFERROR(GOOGLEFINANCE("TPE:" & A' + nextRow + ', "changepct"), 0)');
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