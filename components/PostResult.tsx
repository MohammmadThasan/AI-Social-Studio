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
  ArrowRight, Rocket, Link2, Quote, Image as ImageIcon, Wand2, Monitor, Shield,
  Cpu, Hash, Network, Terminal, Radar, Filter
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
  const [rewritingTarget, setRewritingTarget] = useState<'Expert' | 'Broad' | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [publishingPlatform, setPublishingPlatform] = useState<Platform | null>(null);
  const [publishingStep, setPublishingStep] = useState<number>(0);

  // Visual Studio State
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('3D Render');
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
  const [showVisualStudio, setShowVisualStudio] = useState(false);

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

  const handleRegenerateImage = async (styleOverride?: ImageStyle) => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const newUrl = await generatePostImage(formData, styleOverride || selectedStyle, selectedRatio);
      if (newUrl) onImageUpdate(newUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAutoPublish = async (targetPlatform: Platform) => {
    if (!post) return;
    
    setPublishingPlatform(targetPlatform);
    setPublishingStep(1); 

    await new Promise(r => setTimeout(r, 600));
    setPublishingStep(2); 
    await copyToClipboard(post.content);

    if (post.imageUrl) {
      await new Promise(r => setTimeout(r, 600));
      setPublishingStep(3); 
      handleDownloadImage();
    }

    await new Promise(r => setTimeout(r, 800));
    setPublishingStep(4); 
    
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

  const handleRewrite = async (audience: string, target: 'Expert' | 'Broad') => {
      if (!post || rewritingTarget) return;
      setRewritingTarget(target);
      try {
          const newContent = await rewritePost(post.content, formData.platform, audience);
          onContentUpdate(newContent);
      } catch (e) { console.error(e); } finally { setRewritingTarget(null); }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center h-[600px]">
        <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-100 dark:border-slate-800 border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
                <Radar className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
        </div>
        <h3 className="mt-8 text-2xl font-bold text-slate-900 dark:text-white">Scanning Deep Web...</h3>
        <p className="mt-2 text-slate-500 max-w-xs uppercase text-[10px] font-black tracking-widest">Aggregating Social & Tech Intel</p>
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
            <Filter className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-400">Content Studio Ready</h3>
        <p className="mt-2 text-slate-500 max-w-xs">Deep research parameters loaded. Start generation to begin scan.</p>
      </div>
    );
  }

  const aspectRatios = [
    { label: 'Square', value: '1:1', icon: <Square className="w-4 h-4" /> },
    { label: 'Landscape', value: '16:9', icon: <RectangleHorizontal className="w-4 h-4" /> },
    { label: 'Portrait', value: '9:16', icon: <RectangleVertical className="w-4 h-4" /> },
    { label: 'Standard', value: '4:3', icon: <Monitor className="w-4 h-4" /> }
  ];

  const imageStyles: ImageStyle[] = ['3D Render', 'Photorealistic', 'Minimalist', 'Abstract', 'Cyberpunk', 'Corporate'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
               </div>
           </div>
       )}

       <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 p-6">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Deep Web Analysis Report</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full">No Asterisks Policy</span>
           </div>
           <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 border-l-4 border-indigo-500 shadow-inner font-medium">
             <div className="prose prose-sm dark:prose-invert">
                {post.researchSummary}
             </div>
           </div>
       </div>

       <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden group">
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Final {formData.platform} Draft</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => handleRewrite('Technical', 'Expert')} 
                  disabled={!!rewritingTarget} 
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                      rewritingTarget === 'Expert' 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-900 dark:text-indigo-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-sm disabled:opacity-50'
                  }`}
                >
                  {rewritingTarget === 'Expert' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Code className="w-3 h-3" />}
                  Expert Perspective
                </button>
                <button 
                  onClick={() => handleRewrite('Simple', 'Broad')} 
                  disabled={!!rewritingTarget} 
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                      rewritingTarget === 'Broad' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-900 dark:text-emerald-300' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-sm disabled:opacity-50'
                  }`}
                >
                  {rewritingTarget === 'Broad' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                  Broad Audience
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
                        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">AI Implementation Specialist</span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            Verified via Deep Search • <Globe className="w-3 h-3" />
                        </span>
                    </div>
                 </div>
                 <div className="text-[16px] leading-[1.6] text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">
                    {post.content}
                 </div>
                 
                 {/* Visual Studio Panel */}
                 <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <button 
                            onClick={() => setShowVisualStudio(!showVisualStudio)}
                            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:opacity-70 transition-colors"
                        >
                            <Palette className="w-4 h-4" />
                            Customize Visual & Ratio
                            <ChevronDown className={`w-3 h-3 transition-transform ${showVisualStudio ? 'rotate-180' : ''}`} />
                        </button>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => handleRegenerateImage('3D Render')}
                            disabled={isGeneratingImage}
                            className="text-[10px] font-black text-indigo-600 flex items-center gap-1 hover:text-indigo-800 disabled:opacity-50 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 transition-all uppercase tracking-tight"
                          >
                            <Cube className="w-3.5 h-3.5" /> 3D Magic Re-Render
                          </button>
                        </div>
                    </div>

                    {showVisualStudio && (
                        <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl space-y-6 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 shadow-inner">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Image Aspect Ratio</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {aspectRatios.map((r) => (
                                        <button
                                            key={r.value}
                                            onClick={() => setSelectedRatio(r.value)}
                                            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs transition-all ${
                                                selectedRatio === r.value 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20 translate-y-[-2px]' 
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                                            }`}
                                        >
                                            {r.icon}
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Visual Style Preference</label>
                                    <select 
                                        value={selectedStyle}
                                        onChange={(e) => setSelectedStyle(e.target.value as ImageStyle)}
                                        className="w-full text-sm font-bold p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    >
                                        {imageStyles.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button 
                                        onClick={() => handleRegenerateImage()}
                                        disabled={isGeneratingImage}
                                        className="w-full py-3 bg-slate-900 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:shadow-xl shadow-indigo-500/10 active:scale-[0.98]"
                                    >
                                        {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                        APPLY STUDIO SETTINGS
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {post.imageUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl transition-transform hover:scale-[1.005] duration-500 bg-slate-100 dark:bg-slate-950">
                            {isGeneratingImage && (
                                <div className="absolute inset-0 z-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCcw className="w-10 h-10 text-indigo-600 animate-spin" />
                                        <span className="text-xs font-black uppercase text-indigo-600 tracking-tighter">Synthesizing Visual...</span>
                                    </div>
                                </div>
                            )}
                            <img src={post.imageUrl} alt="AI Analytics visualization" className="w-full h-auto object-contain max-h-[600px] mx-auto" />
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <button onClick={handleDownloadImage} className="p-2.5 bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-lg hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800">
                                    <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                                </button>
                            </div>
                        </div>
                    ) : (
                         <div className="w-full aspect-video bg-slate-50 dark:bg-slate-850 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                            <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Visual Engine Ready</span>
                            <p className="text-xs text-slate-400 mb-6 max-w-xs">Generate a custom visual to complete your technical authority post.</p>
                            <button 
                                onClick={() => handleRegenerateImage()}
                                disabled={isGeneratingImage}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/20"
                            >
                                Generate Initial Visual
                            </button>
                         </div>
                    )}

                    {/* SOURCE SECTION UNDER IMAGE - DEEP WEB INTEL */}
                    {post.sources && post.sources.length > 0 && (
                        <div className="mt-8 p-6 bg-slate-900 dark:bg-slate-950 rounded-2xl border border-indigo-500/10 shadow-2xl overflow-hidden relative group/sources">
                            {/* Decorative Grid Background */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                                 style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                            
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30">
                                        <Terminal className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Deep Search Knowledge Base</h3>
                                        <span className="text-sm font-bold text-white/90">Grounded in 2025 Analytics Intel</span>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                    <Network className="w-3 h-3 text-white/40" />
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter">Multi-Source Verification</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
                                {post.sources.map((source, idx) => (
                                    <a 
                                        key={idx} 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="group flex flex-col gap-2 p-3.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/40 hover:shadow-indigo-500/10 hover:shadow-lg transition-all duration-300"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="p-1.5 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                                                <Link2 className="w-3 h-3 text-indigo-300" />
                                            </div>
                                            <ExternalLink className="w-3 h-3 text-white/10 group-hover:text-white/40 transition-colors" />
                                        </div>
                                        <div className="flex flex-col min-w-0 mt-1">
                                            <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors truncate">
                                                {source.title || 'Intel Node'}
                                            </span>
                                            <span className="text-[10px] text-white/30 font-mono truncate lowercase mt-1 group-hover:text-indigo-300/50 transition-colors">
                                                {source.uri?.replace('https://', '').replace('www.', '').split('/')[0]}
                                            </span>
                                        </div>
                                    </a>
                                ))}
                            </div>

                            <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-6 overflow-x-auto pb-1 no-scrollbar">
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <Globe className="w-3 h-3 text-white/20" />
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Web Index</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <Hash className="w-3 h-3 text-white/20" />
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Social Threads</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <Cpu className="w-3 h-3 text-white/20" />
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Dev Docs</span>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2">
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Safety Tier:</span>
                                    <Shield className="w-3 h-3 text-emerald-500/40" />
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
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
                        <span className="relative z-10">AUTO POST NOW</span>
                    </button>
                    <button 
                      onClick={() => handleRegenerateImage('3D Render')}
                      disabled={isGeneratingImage}
                      className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-xl text-sm font-bold transition-all shadow-sm text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
                    >
                        {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cube className="w-4 h-4" />}
                        3D Re-render
                    </button>
                    <button 
                      onClick={() => { copyToClipboard(post.content); setShareMessage('Text Copied!'); setTimeout(() => setShareMessage(null), 2000); }} 
                      className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                        <Copy className="w-4 h-4" />
                        Copy
                    </button>
                 </div>
                 <CharacterCounter text={post.content} platform={formData.platform} />
             </div>
          </div>
       </div>

       <div className="flex items-center justify-center gap-4 py-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Omni-Channel Distribution:</span>
          {(['LinkedIn', 'X (Twitter)', 'Medium', 'Instagram'] as Platform[]).map(p => (
              <button 
                key={p} 
                onClick={() => handleAutoPublish(p)}
                className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 grayscale hover:grayscale-0 opacity-40 hover:opacity-100"
                title={`Post to ${p}`}
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