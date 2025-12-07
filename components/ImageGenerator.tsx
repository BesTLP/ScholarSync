import React, { useState } from 'react';
import { ImageSize } from '../types';
import { generateImage } from '../services/geminiService';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>(ImageSize.Size_1K);
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrl = await generateImage(prompt, size);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError("图像生成失败。请尝试不同的提示词或检查网络。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">🎨</span>
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Nano Banana Pro 图像工坊</h2>
                <p className="text-gray-500 text-sm">创建高保真学术可视化图像。</p>
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex flex-col md:flex-row gap-4">
                 <div className="flex-1">
                     <label className="block text-sm font-medium text-gray-700 mb-2">图像提示词</label>
                     <textarea
                        className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                        placeholder="例如：一个充满未来感的大学校园，学生们正在使用全息平板电脑..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                     />
                 </div>
                 <div className="w-full md:w-64 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">分辨率</label>
                        <select 
                            value={size}
                            onChange={(e) => setSize(e.target.value as ImageSize)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                            <option value={ImageSize.Size_1K}>1K (标准)</option>
                            <option value={ImageSize.Size_2K}>2K (高清)</option>
                            <option value={ImageSize.Size_4K}>4K (超清)</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-2">
                            更高的分辨率可能需要更长的生成时间。
                        </p>
                     </div>
                     <button 
                        onClick={handleGenerate}
                        disabled={loading || !prompt}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-transform active:scale-95 ${
                            loading || !prompt ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg'
                        }`}
                     >
                        {loading ? '正在生成...' : '生成图像'}
                     </button>
                 </div>
             </div>

             {error && (
                 <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                     {error}
                 </div>
             )}

             <div className="border-t border-gray-100 pt-8">
                {loading ? (
                    <div className="aspect-square w-full max-w-lg mx-auto bg-gray-50 rounded-2xl flex items-center justify-center animate-pulse border border-gray-100">
                        <div className="text-center">
                            <div className="text-4xl mb-2 animate-bounce">✨</div>
                            <p className="text-gray-400 font-medium">正在绘制杰作...</p>
                        </div>
                    </div>
                ) : generatedImage ? (
                    <div className="flex flex-col items-center animate-fade-in-up">
                        <img 
                            src={generatedImage} 
                            alt="Generated content" 
                            className="w-full max-w-2xl rounded-2xl shadow-2xl border-4 border-white"
                        />
                        <div className="mt-4 flex gap-4">
                            <a 
                                href={generatedImage} 
                                download="scholar-sync-generated.png"
                                className="px-6 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-black transition-colors"
                            >
                                下载图像
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="aspect-[16/9] w-full bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                        <p>生成的图像将显示在这里</p>
                    </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default ImageGenerator;