
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product, CartItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getPairingSuggestion = async (cartItems: CartItem[], allProducts: Product[]): Promise<string> => {
    if (cartItems.length === 0) return "";
    
    const cartNames = cartItems.map(i => i.name).join(", ");
    const availableProducts = allProducts.map(p => `${p.name} (${p.price}$)`).join(", ");

    const prompt = `Actúa como un sommelier y experto gastronómico. 
    El cliente tiene esto en su carrito: ${cartNames}.
    Basado SOLO en estos productos disponibles en el menú: ${availableProducts}, 
    sugiere UN solo producto adicional que combine perfectamente. 
    Respuesta corta (máximo 12 palabras), persuasiva y chic. Ej: "Esa hamburguesa va increíble con nuestra Cerveza Artesanal helada."`;

    try {
        // Fix: Use gemini-3-flash-preview for basic text tasks
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text?.trim() || "";
    } catch (error) {
        return "";
    }
};

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    try {
        const prompt = `Generate a chic, minimalist, and enticing one-sentence description for a cafe menu item.
        Item Name: ${productName}
        Category: ${categoryName}
        Current Description (if any): ${currentDescription}
        
        Focus on fresh ingredients, taste, and experience. Keep it under 15 words.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text?.trim() || "Failed to generate description.";
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
    Keep your answers concise and friendly.`;

    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction },
            history: contents, 
        });

        const response = await chat.sendMessage({ message: newMessage });
        return response.text?.trim() || "I'm sorry, I couldn't process that.";

    } catch (error) {
        console.error("Error getting chatbot response:", error);
        return "I'm having a little trouble connecting. Please try again in a moment.";
    }
};

export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    const prompt = `As a world-class restaurant business analyst, analyze the following order data based on the user's query. Provide actionable insights, identify trends, and give specific, data-driven recommendations.
    Data: ${JSON.stringify(orders)}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 32768 } }
        });
        return response.text || "No insights could be generated at this time.";
    } catch (error) {
        console.error("Error getting advanced insights:", error);
        return `An error occurred while analyzing the data.`;
    }
};
