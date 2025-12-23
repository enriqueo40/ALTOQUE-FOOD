
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product } from '../types';

const API_KEY = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (API_KEY) {
    try {
        ai = new GoogleGenAI({ apiKey: API_KEY });
    } catch (e) {
        console.error("Error initializing GoogleGenAI client:", e);
    }
}

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    if (!ai) return "AI service is unavailable.";
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
        return "Failed to generate description.";
    }
};

export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    if (!ai) return "AI insights unavailable.";
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
        return "Analysis error.";
    }
};

export const getChatbotResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    if (!ai) return "Offline.";
    const systemInstruction = `You are OrdoBot, a witty and professional restaurant assistant. Answer menu questions concisely.`;
    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction },
        });
        const response = await chat.sendMessage({ message: newMessage });
        return response.text?.trim() || "I'm here to help!";
    } catch (error) {
        return "Connection trouble, please try again.";
    }
};
