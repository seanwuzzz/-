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
// 此腳本會在每次被調用時讀取試算表當前的數值。
// 注意：Google Sheets 的內建公式（如 GOOGLEFINANCE）可能會有 20 分鐘延遲。

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- 處理強制刷新與記錄時間戳記 ---
  if (action === "REFRESH") {
    var priceSheet = ss.getSheetByName("Prices");
    if (priceSheet) {
      // 在 E1:E2 記錄最後刷新時間，這也會觸發試算表的重新計算
      priceSheet.getRange("E1").setValue("最後刷新時間 (App)");
      priceSheet.getRange("E2").setValue(new Date());
      SpreadsheetApp.flush(); // 強制套用變更
    }
  }
  
  // --- 處理新聞抓取 (Yahoo Finance via Google RSS Proxy) ---
  if (action === "GET_NEWS") {
    var symbol = e.parameter.symbol;
    if (!symbol) return createJsonOutput({error: "Missing symbol"});
    
    try {
      var query = "site:tw.stock.yahoo.com " + symbol;
      var url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=zh-TW&gl=TW&ceid=TW:zh-Hant";
      var response = UrlFetchApp.fetch(url);
      var xml = response.getContentText();
      var document = XmlService.parse(xml);
      var root = document.getRootElement();
      var channel = root.getChild('channel');
      var items = channel.getChildren('item');
      
      var news = [];
      for (var i = 0; i < Math.min(items.length, 3); i++) {
        var item = items[i];
        var fullTitle = item.getChildText('title');
        var titleParts = fullTitle.split(" - ");
        var source = "Yahoo 股市"; 
        var title = titleParts.join(" - ");
        
        news.push({
          title: title,
          url: item.getChildText('link'),
          source: source,
          date: item.getChildText('pubDate'),
          snippet: "點擊查看 Yahoo 股市即時分析內容..."
        });
      }
      return createJsonOutput(news);
    } catch (err) {
      return createJsonOutput({error: err.toString()});
    }
  }

  // --- 獲取交易與價格資料 ---
  var txSheet = ss.getSheetByName("Transactions");
  var priceSheet = ss.getSheetByName("Prices");
  
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

  return createJsonOutput({
    transactions: txData,
    quotes: quotes,
    serverTime: new Date().toISOString()
  });
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  var priceSheet = ss.getSheetByName("Prices");
  
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "DELETE") {
      if (txSheet) {
        var idToDelete = String(data.id).trim();
        var rows = txSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (String(rows[i][0]).trim() === idToDelete) {
            txSheet.deleteRow(i + 1);
            return createJsonOutput({status: "success", deletedId: idToDelete});
          }
        }
      }
      return createJsonOutput({status: "error", message: "ID not found"});
    }

    var cleanSymbol = String(data.stockSymbol).trim();
    if (txSheet) {
      txSheet.appendRow(["'" + data.id, data.date, data.type, "'" + cleanSymbol, data.stockName, data.shares, data.pricePerShare, data.fees]);
    }
    
    if (priceSheet) {
      var colAValues = priceSheet.getRange("A:A").getValues();
      var exists = false;
      for (var i = 0; i < colAValues.length; i++) {
        if (String(colAValues[i][0]).trim() === cleanSymbol) { exists = true; break; }
      }
      if (!exists) {
        var nextRow = priceSheet.getLastRow() + 1;
        priceSheet.getRange(nextRow, 1).setValue("'" + cleanSymbol);
        priceSheet.getRange(nextRow, 2).setFormula('GET_TW_PRICE(A' + nextRow + ')');
        priceSheet.getRange(nextRow, 3).setFormula('GET_STOCK_CHANGE(A' + nextRow + ')');
        priceSheet.getRange(nextRow, 4).setFormula('getStockSector(A' + nextRow + ')');
      }
    }
    return createJsonOutput({status: "success"});
  } catch (err) {
    return createJsonOutput({status: "error", message: err.toString()});
  }
}

function createJsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
`;