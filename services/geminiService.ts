import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product } from '../types';

// Fix: Correct initialization using direct process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    try {
        const prompt = `Generate a chic, minimalist, and enticing one-sentence description for a cafe menu item.
        Item Name: ${productName}
        Category: ${categoryName}
        Current Description (if any): ${currentDescription}
        
        Focus on fresh ingredients, taste, and experience. Keep it under 15 words.`;

        // Fix: Use preferred model 'gemini-3-flash-preview' and ai.models.generateContent
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        // Fix: Use .text property directly
        return response.text?.trim() || "Delicious choice prepared with fresh ingredients.";
    } catch (error) {
        console.error("Error generating product description:", error);
        return "Failed to generate description.";
    }
};

export const getChatbotResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const systemInstruction = `You are "OrdoBot", a friendly and helpful AI assistant for a chic cafe. 
    Your personality is warm, professional, and slightly witty.
    You can answer questions about the menu, store hours (8 AM - 8 PM daily), and general inquiries.
    Do not answer questions unrelated to the cafe. Gently redirect the conversation back to the cafe.
    Keep your answers concise and friendly.
    Here is the menu: Artisanal Coffees, Fresh Pastries, Savory Bites, Cold Brews & Teas.`;

    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    try {
        // Fix: Use preferred model 'gemini-3-flash-preview' and initialize chat with history
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction },
            history: contents,
        });

        const response = await chat.sendMessage({ message: newMessage });
        // Fix: Use .text property directly
        return response.text?.trim() || "I'm here to help!";

    } catch (error) {
        console.error("Error getting chatbot response:", error);
        return "I'm having a little trouble connecting. Please try again in a moment.";
    }
};

export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    const prompt = `As a world-class restaurant business analyst, analyze the following order data based on the user's query. Provide actionable insights, identify trends, and give specific, data-driven recommendations.

    **Order Data (JSON format):**
    ${JSON.stringify(orders, null, 2)}

    **User Query:**
    "${query}"

    **Your analysis should be:**
    1.  **Direct:** Directly answer the user's question.
    2.  **Insightful:** Go beyond the obvious. Find correlations and patterns.
    3.  **Actionable:** Provide clear, concrete suggestions the restaurant owner can implement.
    4.  **Structured:** Use markdown for clarity (headings, lists, bold text).
    `;
    
    try {
        // Fix: Use preferred model 'gemini-3-pro-preview' and thinking budget for complex analysis
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 2048 }
            }
        });
        // Fix: Use .text property directly
        return response.text || "No insights available for this dataset.";
    } catch (error) {
        console.error("Error getting advanced insights:", error);
        return `An error occurred while analyzing the data. ${error instanceof Error ? error.message : String(error)}`;
    }
};
