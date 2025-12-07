import React, { useState } from 'react';
import { getFastResponse } from '../services/geminiService';

const FastAsker: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');
    setLatency(null);
    const start = performance.now();

    try {
      const res = await getFastResponse(query);
      const end = performance.now();
      setLatency(Math.round(end - start));
      setResponse(res);
    } catch (error) {
      setResponse("获取快速响应出错。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-100">
            <div className="bg-gradient-to-r from-orange-400 to-red-500 p-8 text-white">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                        <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                    </svg>
                    Flash Lite 极速问答
                </h2>
                <p className="opacity-90 mt-2">由 Gemini 2.5 Flash Lite 驱动，超低延迟体验。</p>
            </div>

            <div className="p-8">
                <form onSubmit={handleAsk} className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="快速提问..."
                        className="w-full text-lg p-4 pr-12 bg-gray-50 border-2 border-transparent focus:border-orange-400 rounded-2xl focus:outline-none transition-colors"
                    />
                    <button 
                        type="submit"
                        disabled={loading || !query}
                        className="absolute right-2 top-2 bottom-2 p-2 bg-white text-orange-500 rounded-xl hover:bg-orange-50 disabled:opacity-50 transition-colors"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </form>

                <div className="mt-8 min-h-[150px]">
                    {loading && (
                        <div className="flex items-center gap-3 text-orange-500 animate-pulse">
                            <div className="w-2 h-2 bg-current rounded-full"></div>
                            <span className="font-mono font-bold text-sm">光速处理中...</span>
                        </div>
                    )}

                    {!loading && response && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">响应内容</span>
                                {latency && (
                                    <span className="text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded">
                                        {latency}ms
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-800 text-lg leading-relaxed">
                                {response}
                            </p>
                        </div>
                    )}
                    
                    {!loading && !response && (
                        <div className="text-gray-300 text-center mt-10">
                            随时准备回答您的快速提问。
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default FastAsker;