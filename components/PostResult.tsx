import React, { useState, useEffect } from 'react';
import { GeneratedPost, FormData, ImageStyle, Platform } from '../types';
import { PLATFORM_SPECS } from '../constants';
import { generatePostImage, rewritePost } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { 
  Copy, Check, Share2, ExternalLink, Globe, Linkedin, Facebook, Download, 
  RefreshCw, RefreshCcw, Palette, Twitter, Instagram, Loader2, LogIn, 
  ChevronDown, Settings, BookOpen, Sparkles, Zap, MonitorPlay,
  User, ThumbsUp, MessageSquare, Repeat, Send, MoreHorizontal, AlertCircle,
  RectangleHorizontal, RectangleVertical, Square, Sliders, Type, Search, Info,
  Code, Users, Briefcase, Layers, Calendar, Clock, Upload, Cuboid as Cube, ShieldAlert,
  ArrowRight, Rocket, Link2, Quote
} from 'lucide-react';

interface PostResultProps {
  post: GeneratedPost | null;
  isLoading: boolean;
  error: string | null;
  formData: FormData;
  onImageUpdate: (url: string) => void;
  onContentUpdate: (content: string) => void;
}

const CharacterCounter: React.FC<{ text: string; platform: Platform }> = ({ text, platform }) => {
  const specs = PLATFORM_SPECS[platform];
  const count = text.length;
  const isOverMax = count > specs.max;
  const isSweetSpot = count >= specs.sweetSpot[0] && count <= specs.sweetSpot[1];

  let statusColor = 'bg-slate-200 dark:bg-slate-700'; 
  let textColor = 'text-slate-500';
  if (isOverMax) {
    statusColor = 'bg-red-500';
    textColor = 'text-red-600 dark:text-red-400';
  } else if (isSweetSpot) {
    statusColor = 'bg-emerald-500';
    textColor = 'text-emerald-600 dark:text-emerald-400';
  }

  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
        <span>Character Count</span>
        <span className={textColor}>{count} / {specs.max}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${statusColor}`} 
          style={{ width: `${Math.min(100, (count / specs.max) * 100)}%` }}
        />
      </div>
    </div>
  );
};

const PostResult: React.FC<PostResultProps> = ({ post, isLoading, error, formData, onImageUpdate, onContentUpdate }) => {
  const [isRewriting, setIsRewriting] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [publishingPlatform, setPublishingPlatform] = useState<Platform | null>(null);
  const [publishingStep, setPublishingStep] = useState<number>(0);

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch (err) {}
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  };

  const handleDownloadImage = () => {
    if (post?.imageUrl) {
      const link = document.createElement('a');
      link.href = post.imageUrl;
      link.download = `insightgen-${formData.topic.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAutoPublish = async (targetPlatform: Platform) => {
    if (!post) return;
    
    setPublishingPlatform(targetPlatform);
    setPublishingStep(1); // Preparing assets

    // Step 1: Copy to Clipboard
    await new Promise(r => setTimeout(r, 600));
    setPublishingStep(2); // Copying text
    await copyToClipboard(post.content);

    // Step 2: Download Image if exists
    if (post.imageUrl) {
      await new Promise(r => setTimeout(r, 600));
      setPublishingStep(3); // Downloading image
      handleDownloadImage();
    }

    // Step 3: Redirect
    await new Promise(r => setTimeout(r, 800));
    setPublishingStep(4); // Launching Platform
    
    let url = '';
    const encodedText = encodeURIComponent(post.content);
    
    switch (targetPlatform) {
        case 'LinkedIn': 
            url = 'https://www.linkedin.com/feed/?shareActive=true&text=' + encodedText;
            break;
        case 'X (Twitter)': 
            url = `https://twitter.com/intent/tweet?text=${encodedText}`; 
            break;
        case 'Facebook': 
            url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href); 
            break;
        case 'Instagram': 
            url = 'https://www.instagram.com/'; 
            break;
        case 'Medium': 
            url = 'https://medium.com/new-story'; 
            break;
    }

    window.open(url, '_blank');
    
    setTimeout(() => {
        setPublishingPlatform(null);
        setPublishingStep(0);
        setShareMessage(`Successfully prepared for ${targetPlatform}!`);
        setTimeout(() => setShareMessage(null), 3000);
    }, 1000);
  };

  const handleRewrite = async (audience: string) => {
      if (!post || isRewriting) return;
      setIsRewriting(true);
      try {
          const newContent = await rewritePost(post.content, formData.platform, audience);
          onContentUpdate(newContent);
      } catch (e) { console.error(e); } finally { setIsRewriting(false); }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center h-[600px]">
        <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-100 dark:border-slate-800 border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
        </div>
        <h3 className="mt-8 text-2xl font-bold text-slate-900 dark:text-white">Orchestrating Insights</h3>
        <p className="mt-2 text-slate-500 max-w-xs">Scanning 2025 AI Analytics benchmarks and synthesizing your post...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-200 p-8 text-center flex flex-col items-center justify-center h-[400px]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold">Strategy Interrupted</h3>
        <p className="mt-2 text-slate-500 max-w-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">Retry Generation</button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center h-[600px] border-dashed">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Zap className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-400">Content Studio Ready</h3>
        <p className="mt-2 text-slate-500 max-w-xs">Choose a domain and platform to generate professional analytics content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       {/* 100% Auto Publish Status Overlay */}
       {publishingPlatform && (
           <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6">
               <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/10 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Rocket className="w-10 h-10 text-white animate-bounce" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Auto-Publishing to {publishingPlatform}</h2>
                    <div className="space-y-4 mt-8">
                        {[
                            { step: 1, label: 'Optimizing Media Assets' },
                            { step: 2, label: 'Injecting Content to Clipboard' },
                            { step: 3, label: 'Initializing Secure Download' },
                            { step: 4, label: 'Launching Platform Composer' }
                        ].map((s) => (
                            <div key={s.step} className={`flex items-center gap-3 text-sm font-bold transition-opacity ${publishingStep >= s.step ? 'opacity-100 text-indigo-600 dark:text-indigo-400' : 'opacity-30'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 ${publishingStep >= s.step ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200'}`}>
                                    {publishingStep > s.step ? <Check className="w-3 h-3" /> : s.step}
                                </div>
                                {s.label}
                                {publishingStep === s.step && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-medium">
                        InsightGen 100% Automator v2.5
                    </div>
               </div>
           </div>
       )}

       <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 p-6">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">2025 Market Research</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full">AI Grounded</span>
           </div>
           <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 italic border-l-4 border-indigo-500">
             <ReactMarkdown>{post.researchSummary}</ReactMarkdown>
           </div>
       </div>

       <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden group">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{formData.platform} Draft Optimized</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => handleRewrite('Technical')} 
                  disabled={isRewriting} 
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {isRewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Code className="w-3 h-3" />}
                  Senior Engineer
                </button>
                <button 
                  onClick={() => handleRewrite('Simple')} 
                  disabled={isRewriting} 
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {isRewriting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                  General Audience
                </button>
             </div>
          </div>

          <div className="p-8">
             <div className="max-w-2xl mx-auto">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm">
                        <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">AI Strategy Lead</span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            Published via InsightGen • <Globe className="w-3 h-3" />
                        </span>
                    </div>
                 </div>
                 <div className="text-[16px] leading-[1.6] text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">
                    {post.content}
                 </div>
                 {post.imageUrl && (
                    <div className="mt-8 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl transition-transform hover:scale-[1.01] duration-500">
                        <img src={post.imageUrl} alt="AI Analytics visualization" className="w-full h-auto" />
                        <div className="absolute top-4 right-4">
                            <button onClick={handleDownloadImage} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg hover:bg-white transition-colors">
                                <Download className="w-4 h-4 text-slate-900" />
                            </button>
                        </div>
                    </div>
                 )}
             </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-6">
             <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleAutoPublish(formData.platform)} 
                      className="group flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-xl shadow-indigo-500/20 transition-all active:scale-95 overflow-hidden relative"
                    >
                        <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Rocket className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">100% AUTO POST</span>
                    </button>
                    <button 
                      onClick={() => { copyToClipboard(post.content); setShareMessage('Text Copied!'); setTimeout(() => setShareMessage(null), 2000); }} 
                      className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                        <Copy className="w-4 h-4" />
                        Copy Text
                    </button>
                 </div>
                 <CharacterCounter text={post.content} platform={formData.platform} />
             </div>
          </div>
       </div>

       {/* Verified Sources & Citations List */}
       {post.sources && post.sources.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg">
                      <Quote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Verified Sources & Citations</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {post.sources.map((source, idx) => (
                      <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-slate-50 dark:hover:bg-indigo-900/10 transition-all group"
                      >
                          <div className="mt-1 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                              <Link2 className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                          </div>
                          <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {source.title || 'Referenced Research'}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate font-mono">
                                  {source.uri?.replace('https://', '').replace('www.', '')}
                              </span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-300 ml-auto flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                      </a>
                  ))}
              </div>
          </div>
       )}

       {/* Secondary Platform Quick-Shares */}
       <div className="flex items-center justify-center gap-4 py-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cross-Platform Auto-Post:</span>
          {(['LinkedIn', 'X (Twitter)', 'Medium', 'Instagram'] as Platform[]).map(p => (
              <button 
                key={p} 
                onClick={() => handleAutoPublish(p)}
                className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 grayscale hover:grayscale-0 opacity-50 hover:opacity-100"
                title={`Auto Post to ${p}`}
              >
                  {p === 'LinkedIn' && <Linkedin className="w-5 h-5 text-blue-700" />}
                  {p === 'X (Twitter)' && <Twitter className="w-5 h-5 text-slate-900 dark:text-white" />}
                  {p === 'Medium' && <BookOpen className="w-5 h-5 text-emerald-600" />}
                  {p === 'Instagram' && <Instagram className="w-5 h-5 text-pink-600" />}
              </button>
          ))}
       </div>
       
       {shareMessage && (
           <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-black flex items-center gap-3 animate-in slide-in-from-bottom-10">
               <div className="bg-white/20 p-1 rounded-md">
                <Sparkles className="w-4 h-4 text-white" />
               </div>
               {shareMessage}
           </div>
       )}
    </div>
  );
};

export default PostResult;