
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product } from '../types';

// Guidelines: The API key must be obtained exclusively from process.env.API_KEY.
// Guidelines: Create a new instance right before making an API call to ensure fresh key usage.

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "AI service is unavailable.";
    
    // Fix: Initialization follows the named parameter pattern
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const prompt = `Generate a chic, minimalist, and enticing one-sentence description for a cafe menu item.
        Item Name: ${productName}
        Category: ${categoryName}
        Current Description (if any): ${currentDescription}
        Focus on fresh ingredients and experience. Max 15 words.`;

        // Fix: Using gemini-3-flash-preview for text tasks
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        // Fix: Use the .text property directly (not a method)
        return response.text?.trim() || "Delicious choice prepared with fresh ingredients.";
    } catch (error) {
        console.error("Error generating product description:", error);
        return "Failed to generate description.";
    }
};

export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "AI insights unavailable.";
    
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze this restaurant order data: ${JSON.stringify(orders)}. Query: ${query}. Provide actionable business recommendations in Markdown.`;
    
    try {
        // Fix: Using gemini-3-pro-preview for complex analysis and setting thinking budget
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 4096 }
            }
        });
        // Fix: Access .text property directly
        return response.text || "No insights available for this period.";
    } catch (error) {
        console.error("Error getting advanced insights:", error);
        return "Analysis error.";
    }
};

export const getChatbotResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Offline.";
    
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are OrdoBot, a witty and professional restaurant assistant. Answer menu questions concisely.`;
    
    try {
        // Fix: Passing chat history properly to the create parameters
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction },
            history: history.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }))
        });
        // Fix: sendMessage parameters must use { message }
        const response = await chat.sendMessage({ message: newMessage });
        // Fix: Use .text property directly
        return response.text?.trim() || "I'm here to help!";
    } catch (error) {
        console.error("Error getting chatbot response:", error);
        return "Connection trouble, please try again.";
    }
};
