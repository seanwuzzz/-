
import { Transaction, StockPrice } from './types';

export const APP_VERSION = "v1.9.4 (News Fix)";

export const DEMO_PRICES: StockPrice[] = [
  { symbol: '2330', price: 780, changePercent: 1.5, name: '台積電', sector: '半導體', beta: 1.2 },
  { symbol: '2317', price: 145, changePercent: -0.5, name: '鴻海', sector: '電子代工', beta: 1.05 },
  { symbol: '0050', price: 160, changePercent: 0.8, name: '元大台灣50', sector: 'ETF', beta: 1.0 },
  { symbol: '2454', price: 950, changePercent: 2.1, name: '聯發科', sector: 'IC設計', beta: 1.4 },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-10-01', symbol: '2330', name: '台積電', type: 'BUY', shares: 1000, price: 550, fee: 200, notes: '看好先進製程領先優勢' },
  { id: '2', date: '2023-11-15', symbol: '2317', name: '鴻海', type: 'BUY', shares: 2000, price: 100, fee: 150 },
  { id: '3', date: '2024-01-20', symbol: '0050', name: '元大台灣50', type: 'BUY', shares: 500, price: 130, fee: 50 },
];

export const GAS_SCRIPT_TEMPLATE = `
/**
 * Google Apps Script 後端程式碼 v1.9.4
 * 更新：修復新聞查詢功能 (Google News RSS)
 */

function GET_YAHOO_BETA(symbol) {
  if (!symbol) return 1;
  var ticker = String(symbol).trim();
  var yahooSymbol = ticker;
  var plainSymbol = ticker;
  
  if (ticker.match(/^\\d+$/)) {
    yahooSymbol = ticker + ".TW";
  } else if (ticker.indexOf('.') !== -1) {
    plainSymbol = ticker.split('.')[0];
  }

  // GoodInfo
  if (plainSymbol.match(/^\\d+$/)) {
    try {
      var urlGood = "https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID=" + plainSymbol;
      var paramsGood = { muteHttpExceptions: true, headers: { "User-Agent": "Mozilla/5.0" } };
      var htmlGood = UrlFetchApp.fetch(urlGood, paramsGood).getContentText();
      var betaIdx = htmlGood.indexOf("Beta");
      if (betaIdx !== -1) {
        var snippet = htmlGood.substring(betaIdx, betaIdx + 4000);
        var r = />\\s*(-?\\d+\\.\\d+)\\s*</g;
        var foundValues = [];
        var m;
        while ((m = r.exec(snippet)) !== null) {
            foundValues.push(Number(m[1]));
            if (foundValues.length >= 8) break; 
        }
        if (foundValues.length >= 6) return foundValues[5];
      }
    } catch(e) {}
  }

  // Yahoo Finance Backup
  try {
    var url = "https://finance.yahoo.com/quote/" + yahooSymbol;
    var params = { muteHttpExceptions: true, headers: { "User-Agent": "Mozilla/5.0" } };
    var html = UrlFetchApp.fetch(url, params).getContentText();
    var idx3 = html.indexOf("Beta (5Y Monthly)");
    if (idx3 !== -1) {
       var snip3 = html.substring(idx3, idx3 + 500).replace(/<[^>]+>/g, " ");
       var m3 = snip3.match(/(\\d+\\.\\d+)/);
       if (m3) return Number(m3[1]);
    }
  } catch (e) {}

  return 1;
}

function doGet(e) {
  var action = e.parameter.action;
  
  // --- GET_NEWS ---
  if (action === "GET_NEWS") {
    var symbol = e.parameter.symbol;
    var name = e.parameter.name || "";
    var query = symbol + " " + name;
    
    // 使用 Google News RSS 搜尋
    var rssUrl = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=zh-TW&gl=TW&ceid=TW:zh-Hant";
    
    try {
      var xml = UrlFetchApp.fetch(rssUrl).getContentText();
      var doc = XmlService.parse(xml);
      var root = doc.getRootElement();
      var channel = root.getChild("channel");
      var items = channel.getChildren("item");
      var newsList = [];
      
      // 取前 8 則
      var limit = Math.min(items.length, 8);
      for (var i = 0; i < limit; i++) {
        var item = items[i];
        var title = item.getChildText("title");
        var link = item.getChildText("link");
        var pubDate = item.getChildText("pubDate");
        var sourceNode = item.getChild("source");
        var source = sourceNode ? sourceNode.getText() : "Google News";
        var description = item.getChildText("description") || "";
        
        // 簡單移除 HTML 標籤
        var snippet = description.replace(/<[^>]+>/g, "").substring(0, 100) + "...";
        
        // 格式化日期 MM/DD HH:mm
        var d = new Date(pubDate);
        var formattedDate = (d.getMonth() + 1) + "/" + d.getDate() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

        newsList.push({
          title: title,
          url: link,
          source: source,
          date: formattedDate,
          snippet: snippet,
          _ts: d.getTime()
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify(newsList)).setMimeType(ContentService.MimeType.JSON);
    } catch (e) {
      // 失敗回傳空陣列
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // --- GET_DATA ---
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var priceSheet = ss.getSheetByName("Prices");
  var txSheet = ss.getSheetByName("Transactions");

  if (action === "REFRESH") {
    if (priceSheet && priceSheet.getLastRow() > 1) {
      var range = priceSheet.getRange(2, 2, priceSheet.getLastRow() - 1, 4);
      var formulas = range.getFormulas();
      range.clearContent();
      SpreadsheetApp.flush();
      range.setFormulas(formulas);
    }
  }
  
  var txData = [];
  if (txSheet && txSheet.getLastRow() > 1) {
    // Read 9 columns (A-I)
    var rows = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 9).getValues();
    txData = rows.map(function(r) {
      return { 
        id: String(r[0]), 
        date: r[1], 
        type: r[2], 
        stockSymbol: String(r[3]), 
        stockName: r[4], 
        shares: r[5], 
        pricePerShare: r[6], 
        fees: r[7],
        notes: r[8] || "" // Col 9 is Notes
      };
    });
  }

  var quotes = [];
  if (priceSheet && priceSheet.getLastRow() > 1) {
    var pRows = priceSheet.getRange(2, 1, priceSheet.getLastRow() - 1, 5).getValues();
    quotes = pRows.map(function(row) {
      return { 
          symbol: String(row[0]).trim(), 
          price: Number(row[1]), 
          changePercent: Number(row[2]), 
          sector: String(row[3] || "未分類"),
          beta: Number(row[4] || 1)
      };
    }).filter(function(q) { return q.symbol !== ""; });
  }

  return ContentService.createTextOutput(JSON.stringify({
    transactions: txData,
    quotes: quotes,
    sheetName: ss.getName(),
    serverTime: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheet = ss.getSheetByName("Transactions");
  var priceSheet = ss.getSheetByName("Prices");
  var data = JSON.parse(e.postData.contents);
  var cleanSymbol = String(data.stockSymbol).trim();
  
  // --- DELETE ACTION ---
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

  // --- UPDATE ACTION ---
  if (data.action === "UPDATE") {
    var idToUpdate = String(data.id).trim();
    var rows = txSheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === idToUpdate) {
        // 更新該列資料 (Col 2~9)
        txSheet.getRange(i + 1, 2, 1, 8).setValues([[
            data.date, 
            data.type, 
            "'" + cleanSymbol, 
            data.stockName, 
            data.shares, 
            data.pricePerShare, 
            data.fees,
            data.notes || ""
        ]]);
        
        checkAndAddPriceRow(priceSheet, cleanSymbol);
        return createResponse("success");
      }
    }
    return createResponse("not_found");
  }

  // --- CREATE ACTION ---
  // Append 9 columns
  txSheet.appendRow([
    "'" + data.id, 
    data.date, 
    data.type, 
    "'" + cleanSymbol, 
    data.stockName, 
    data.shares, 
    data.pricePerShare, 
    data.fees,
    data.notes || ""
  ]);
  checkAndAddPriceRow(priceSheet, cleanSymbol);
  
  return createResponse("success");
}

function checkAndAddPriceRow(priceSheet, cleanSymbol) {
  var colA = priceSheet.getRange("A:A").getValues();
  var exists = false;
  for(var i=0; i<colA.length; i++) {
    if (String(colA[i][0]).trim() === cleanSymbol) { exists = true; break; }
  }
  
  if (!exists) {
    var nextRow = priceSheet.getLastRow() + 1;
    priceSheet.getRange(nextRow, 1).setValue("'" + cleanSymbol);
    priceSheet.getRange(nextRow, 2).setFormula('=GET_TW_PRICE(A' + nextRow + ')');
    priceSheet.getRange(nextRow, 3).setFormula('=GET_STOCK_CHANGE(A' + nextRow + ')');
    priceSheet.getRange(nextRow, 4).setFormula('=getStockSector(A' + nextRow + ')');
    priceSheet.getRange(nextRow, 5).setFormula('=BETA_6M(A' + nextRow + ')');
  }
}

function createResponse(status) {
  return ContentService.createTextOutput(JSON.stringify({status: status})).setMimeType(ContentService.MimeType.JSON);
}
`;