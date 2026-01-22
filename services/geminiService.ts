import { GoogleGenAI, Type } from "@google/genai";
import { StockNews } from "../types";

export const getStockNews = async (symbol: string, name: string): Promise<StockNews[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // 建立更直接的指令，減少模型猶豫
    const prompt = `Search 3 latest news for Taiwan Stock "${symbol} ${name}". Return ONLY a JSON array with title, snippet, source, url.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        // 關鍵優化：禁用思考預算以降低延遲
        thinkingConfig: { thinkingBudget: 0 },
        // 限制輸出長度以加快傳輸
        maxOutputTokens: 800,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              snippet: { type: Type.STRING },
              source: { type: Type.STRING },
              url: { type: Type.STRING }
            },
            required: ["title", "snippet", "source", "url"]
          }
        }
      },
    });

    const text = response.text || "[]";
    const news = JSON.parse(text) as StockNews[];
    
    // 從 groundingMetadata 補全連結 (如果搜尋結果中已有)
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    if (news.length > 0 && chunks.length > 0) {
        news.forEach((item, idx) => {
            if (!item.url && chunks[idx]?.web?.uri) {
                item.url = chunks[idx].web.uri;
            }
        });
    }

    return news.slice(0, 3);
  } catch (error) {
    console.error("Gemini News Fetch Error:", error);
    return [];
  }
};