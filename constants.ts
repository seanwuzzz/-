import { Transaction, StockPrice } from './types';

export const APP_VERSION = "v1.4.2 (HORIZONTAL-HEATMAP)";

export const DEMO_PRICES: StockPrice[] = [
  { symbol: '2330', price: 780, changePercent: 1.5, name: '台績電', sector: '半導體' },
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
 * 功能：資料存取、強制刷新、以及免費新聞 RSS 抓取。
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var priceSheet = ss.getSheetByName("Prices");
  var txSheet = ss.getSheetByName("Transactions");
  
  if (action === "GET_NEWS") {
    var symbol = e.parameter.symbol;
    var name = e.parameter.name || "";
    var query = encodeURIComponent(symbol + " " + name + " 股票 新聞");
    var url = "https://news.google.com/rss/search?q=" + query + "&hl=zh-TW&gl=TW&ceid=TW:zh-Hant";
    
    try {
      var response = UrlFetchApp.fetch(url);
      var xml = response.getContentText();
      var items = xml.split("<item>").slice(1, 5); 
      var news = items.map(function(item) {
        var titleMatch = item.match(/<title>(.*?)<\/title>/);
        var linkMatch = item.match(/<link>(.*?)<\/link>/);
        var sourceMatch = item.match(/<source.*?>(.*?)<\/source>/);
        
        return {
          title: titleMatch ? titleMatch[1].replace("<![CDATA[", "").replace("]]>", "") : "無標題",
          url: linkMatch ? linkMatch[1] : "#",
          source: sourceMatch ? sourceMatch[1] : "新聞來源",
          snippet: "點擊查看詳細內容...",
          date: "最新"
        };
      });
      return ContentService.createTextOutput(JSON.stringify(news)).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (action === "REFRESH") {
    if (priceSheet && priceSheet.getLastRow() > 1) {
      var lastRow = priceSheet.getLastRow();
      var range = priceSheet.getRange(2, 2, lastRow - 1, 2); 
      var currentFormulas = range.getFormulas();
      range.clearContent();
      SpreadsheetApp.flush();
      range.setFormulas(currentFormulas);
      priceSheet.getRange("E1").setValue("最後刷新: " + new Date().toLocaleString());
      SpreadsheetApp.flush();
    }
  }
  
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
    quotes = pRows.map(function(row) {
      return {
        symbol: String(row[0]).trim(),
        price: Number(row[1]),
        changePercent: Number(row[2]),
        sector: String(row[3] || "未分類")
      };
    }).filter(q => q.symbol !== "");
  }

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