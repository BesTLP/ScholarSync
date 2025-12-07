import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { createChatSession } from '../services/geminiService';
import { Chat } from '@google/genai';

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat session on mount
    chatSession.current = createChatSession();
    
    // Initial greeting
    setMessages([
      { role: 'model', text: "您好！我是您的学术助手，由 Gemini 3 Pro 驱动。关于研究方法、论文写作或寻找资料，有什么我可以帮您的吗？", timestamp: Date.now() }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession.current) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }]);
    setIsTyping(true);

    try {
      const response = await chatSession.current.sendMessage({ message: userMsg });
      const text = response.text || "抱歉，我无法生成回复。";
      
      setMessages(prev => [...prev, { role: 'model', text: text, timestamp: Date.now() }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "连接服务器时出错，请重试。", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    💬
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">学术助手</h3>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        在线 (Gemini 3 Pro)
                    </p>
                </div>
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}>
                        <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.text}</p>
                        <p className={`text-[10px] mt-2 opacity-70 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                    </div>
                </div>
            ))}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-100 transition-shadow">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="询问关于研究方法、学术写作或寻找教授的问题..."
                    className="flex-1 bg-transparent border-none focus:ring-0 p-2 max-h-32 resize-none text-gray-800 placeholder-gray-400"
                    rows={1}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className={`p-3 rounded-lg flex-shrink-0 transition-colors ${
                        input.trim() && !isTyping
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">Gemini 可能会犯错。请核实重要信息。</p>
        </div>
    </div>
  );
};

export default ChatBot;