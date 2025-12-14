import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GeneratorForm from './components/GeneratorForm';
import PostResult from './components/PostResult';
import { FormData, GeneratedPost } from './types';
import { generateSocialPost, generatePostImage } from './services/geminiService';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    platform: 'LinkedIn',
    topic: 'Agentic AI (Autonomous)',
    customTopic: '',
    tone: 'Educational',
    includeEmoji: true,
    includeHashtags: true,
    includePromptChaining: false,
  });

  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from system preference or local storage could be added here
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedPost(null);

    try {
      // Run both generations in parallel for better UX speed
      const [textResult, imageResult] = await Promise.all([
        generateSocialPost(formData),
        generatePostImage(formData)
      ]);

      setGeneratedPost({
        ...textResult,
        imageUrl: imageResult
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpdate = (imageUrl: string) => {
    if (generatedPost) {
      setGeneratedPost({ ...generatedPost, imageUrl });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      
      <main className="flex-grow max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 h-full items-start">
          
          {/* Left Column: Configuration */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <GeneratorForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleSubmit} 
              isLoading={isLoading} 
            />
          </div>

          {/* Right Column: Preview & Result */}
          <div className="lg:col-span-7 xl:col-span-8 w-full">
            <PostResult 
              post={generatedPost} 
              isLoading={isLoading} 
              error={error}
              formData={formData}
              onImageUpdate={handleImageUpdate}
            />
          </div>
          
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 dark:text-slate-600 text-xs font-medium">
          <p>© {new Date().getFullYear()} InsightGen. AI responses can vary. Verify important information.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;