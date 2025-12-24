
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product } from '../types';

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    // Initialization inside function ensures fresh API key access.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const prompt = `Generate a chic, minimalist, and enticing one-sentence description for a cafe menu item.
        Item Name: ${productName}
        Category: ${categoryName}
        Current Description (if any): ${currentDescription}
        Focus on fresh ingredients and experience. Max 15 words.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text?.trim() || "Delicious choice prepared with fresh ingredients.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Delicious choice prepared with fresh ingredients.";
    }
};

export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Analyze this restaurant order data: ${JSON.stringify(orders)}. Query: ${query}. Provide actionable business recommendations in Markdown.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 2048 }
            }
        });
        return response.text || "No insights available for this period.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "AI analysis error. Please check data volume or query complexity.";
    }
};

export const getChatbotResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `You are OrdoBot, a witty and professional restaurant assistant. Answer menu questions concisely.`;
    
    const historyParts = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction },
            history: historyParts,
        });
        const response = await chat.sendMessage({ message: newMessage });
        return response.text?.trim() || "I'm here to help!";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "I'm having connection trouble. Please try again in a moment.";
    }
};
