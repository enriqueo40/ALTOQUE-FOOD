
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    try {
        const prompt = `Genera una descripción chic, minimalista y tentadora para un menú.
        Producto: ${productName}
        Categoría: ${categoryName}
        Descripción actual: ${currentDescription}
        
        Enfoque en ingredientes frescos y experiencia. Máximo 15 palabras.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text?.trim() || "Descripción deliciosa en proceso...";
    } catch (error) {
        console.error("Error generating product description:", error);
        return "Una experiencia única para tu paladar.";
    }
};

export const getChatbotResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const systemInstruction = `Eres "AltoqueBot", el asistente IA de un restaurante moderno. 
    Tu personalidad es amable, profesional y eficiente.
    Responde dudas sobre el menú, horarios y pedidos.
    Mantén las respuestas concisas.`;

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
        return response.text?.trim() || "Lo siento, no pude procesar eso.";

    } catch (error) {
        console.error("Error getting chatbot response:", error);
        return "Tengo problemas de conexión. Por favor, intenta de nuevo.";
    }
};

export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    const prompt = `Como analista de negocios de restaurantes de clase mundial, analiza estos datos de pedidos. 
    Proporciona insights accionables, tendencias y recomendaciones específicas.

    **Datos de Pedidos (JSON):**
    ${JSON.stringify(orders, null, 2)}

    **Consulta del Usuario:**
    "${query}"
    `;
    
    try {
        // Uso de gemini-3.1-pro-preview para razonamiento avanzado
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { 
                    thinkingBudget: 32768 // Máximo presupuesto para análisis profundo de negocio
                }
            }
        });
        return response.text || "No se pudieron generar insights en este momento.";
    } catch (error) {
        console.error("Error getting advanced insights:", error);
        return `Ocurrió un error en el análisis: ${error instanceof Error ? error.message : String(error)}`;
    }
};
