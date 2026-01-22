import { Transaction, StockPrice } from './types';

export const DEMO_PRICES: StockPrice[] = [
  { symbol: '2330', price: 780, changePercent: 1.5, name: '台積電' },
  { symbol: '2317', price: 145, changePercent: -0.5, name: '鴻海' },
  { symbol: '0050', price: 160, changePercent: 0.8, name: '元大台灣50' },
  { symbol: '2454', price: 950, changePercent: 2.1, name: '聯發科' },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-10-01', symbol: '2330', name: '台積電', type: 'BUY', shares: 1000, price: 550, fee: 200 },
  { id: '2', date: '2023-11-15', symbol: '2317', name: '鴻海', type: 'BUY', shares: 2000, price: 100, fee: 150 },
  { id: '3', date: '2024-01-20', symbol: '0050', name: '元大台灣50', type: 'BUY', shares: 500, price: 130, fee: 50 },
];

export const GAS_SCRIPT_TEMPLATE = `
// Google Apps Script Code
// 此腳本會自動處理 Transactions 寫入。
// 對於 Prices 分頁，它會尋找 A 欄 (Symbol) 第一個空白的列寫入代號，以保留 B/C 欄可能預填的公式。

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  var priceSheet = ss.getSheetByName("Prices");
  
  // 1. 讀取交易紀錄 (Transactions)
  // 欄位順序: ID, Date, Type, Symbol, Name, Shares, Price, Fee
  var txData = [];
  if (txSheet.getLastRow() > 1) {
    var rows = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    txData = rows.map(function(r) {
      return {
        id: r[0], 
        date: r[1], 
        type: r[2], 
        stockSymbol: String(r[3]).trim().toUpperCase(), 
        stockName: r[4], 
        shares: r[5], 
        pricePerShare: r[6], 
        fees: r[7]
      };
    });
  }

  // 2. 讀取現價 (Prices)
  // 欄位順序: Symbol, Price, Change%
  var quotes = [];
  if (priceSheet && priceSheet.getLastRow() > 1) {
    // 讀取直到最後一列，不管是否有空白 (因為使用者可能預填公式)
    var pRows = priceSheet.getRange(2, 1, priceSheet.getLastRow() - 1, 3).getValues();
    
    // 只回傳有 Symbol 的資料
    for(var i=0; i<pRows.length; i++) {
       var row = pRows[i];
       var sym = String(row[0]).trim().toUpperCase();
       if(sym !== "") {
          quotes.push({
            symbol: sym,
            price: Number(row[1]),
            changePercent: Number(row[2])
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
    var cleanSymbol = String(data.stockSymbol).trim().toUpperCase();
    
    // 1. 寫入交易紀錄 (Transactions 總是附加在最後)
    txSheet.appendRow([
      data.id, 
      data.date, 
      data.type, 
      cleanSymbol, 
      data.stockName, 
      data.shares, 
      data.pricePerShare, 
      data.fees
    ]);
    
    // 2. 更新 Prices 分頁 (檢查是否存在，若不存在則填入第一個空白列)
    if (priceSheet) {
      var lastRow = priceSheet.getLastRow();
      var targetRow = -1;
      var exists = false;
      
      // 搜尋現有資料 (範圍: Row 2 到 LastRow)
      if (lastRow > 1) {
        var aValues = priceSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var i = 0; i < aValues.length; i++) {
          var val = String(aValues[i][0]).trim().toUpperCase();
          
          if (val === cleanSymbol) {
            exists = true;
            break;
          }
          
          // 紀錄第一個遇到的 A 欄空白列
          if (val === "" && targetRow === -1) {
             targetRow = i + 2; // +2 因為 i=0 是 Row 2
          }
        }
      }
      
      if (!exists) {
        // 如果沒有找到空白列，就寫在資料最後面的一列
        if (targetRow === -1) {
           targetRow = lastRow + 1;
        }

        // 寫入代號
        priceSheet.getRange(targetRow, 1).setValue(cleanSymbol);
        
        // 檢查 B 欄 (Price) 是否有公式，若無則補上
        var cellB = priceSheet.getRange(targetRow, 2);
        if (!cellB.getFormula() && cellB.getValue() === "") {
             cellB.setFormula('=IFERROR(GOOGLEFINANCE("TPE:" & A' + targetRow + ', "price"), 0)');
        }
        
        // 檢查 C 欄 (Change) 是否有公式，若無則補上
        var cellC = priceSheet.getRange(targetRow, 3);
        if (!cellC.getFormula() && cellC.getValue() === "") {
             cellC.setFormula('=IFERROR(GOOGLEFINANCE("TPE:" & A' + targetRow + ', "changepct"), 0)');
        }
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