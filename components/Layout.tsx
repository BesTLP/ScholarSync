
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                S
             </div>
             <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                    ScholarSync
                </h1>
             </div>
          </div>
          <div className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full">
            专注于学术导师匹配
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <footer className="py-6 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} ScholarSync. Powered by Google Gemini.
      </footer>
    </div>
  );
};

export default Layout;
