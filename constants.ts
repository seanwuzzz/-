
import { Transaction, StockPrice } from './types';

export const APP_VERSION = "v1.9.2 (SHEET-NAME)";

export const DEMO_PRICES: StockPrice[] = [
  { symbol: '2330', price: 780, changePercent: 1.5, name: '台積電', sector: '半導體', beta: 1.2 },
  { symbol: '2317', price: 145, changePercent: -0.5, name: '鴻海', sector: '電子代工', beta: 1.05 },
  { symbol: '0050', price: 160, changePercent: 0.8, name: '元大台灣50', sector: 'ETF', beta: 1.0 },
  { symbol: '2454', price: 950, changePercent: 2.1, name: '聯發科', sector: 'IC設計', beta: 1.4 },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2023-10-01', symbol: '2330', name: '台積電', type: 'BUY', shares: 1000, price: 550, fee: 200 },
  { id: '2', date: '2023-11-15', symbol: '2317', name: '鴻海', type: 'BUY', shares: 2000, price: 100, fee: 150 },
  { id: '3', date: '2024-01-20', symbol: '0050', name: '元大台灣50', type: 'BUY', shares: 500, price: 130, fee: 50 },
];

export const GAS_SCRIPT_TEMPLATE = `
/**
 * Google Apps Script 後端程式碼 v1.9.2
 * 更新：回傳試算表名稱
 */

/**
 * 抓取個股 Beta 值
 * @param {string} symbol 股票代號 (如 2330)
 * @return {number} Beta 值
 * @customfunction
 */
function GET_YAHOO_BETA(symbol) {
  if (!symbol) return 1;
  var ticker = String(symbol).trim();
  
  // 辨識格式
  var yahooSymbol = ticker;
  var plainSymbol = ticker;
  
  // 台股判斷邏輯
  if (ticker.match(/^\\d+$/)) {
    yahooSymbol = ticker + ".TW";
  } else if (ticker.indexOf('.') !== -1) {
    plainSymbol = ticker.split('.')[0];
  } else {
    yahooSymbol = ticker; // 美股或其他
  }

  // --- 來源 1: GoodInfo (優先 - 針對台股抓取第6個數值) ---
  if (plainSymbol.match(/^\\d+$/)) {
    try {
      var urlGood = "https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID=" + plainSymbol;
      var paramsGood = {
        muteHttpExceptions: true,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
      };
      var htmlGood = UrlFetchApp.fetch(urlGood, paramsGood).getContentText();
      
      // 策略：找到 "Beta" 標題，然後往後抓取數值
      var betaKeyword = "Beta";
      var betaIdx = htmlGood.indexOf(">" + betaKeyword + "<"); 
      if (betaIdx === -1) betaIdx = htmlGood.indexOf(betaKeyword);

      if (betaIdx !== -1) {
        var snippet = htmlGood.substring(betaIdx, betaIdx + 4000);
        var r = />\\s*(-?\\d+\\.\\d+)\\s*</g;
        var foundValues = [];
        var m;
        while ((m = r.exec(snippet)) !== null) {
            foundValues.push(Number(m[1]));
            if (foundValues.length >= 8) break; 
        }
        if (foundValues.length >= 6) {
            return foundValues[5];
        }
      }
    } catch(e) {}
  }

  // --- 來源 2: HiStock 嗨投資 (備援) ---
  if (plainSymbol.match(/^\\d+$/)) {
    try {
      var url2 = "https://histock.tw/stock/" + plainSymbol;
      var params2 = { muteHttpExceptions: true };
      var html2 = UrlFetchApp.fetch(url2, params2).getContentText();
      var idx2 = html2.indexOf("Beta");
      if (idx2 !== -1) {
         var snip2 = html2.substring(idx2, idx2 + 500).replace(/<[^>]+>/g, " ");
         var m2 = snip2.match(/(\\d+\\.\\d+)/);
         if (m2) return Number(m2[1]);
      }
    } catch(e) {}
  }

  // --- 來源 3: Yahoo Finance (通用備援) ---
  try {
    var url = "https://finance.yahoo.com/quote/" + yahooSymbol;
    var params = {
      muteHttpExceptions: true,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
    };
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
  
  // --- GET_NEWS (Google News RSS) ---
  if (action === "GET_NEWS") {
    var symbol = e.parameter.symbol;
    var name = e.parameter.name || "";
    
    var cleanText = function(str) {
      if (!str) return "";
      return str.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\\s+/g, " ").trim();
    };

    var items = [];
    try {
      var rssUrl = "https://news.google.com/rss/search?q=" + encodeURIComponent(name + " " + symbol) + "&hl=zh-TW&gl=TW&ceid=TW:zh-Hant";
      var response = UrlFetchApp.fetch(rssUrl, { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        var document = XmlService.parse(response.getContentText());
        items = document.getRootElement().getChild("channel").getChildren("item");
      }
    } catch (err) {}

    var newsList = [];
    if (items) {
      for (var i = 0; i < Math.min(items.length, 10); i++) {
        var item = items[i];
        var title = cleanText(item.getChildText("title"));
        var source = item.getChild("source") ? item.getChild("source").getText() : "Google News";
        
        if (source.toUpperCase().indexOf("CMONEY") !== -1) continue;

        var pubDate = new Date(item.getChildText("pubDate"));
        var now = new Date();
        var diffHrs = Math.floor((now - pubDate) / 3600000);
        var dateDisplay = diffHrs < 24 ? diffHrs + " 小時前" : (pubDate.getMonth() + 1) + "/" + pubDate.getDate();

        newsList.push({
          title: title,
          url: item.getChildText("link"),
          source: source,
          snippet: cleanText(item.getChildText("description") || "").substring(0, 100) + "...",
          date: dateDisplay,
          _ts: pubDate.getTime()
        });
      }
    }

    // 依時間排序 (新 -> 舊)
    newsList.sort(function(a, b) { return b._ts - a._ts; });

    return ContentService.createTextOutput(JSON.stringify(newsList)).setMimeType(ContentService.MimeType.JSON);
  }

  // --- GET_DATA (Transactions & Prices) ---
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var priceSheet = ss.getSheetByName("Prices");
  var txSheet = ss.getSheetByName("Transactions");

  // REFRESH FORMULAS
  if (action === "REFRESH") {
    if (priceSheet && priceSheet.getLastRow() > 1) {
      var range = priceSheet.getRange(2, 2, priceSheet.getLastRow() - 1, 4); // 更新 B:E 欄位 (價格, 漲跌, 分類, Beta)
      var formulas = range.getFormulas();
      range.clearContent();
      SpreadsheetApp.flush();
      range.setFormulas(formulas);
    }
  }
  
  var txData = [];
  if (txSheet && txSheet.getLastRow() > 1) {
    var rows = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    txData = rows.map(function(r) {
      return { id: String(r[0]), date: r[1], type: r[2], stockSymbol: String(r[3]), stockName: r[4], shares: r[5], pricePerShare: r[6], fees: r[7] };
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
        // 更新該列資料 (Col 2~8): Date, Type, Symbol, Name, Shares, Price, Fee
        // Row index is i + 1
        txSheet.getRange(i + 1, 2, 1, 7).setValues([[
            data.date, 
            data.type, 
            "'" + cleanSymbol, 
            data.stockName, 
            data.shares, 
            data.pricePerShare, 
            data.fees
        ]]);
        
        // 檢查是否需要更新 Price Sheet (如果改了股票代號)
        checkAndAddPriceRow(priceSheet, cleanSymbol);
        
        return createResponse("success");
      }
    }
    return createResponse("not_found");
  }

  // --- CREATE ACTION (Default) ---
  txSheet.appendRow(["'" + data.id, data.date, data.type, "'" + cleanSymbol, data.stockName, data.shares, data.pricePerShare, data.fees]);
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
    priceSheet.getRange(nextRow, 5).setFormula('=GET_YAHOO_BETA(A' + nextRow + ')');
  }
}

function createResponse(status) {
  return ContentService.createTextOutput(JSON.stringify({status: status})).setMimeType(ContentService.MimeType.JSON);
}
`;
