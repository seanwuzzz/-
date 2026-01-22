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
// 1. Create a Google Sheet.
// 2. Rename Sheet1 to "Transactions".
//    Headers (Row 1): ID, Date, Type, Symbol, Name, Shares, Price, Fee
// 3. Create Sheet2 named "Prices".
//    Headers: Symbol, Price, Change%
//    - In Prices sheet, Col A is Symbol.
//    - Col B formula: =GOOGLEFINANCE("TPE:" & A2, "price")
//    - Col C formula: =GOOGLEFINANCE("TPE:" & A2, "changepct")
// 4. Extensions > Apps Script. Paste this code.
// 5. Deploy > New Deployment > Web App > Who has access: "Anyone".

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const transSheet = ss.getSheetByName("Transactions");
  const priceSheet = ss.getSheetByName("Prices");
  
  const transactions = transSheet.getDataRange().getValues().slice(1); // Skip header
  const prices = priceSheet.getDataRange().getValues().slice(1); // Skip header
  
  // Map columns based on: ID, Date, Type, Symbol, Name, Shares, Price, Fee
  const data = {
    transactions: transactions.map(row => ({
      id: row[0],
      date: row[1],
      type: row[2],
      symbol: row[3],
      name: row[4],
      shares: row[5],
      price: row[6],
      fee: row[7]
    })),
    prices: prices.map(row => ({
      symbol: row[0],
      price: row[1],
      changePercent: row[2]
    }))
  };
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Transactions");
  const data = JSON.parse(e.postData.contents);
  
  // Generate a simple ID using timestamp if not provided
  const id = new Date().getTime().toString();

  // Append based on: ID, Date, Type, Symbol, Name, Shares, Price, Fee
  sheet.appendRow([
    id,
    data.date,
    data.type,
    data.symbol,
    data.name,
    data.shares,
    data.price,
    data.fee
  ]);
  
  // Ensure the symbol exists in Prices sheet to trigger GoogleFinance
  const priceSheet = ss.getSheetByName("Prices");
  const symbols = priceSheet.getRange("A:A").getValues().flat();
  if (!symbols.includes(data.symbol)) {
    priceSheet.appendRow([data.symbol]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({result: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}
`;