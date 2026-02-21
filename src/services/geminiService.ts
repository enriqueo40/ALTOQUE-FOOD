
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product } from '../types';

// Lazy initialization of the Gemini API client
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not defined in the environment.");
        }
        aiClient = new GoogleGenAI({ apiKey });
    }
    return aiClient;
};

export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const prompt = `Genera una descripción chic, minimalista y tentadora para un menú de restaurante profesional.
        Producto: ${productName}
        Categoría: ${categoryName}
        Descripción actual: ${currentDescription}
        
        Enfoque en frescura y experiencia sensorial. Máximo 15 palabras.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
        });

        return response.text?.trim() || "Una experiencia única para tu paladar.";
    } catch (error) {
        console.error("Error generating product description:", error);
        return "Descripción en proceso...";
    }
};

export const getChatbotResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const systemInstruction = `Eres "AltoqueBot", el asistente experto de un restaurante moderno. 
    Tu personalidad es amable, profesional y eficiente.
    Responde dudas sobre el menú, horarios y cómo pedir en mesa (por rondas).
    Mantén las respuestas concisas.`;

    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    try {
        const ai = getAiClient();
        const chat = ai.chats.create({
            model: 'gemini-flash-latest',
            config: { systemInstruction },
            history: contents, 
        });

        const response = await chat.sendMessage({ message: newMessage });
        return response.text?.trim() || "Lo siento, no pude procesar eso.";

    } catch (error) {
        console.error("Error getting chatbot response:", error);
        return "Tengo problemas de conexión. Intenta de nuevo.";
    }
};

export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    const prompt = `Como analista de negocios experto en alta gastronomía, analiza estos pedidos. 
    Busca patrones de consumo en mesa, platos más pedidos por ronda y optimización de ticket promedio.

    **Datos de Pedidos (JSON):**
    ${JSON.stringify(orders, null, 2)}

    **Consulta del Usuario:**
    "${query}"
    `;
    
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: prompt,
        });
        return response.text || "No se pudieron generar insights estratégicos.";
    } catch (error) {
        console.error("Error getting advanced insights:", error);
        return `Error en el análisis: ${error instanceof Error ? error.message : String(error)}`;
    }
};
