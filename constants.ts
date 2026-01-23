import { Transaction, StockPrice } from './types';

export const APP_VERSION = "v1.7.3 (RSS-CLEAN)";

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
 * Google Apps Script 後端程式碼 v1.7.3
 * 更新：強化文字清理 (cleanText)，修復 HTML 實體編碼錯誤，改進標題切割邏輯。
 */

function doGet(e) {
  var action = e.parameter.action;
  
  // --- GET_NEWS (Google News RSS) ---
  if (action === "GET_NEWS") {
    var symbol = e.parameter.symbol;
    var name = e.parameter.name || "";
    
    // 文字清理工具：去除 HTML 標籤並解碼常見實體
    var cleanText = function(str) {
      if (!str) return "";
      return str.replace(/<[^>]+>/g, " ")     // 移除 HTML 標籤
                .replace(/&nbsp;/g, " ")      // 空格
                .replace(/&quot;/g, '"')      // 雙引號
                .replace(/&apos;/g, "'")      // 單引號
                .replace(/&#39;/g, "'")       // 單引號
                .replace(/&amp;/g, "&")       // & 符號 (最後處理)
                .replace(/\\s+/g, " ")         // 合併多餘空白
                .trim();
    };

    var fetchItems = function(queryStr) {
      var rssUrl = "https://news.google.com/rss/search?q=" + encodeURIComponent(queryStr) + "&hl=zh-TW&gl=TW&ceid=TW:zh-Hant";
      try {
        var response = UrlFetchApp.fetch(rssUrl, { muteHttpExceptions: true });
        if (response.getResponseCode() !== 200) return [];
        var xml = response.getContentText();
        var document = XmlService.parse(xml);
        var root = document.getRootElement();
        var channel = root.getChild("channel");
        return channel.getChildren("item");
      } catch (err) {
        return [];
      }
    };

    // 1. 優先嘗試：名稱 + 代號
    var items = fetchItems(name + " " + symbol);
    
    // 2. 備援機制：查無資料則僅用代號
    if (!items || items.length === 0) {
       items = fetchItems(symbol);
    }
    
    var newsList = [];
    
    try {
      for (var i = 0; i < Math.min(items.length, 10); i++) {
        var item = items[i];
        
        // 讀取原始資料
        var rawTitle = item.getChildText("title"); 
        var link = item.getChildText("link");
        var pubDateStr = item.getChildText("pubDate");
        var rawDesc = item.getChildText("description") || "";
        var sourceElem = item.getChild("source");
        
        // 解析來源
        var source = sourceElem ? cleanText(sourceElem.getText()) : "";
        
        // 解析標題：Google RSS 標題通常是 "新聞標題 - 媒體名稱"
        // 我們使用 lastIndexOf 來確保只切除最後一個 " - "，避免標題內有破折號被誤切
        var title = cleanText(rawTitle);
        var lastDashIndex = title.lastIndexOf(" - ");
        
        if (lastDashIndex !== -1) {
            // 嘗試分離出媒體名稱
            var potentialSource = title.substring(lastDashIndex + 3).trim();
            var potentialTitle = title.substring(0, lastDashIndex).trim();
            
            // 如果 <source> 標籤抓不到，或抓到的跟標題尾端差不多，就使用標題尾端當來源
            if (!source || potentialSource.indexOf(source) !== -1 || source.indexOf(potentialSource) !== -1) {
                source = potentialSource;
            }
            title = potentialTitle;
        }

        // 解析摘要：Description 常常是一團亂的 HTML
        var snippet = cleanText(rawDesc);
        
        // 過濾無意義的摘要
        // 1. 如果摘要跟標題高度重複
        if (snippet.indexOf(title) !== -1) {
             snippet = snippet.replace(title, "").trim();
        }
        // 2. 如果摘要只是媒體名稱或包含 "Google News"
        if (snippet === source || snippet.indexOf("Google News") !== -1 || snippet.indexOf("View Full Coverage") !== -1) {
            snippet = ""; // 清空，前端會隱藏或不顯示
        }
        // 3. 截斷過長摘要
        if (snippet.length > 100) {
            snippet = snippet.substring(0, 100) + "...";
        }

        // 格式化日期
        var pubDate = new Date(pubDateStr);
        var ts = pubDate.getTime();
        var now = new Date();
        var diffMs = now - pubDate;
        var diffMins = Math.floor(diffMs / 60000);
        var diffHrs = Math.floor(diffMs / 3600000);
        var dateDisplay = "";
        
        if (diffMins < 60) {
           dateDisplay = diffMins + " 分鐘前";
        } else if (diffHrs < 24) {
           dateDisplay = diffHrs + " 小時前";
        } else {
           dateDisplay = (pubDate.getMonth() + 1) + "/" + pubDate.getDate();
        }

        newsList.push({
          title: title,
          url: link,
          source: source || "Google News",
          snippet: snippet,
          date: dateDisplay,
          _ts: ts
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify(newsList)).setMimeType(ContentService.MimeType.JSON);
      
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify([{
         title: "解析錯誤", 
         snippet: err.toString(), 
         url: "#", 
         source: "System",
         _ts: 0
       }])).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // --- 原有的 Spreadsheet 邏輯 ---
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var priceSheet = ss.getSheetByName("Prices");
  var txSheet = ss.getSheetByName("Transactions");

  // REFRESH
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
  
  // GET_DATA
  var txData = [];
  if (txSheet && txSheet.getLastRow() > 1) {
    var rows = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 8).getValues();
    txData = rows.map(function(r) {
      return { id: String(r[0]), date: r[1], type: r[2], stockSymbol: String(r[3]), stockName: r[4], shares: r[5], pricePerShare: r[6], fees: r[7] };
    });
  }

  var quotes = [];
  if (priceSheet && priceSheet.getLastRow() > 1) {
    var pRows = priceSheet.getRange(2, 1, priceSheet.getLastRow() - 1, 4).getValues();
    quotes = pRows.map(function(row) {
      return { symbol: String(row[0]).trim(), price: Number(row[1]), changePercent: Number(row[2]), sector: String(row[3] || "未分類") };
    }).filter(function(q) { return q.symbol !== ""; });
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
    priceSheet.getRange(nextRow, 2).setFormula('=GET_TW_PRICE(A' + nextRow + ')');
    priceSheet.getRange(nextRow, 3).setFormula('=GET_STOCK_CHANGE(A' + nextRow + ')');
    priceSheet.getRange(nextRow, 4).setFormula('=getStockSector(A' + nextRow + ')');
  }
  
  return createResponse("success");
}

function createResponse(status) {
  return ContentService.createTextOutput(JSON.stringify({status: status})).setMimeType(ContentService.MimeType.JSON);
}
`;