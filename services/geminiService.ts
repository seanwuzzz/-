import { GoogleGenAI } from "@google/genai";
import { PortfolioPosition, PortfolioSummary } from "../types";

export const generatePortfolioAnalysis = async (
  apiKey: string,
  summary: PortfolioSummary,
  positions: PortfolioPosition[]
): Promise<string> => {
  if (!apiKey) return "請先在設定中輸入 Gemini API Key。";

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Prepare data prompt
    const positionsText = positions.map(p => 
      `- ${p.symbol} ${p.name}: 股數 ${p.shares}, 均價 ${p.avgCost.toFixed(1)}, 現價 ${p.currentPrice}, 損益 ${p.unrealizedPLPercent.toFixed(2)}%`
    ).join('\n');

    const prompt = `
    你是一位專業的台灣股市分析師。請根據以下投資組合數據提供簡短的績效分析與建議。
    請用繁體中文回答。語氣專業但親切。
    
    **投資組合總覽:**
    - 總資產: ${summary.totalAssets.toFixed(0)} TWD
    - 總損益: ${summary.totalPL.toFixed(0)} (${summary.totalPLPercent.toFixed(2)}%)
    - 今日變動: ${summary.dayPL.toFixed(0)}
    
    **持股明細:**
    ${positionsText}
    
    **任務:**
    1. 評估整體投資組合的健康狀況（集中度、風險）。
    2. 針對表現最好和最差的持股給予簡評。
    3. 提供一般性的市場觀察建議（不要給出具體的買賣價位建議，請附上免責聲明）。
    4. 請使用 Markdown 格式排版，重點加粗。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "無法產生分析報告。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `發生錯誤: ${error instanceof Error ? error.message : "未知錯誤"}`;
  }
};