
import React, { useState, useRef, useEffect } from 'react';
import { getChatbotResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { IconChat, IconX, IconSend } from '../constants';

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 1, sender: 'bot', text: "Hello! I'm OrdoBot. How can I help you today? You can ask about our menu or store hours." }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (userInput.trim() === '' || isLoading) return;

        const newUserMessage: ChatMessage = {
            id: Date.now(),
            sender: 'user',
            text: userInput.trim(),
        };

        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const botResponseText = await getChatbotResponse(messages, userInput.trim());
            const newBotMessage: ChatMessage = {
                id: Date.now() + 1,
                sender: 'bot',
                text: botResponseText,
            };
            setMessages(prev => [...prev, newBotMessage]);
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessage: ChatMessage = {
                id: Date.now() + 1,
                sender: 'bot',
                text: "Sorry, I'm having a little trouble right now. Please try again later.",
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-5 right-5 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform duration-200 hover:scale-110"
                    aria-label={isOpen ? 'Close Chat' : 'Open Chat'}
                >
                    {isOpen ? <IconX /> : <IconChat />}
                </button>
            </div>

            {isOpen && (
                <div className="fixed bottom-20 right-5 w-80 h-[450px] bg-white rounded-xl shadow-2xl flex flex-col z-50 transition-opacity duration-300 animate-fade-in-up">
                    <header className="bg-indigo-600 text-white p-4 rounded-t-xl">
                        <h3 className="font-semibold text-lg">OrdoBot Assistant</h3>
                        <p className="text-sm opacity-90">At your service</p>
                    </header>
                    <div ref={chatBodyRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${message.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                    {message.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex justify-start">
                                <div className="bg-gray-200 text-gray-800 p-3 rounded-lg">
                                    <div className="flex items-center space-x-1">
                                      <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                      <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                      <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-200">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            className="flex items-center space-x-2"
                        >
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-700 disabled:bg-indigo-300"
                            >
                                <IconSend />
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </>
    );
};

export default Chatbot;
