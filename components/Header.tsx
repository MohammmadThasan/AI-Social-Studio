import React from 'react';
import { Sparkles, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
            InsightGen
          </h1>
          <span className="hidden sm:inline-block h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2"></span>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block">AI Studio</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
             <span>Gemini 2.5 Flash</span>
          </div>

          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus:outline-none"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;