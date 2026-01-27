
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product, CartItem } from '../types';

// Inicialización de Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Genera una sugerencia de maridaje basada en el carrito actual.
 */
export const getPairingSuggestion = async (cartItems: CartItem[], allProducts: Product[]): Promise<string> => {
    if (cartItems.length === 0) return "";
    
    const cartNames = cartItems.map(i => i.name).join(", ");
    const availableProducts = allProducts
        .filter(p => p.available && !cartItems.some(ci => ci.id === p.id))
        .map(p => `${p.name} ($${p.price})`)
        .slice(0, 10)
        .join(", ");

    const prompt = `Actúa como un sommelier y experto gastronómico chic. 
    El cliente tiene esto en su pedido: ${cartNames}.
    Basado SOLO en estos productos disponibles en el menú: ${availableProducts}, 
    sugiere UN solo producto adicional que combine perfectamente para "completar la experiencia". 
    Respuesta muy corta (máximo 10 palabras), persuasiva y elegante. 
    Ejemplo: "Esa hamburguesa marida increíble con nuestra Cerveza Artesanal IPA."`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Error en sugerencia IA:", error);
        return "";
    }
};

/**
 * Genera descripciones de productos con IA.
 */
export const generateProductDescription = async (productName: string, categoryName: string, currentDescription: string): Promise<string> => {
    try {
        const prompt = `Genera una descripción chic, minimalista y tentadora para un menú.
        Nombre: ${productName}
        Categoría: ${categoryName}
        Actual: ${currentDescription}
        Bajo 15 palabras.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text?.trim() || "Delicioso y preparado con ingredientes frescos.";
    } catch (error) {
        return "Una experiencia única para tu paladar.";
    }
};

/**
 * Chatbot de atención al cliente.
 */
export const getChatbotResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const systemInstruction = `Eres "OrdoBot", un asistente amable de un restaurante chic. 
    Tu personalidad es cálida y profesional. Responde sobre el menú y horarios.
    No hables de temas ajenos al restaurante.`;

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
        return response.text?.trim() || "Lo siento, ¿podrías repetir eso?";

    } catch (error) {
        return "Estamos experimentando una alta demanda, por favor intenta de nuevo en un momento.";
    }
};

/**
 * Análisis de datos para el administrador.
 */
export const getAdvancedInsights = async (query: string, orders: Order[]): Promise<string> => {
    const prompt = `Como analista de negocios experto, analiza estos pedidos: ${JSON.stringify(orders)}. 
    Responde a: ${query}. Sé directo y accionable.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 32768 } }
        });
        return response.text || "No hay suficientes datos para el análisis.";
    } catch (error) {
        return "Error al analizar los datos.";
    }
};
