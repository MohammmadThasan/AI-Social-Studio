import React from 'react';
import { FormData, Topic, Tone, Platform } from '../types';
import { TOPICS, TONES } from '../constants';
import { Wand2, Loader2, Link2, Linkedin, Facebook, Twitter, Instagram, BookOpen, ChevronDown } from 'lucide-react';

interface GeneratorFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: () => void;
  isLoading: boolean;
}

const GeneratorForm: React.FC<GeneratorFormProps> = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  isLoading 
}) => {
  
  const handleChange = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const PLATFORM_CONFIG: { id: Platform; label: string; icon: React.ReactNode }[] = [
    { id: 'LinkedIn', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" /> },
    { id: 'X (Twitter)', label: 'X', icon: <Twitter className="w-4 h-4" /> },
    { id: 'Medium', label: 'Medium', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'Instagram', label: 'Insta', icon: <Instagram className="w-4 h-4" /> },
    { id: 'Facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col transition-colors duration-300">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Configuration</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Define your content strategy.</p>
      </div>

      <div className="space-y-6 flex-grow">
        
        {/* Platform Selection */}
        <div>
           <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
             Platform
           </label>
           <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
             {PLATFORM_CONFIG.map((p) => {
               const isSelected = formData.platform === p.id;
               return (
                <button
                  key={p.id}
                  onClick={() => handleChange('platform', p.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 space-y-1.5 ${
                    isSelected
                      ? `border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600 dark:ring-indigo-500`
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>{p.icon}</div>
                  <span className="text-[10px] font-medium truncate w-full text-center">
                    {p.label}
                  </span>
                </button>
               );
             })}
           </div>
        </div>

        {/* Topic Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
             Topic
          </label>
          <div className="space-y-3">
            <div className="relative">
              <select
                value={formData.topic}
                onChange={(e) => handleChange('topic', e.target.value as Topic)}
                className="w-full appearance-none rounded-lg border-slate-200 dark:border-slate-800 border bg-slate-50 dark:bg-slate-850 px-3 py-2.5 text-slate-900 dark:text-white text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow outline-none"
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            
            {/* Custom Topic Input */}
            {formData.topic === 'Custom' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  value={formData.customTopic}
                  onChange={(e) => handleChange('customTopic', e.target.value)}
                  placeholder="E.g. The rise of small language models..."
                  className="w-full rounded-lg border-slate-200 dark:border-slate-800 border px-3 py-2.5 text-slate-900 dark:text-white text-sm bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Tone Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Tone</label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((tone) => {
              const isSelected = formData.tone === tone.value;
              return (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => handleChange('tone', tone.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 ring-1 ring-indigo-600 dark:ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-medium">{tone.label}</div>
                  <div className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-500'}`}>
                    {tone.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
             Options
            </label>
           <div className="space-y-2">
            <label className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Use Emojis</span>
              <input 
                type="checkbox" 
                checked={formData.includeEmoji}
                onChange={(e) => handleChange('includeEmoji', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
              />
            </label>
            <label className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Include Hashtags</span>
              <input 
                type="checkbox" 
                checked={formData.includeHashtags}
                onChange={(e) => handleChange('includeHashtags', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
              />
            </label>
            <label className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                 Prompt Chain <Link2 className="w-3 h-3 text-slate-400" />
              </span>
              <input 
                type="checkbox" 
                checked={formData.includePromptChaining}
                onChange={(e) => handleChange('includePromptChaining', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
              />
            </label>
           </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onSubmit}
          disabled={isLoading || (formData.topic === 'Custom' && !formData.customTopic.trim())}
          className="w-full flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Generate Content</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GeneratorForm;