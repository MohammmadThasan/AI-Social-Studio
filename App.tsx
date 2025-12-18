
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GeneratorForm from './components/GeneratorForm';
import PostResult from './components/PostResult';
import { FormData, GeneratedPost } from './types';
import { generateSocialPost, generatePostImage } from './services/geminiService';
import { Sparkles, AlertCircle, Wand2 } from 'lucide-react';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    platform: 'LinkedIn',
    topic: 'Autonomous Data Agents',
    customTopic: '',
    tone: 'Educational',
    includeEmoji: true,
    includeHashtags: true,
    includePromptChaining: false,
    includeCTA: false,
    comparisonFormat: false,
    tldrSummary: false,
    includeFutureOutlook: false,
    includeDevilsAdvocate: false,
    includeImplementationSteps: false,
  });

  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedPost(null);

    try {
      const [textResult, imageResult] = await Promise.all([
        generateSocialPost(formData),
        generatePostImage(formData)
      ]);

      setGeneratedPost({
        ...textResult,
        imageUrl: imageResult
      });
    } catch (err: any) {
      if (err.message === "API_LIMIT_REACHED") {
        setError("Generation limit reached for this model. Try again in a few minutes.");
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
      
      <main className="flex-grow max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 h-full items-start">
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <GeneratorForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleSubmit} 
              isLoading={isLoading} 
            />
          </div>

          <div className="lg:col-span-7 xl:col-span-8 w-full">
            <PostResult 
              post={generatedPost} 
              isLoading={isLoading} 
              error={error}
              formData={formData}
              onImageUpdate={(url) => generatedPost && setGeneratedPost({...generatedPost, imageUrl: url})}
              onContentUpdate={(c) => generatedPost && setGeneratedPost({...generatedPost, content: c})}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 dark:text-slate-600 text-xs font-medium">
          <p>© {new Date().getFullYear()} InsightGen - AI Analytics Specialist. Powered by Gemini.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
