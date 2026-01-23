// This service is currently disabled as per user request to avoid Gemini AI news fetching.
import { StockNews } from "../types";

export const getStockNews = async (symbol: string, name: string): Promise<StockNews[]> => {
  // Always return empty array, as we are using Google Apps Script RSS instead.
  return [];
};