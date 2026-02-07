
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, Order, Product, CartItem } from '../types';

// Inicialización de Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Genera una sugerencia de maridaje basada en el consumo total de la sesión y el carrito.
 */
export const getPairingSuggestion = async (cartItems: CartItem[], allProducts: Product[]): Promise<string> => {
    // Recuperar items consumidos del localStorage para análisis completo
    const savedConsumed = localStorage.getItem('altoque_consumed_items');
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
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest', // Usamos un modelo rápido para baja latencia
            contents: prompt,
        });
        return response.text?.trim() || "";
    } catch (error) {
        console.error("Error getting pairing suggestion:", error);
        return ""; // Falla silenciosamente para no interrumpir la experiencia
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
    Responde a: "${query}". Sé directo, da insights accionables y estructura con markdown.`;
    
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
