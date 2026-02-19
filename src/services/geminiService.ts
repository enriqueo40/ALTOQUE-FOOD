
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product } from '../types';

// Use process.env.API_KEY directly for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    try {
        const prompt = `Genera una descripción chic, minimalista y tentadora para un menú de restaurante.
        Producto: ${productName}
        Categoría: ${categoryName}
        Descripción actual: ${currentDescription}
        
        Enfoque en ingredientes frescos y experiencia sensorial. Máximo 15 palabras.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text?.trim() || "Una experiencia única para tu paladar.";
    } catch (error) {
        console.error("Error generating product description:", error);
        return "Descripción deliciosa en proceso...";
    }
};

export const getChatbotResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const systemInstruction = `Eres "AltoqueBot", el asistente inteligente de un restaurante de alta gama. 
    Tu personalidad es amable, profesional y eficiente.
    Responde dudas sobre el menú, horarios y procesos de pedido.
    Si te preguntan por pedidos en mesa, explica que pueden pedir por rondas y pagar al final.
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
        return response.text?.trim() || "Lo siento, no pude procesar tu solicitud.";

    } catch (error) {
        console.error("Error getting chatbot response:", error);
        return "Tengo problemas de conexión. Por favor, intenta de nuevo en un momento.";
    }
};

export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    const prompt = `Como analista experto en gestión de restaurantes de clase mundial, analiza los siguientes datos de ventas y proporciona insights estratégicos profundos.
    Identifica patrones de consumo complejos, optimización de menú y predicciones de demanda.

    **Datos de Pedidos (JSON):**
    ${JSON.stringify(orders, null, 2)}

    **Consulta del Usuario:**
    "${query}"
    `;
    
    try {
        // Uso de gemini-3-pro-preview con Pensamiento Profundo para análisis complejo y estratégico
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { 
                    thinkingBudget: 32768 // Máximo presupuesto para análisis profundo de negocio
                }
            }
        });
        return response.text || "No se pudieron generar insights estratégicos en este momento.";
    } catch (error) {
        console.error("Error getting advanced insights:", error);
        return `Ocurrió un error en el análisis estratégico: ${error instanceof Error ? error.message : String(error)}`;
    }
};
