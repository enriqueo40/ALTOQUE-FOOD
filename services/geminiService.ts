
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product, CartItem } from '../types';

// Fix: Always use process.env.API_KEY directly in the GoogleGenAI constructor
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Genera una sugerencia de maridaje basada en el consumo total de la sesión y el carrito.
 */
export const getPairingSuggestion = async (cartItems: CartItem[], allProducts: Product[]): Promise<string> => {
    // Recuperar items consumidos del localStorage para análisis completo
    const savedConsumed = typeof window !== 'undefined' ? localStorage.getItem('altoque_consumed_items') : null;
    const consumedItems: CartItem[] = savedConsumed ? JSON.parse(savedConsumed) : [];
    
    if (cartItems.length === 0 && consumedItems.length === 0) return "";
    
    const allInTable = [...consumedItems, ...cartItems].map(i => i.name).join(", ");
    const availableProducts = allProducts
        .filter(p => p.available && ![...consumedItems, ...cartItems].some(ci => ci.id === p.id))
        .map(p => `${p.name} ($${p.price})`)
        .slice(0, 15)
        .join(", ");

    if (!availableProducts) return "";

    const prompt = `Actúa como un sommelier y experto gastronómico chic. 
    En esta mesa se está consumiendo: ${allInTable}.
    Basado SOLO en estos productos disponibles: ${availableProducts}, 
    sugiere UN solo producto adicional (bebida, postre o entrada) que combine perfectamente. 
    La respuesta debe ser muy corta (máximo 12 palabras), persuasiva y elegante. 
    Ejemplo: "Para realzar sabores, nuestro Espresso Intenso es ideal."`;

    try {
        // Fix: Use gemini-3-flash-preview for basic text generation tasks as per guidelines
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Usamos un modelo rápido para baja latencia
            contents: prompt,
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Error getting pairing suggestion:", error);
        return ""; // Falla silenciosamente para no interrumpir la experiencia
    }
};

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    try {
        const prompt = `Generate a chic, minimalist, and enticing one-sentence description for a cafe menu item.
        Item Name: ${productName}
        Category: ${categoryName}
        Current Description (if any): ${currentDescription}
        
        Focus on fresh ingredients, taste, and experience. Keep it under 15 words.`;

        // Fix: Use gemini-3-flash-preview for basic text generation tasks
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        // Fix: Access the generated text directly using the .text property
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
    Keep your answers concise and friendly.
    Here is the menu: Artisanal Coffees, Fresh Pastries, Savory Bites, Cold Brews & Teas.`;

    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
    // Note: contents.push is already part of history logic if needed, but chats.create uses history

    try {
        // Fix: Use gemini-3-flash-preview for simple chat-based Q&A tasks
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction },
            history: contents, 
        });

        // Fix: Access response.text directly (getter property)
        const response = await chat.sendMessage({ message: newMessage });
        return response.text?.trim() || "I'm sorry, I couldn't process that.";

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
        // Fix: Use gemini-3-pro-preview for complex reasoning tasks and data analysis
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 } // Max budget for gemini-3-pro-preview
            }
        });
        // Fix: Access response.text directly
        return response.text || "No insights could be generated at this time.";
    } catch (error) {
        console.error("Error getting advanced insights:", error);
        return `An error occurred while analyzing the data. ${error instanceof Error ? error.message : String(error)}`;
    }
};