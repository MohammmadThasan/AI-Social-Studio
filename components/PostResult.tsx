import React, { useState, useEffect } from 'react';
import { GeneratedPost, FormData, ImageStyle, Platform, FacebookPage, FacebookUser } from '../types';
import { generatePostImage } from '../services/geminiService';
import { initFacebookSdk, loginToFacebook, getFacebookUser, getFacebookPages, publishToFacebookPage, setFacebookAppId, hasFacebookAppId, checkLoginStatus } from '../services/facebookService';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Share2, ExternalLink, Globe, Linkedin, Facebook, Download, ImageIcon, RefreshCw, Palette, Twitter, Instagram, Smartphone, Loader2, ArrowUpRight, LogIn, ChevronDown, Settings, BookOpen, Sparkles, Zap, AlertTriangle, MonitorPlay } from 'lucide-react';

interface PostResultProps {
  post: GeneratedPost | null;
  isLoading: boolean;
  error: string | null;
  formData: FormData;
  onImageUpdate: (url: string) => void;
}

const IMAGE_STYLES: ImageStyle[] = ['Minimalist', 'Photorealistic', 'Abstract', 'Cyberpunk', 'Corporate', 'Watercolor'];

const PostResult: React.FC<PostResultProps> = ({ post, isLoading, error, formData, onImageUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [sourcesCopied, setSourcesCopied] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('Minimalist');
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  // Facebook Specific State
  const [fbUser, setFbUser] = useState<FacebookUser | null>(null);
  const [fbPages, setFbPages] = useState<FacebookPage[]>([]);
  const [selectedFbPage, setSelectedFbPage] = useState<FacebookPage | null>(null);
  const [isConnectingFb, setIsConnectingFb] = useState(false);
  const [isPublishingFb, setIsPublishingFb] = useState(false);
  const [fbPublishSuccess, setFbPublishSuccess] = useState<string | null>(null);
  const [fbError, setFbError] = useState<string | null>(null);
  const [useManualFb, setUseManualFb] = useState(false);
  
  // App ID Management
  const [needsAppId, setNeedsAppId] = useState(false);
  const [customAppId, setCustomAppId] = useState('');

  // Auto-connect logic
  useEffect(() => {
    if (formData.platform === 'Facebook') {
      const initializeFacebook = async () => {
        // Check if user prefers manual mode
        const storedManualPref = localStorage.getItem('fb_manual_mode');
        if (storedManualPref === 'true') {
            setUseManualFb(true);
            return;
        }

        // 1. Check for env ID or localStorage ID
        let appId = process.env.FACEBOOK_APP_ID;
        const storedId = localStorage.getItem('fb_app_id');
        
        if (!appId && storedId) {
            appId = storedId;
            setCustomAppId(storedId);
        }

        if (appId) {
            setFacebookAppId(appId);
            setNeedsAppId(false);
        } else {
            setNeedsAppId(true);
        }

        // 2. Init SDK
        await initFacebookSdk().catch(err => console.error("FB Init Error", err));

        // 3. Try to restore session if we have an App ID
        if (appId) {
            try {
                // Determine if we are already connected
                await checkLoginStatus();
                // If successful, fetch data
                setIsConnectingFb(true);
                const user = await getFacebookUser();
                setFbUser(user);
                
                const pages = await getFacebookPages(user.id);
                setFbPages(pages);
                if (pages.length > 0) setSelectedFbPage(pages[0]);
                setIsConnectingFb(false);
            } catch (e) {
                // Not connected, user needs to click button
                console.log("User not currently logged in to FB");
            }
        }
      };

      initializeFacebook();
    }
  }, [formData.platform]);

  const toggleManualMode = (enabled: boolean) => {
      setUseManualFb(enabled);
      localStorage.setItem('fb_manual_mode', String(enabled));
      setFbError(null);
      
      if (!enabled) {
          // If switching back to auto, trigger init check again
          const hasId = hasFacebookAppId() || !!localStorage.getItem('fb_app_id');
          setNeedsAppId(!hasId);
          if (hasId) {
              const id = localStorage.getItem('fb_app_id');
              if (id) {
                  setCustomAppId(id);
                  setFacebookAppId(id);
              }
          }
      }
  };

  const handleFacebookLogin = async () => {
    setIsConnectingFb(true);
    setFbError(null);
    try {
      if (needsAppId) {
        if (!customAppId) throw new Error("Please enter a Facebook App ID.");
        
        const trimmedId = customAppId.trim();

        // Validate Numeric
        if (!/^\d+$/.test(trimmedId)) {
            throw new Error("Invalid App ID. It must be a numeric ID (e.g., 123456789), not an email or name.");
        }
        
        setFacebookAppId(trimmedId);
        localStorage.setItem('fb_app_id', trimmedId);
        
        // Re-init SDK with new ID
        await initFacebookSdk(); 
      }
      
      await loginToFacebook();
      const user = await getFacebookUser();
      setFbUser(user);
      setNeedsAppId(false);
      
      const pages = await getFacebookPages(user.id);
      setFbPages(pages);
      if (pages.length > 0) {
        setSelectedFbPage(pages[0]);
      }
    } catch (err: any) {
      console.error(err);
      const msg = typeof err === 'string' ? err : err?.message || "Failed to connect.";
      
      if (msg.includes("Invalid App ID")) {
          setFbError("The App ID provided is invalid. Note: Your Profile ID (from the URL) is NOT an App ID. You must create an App in developers.facebook.com.");
      } else {
          setFbError(msg);
      }
    } finally {
      setIsConnectingFb(false);
    }
  };

  const handleDirectFacebookPublish = async () => {
    if (!post || !selectedFbPage) return;

    setIsPublishingFb(true);
    setFbError(null);
    setFbPublishSuccess(null);

    try {
      await publishToFacebookPage(selectedFbPage.id, selectedFbPage.access_token, post.content);
      setFbPublishSuccess(`Successfully posted to ${selectedFbPage.name}!`);
    } catch (err: any) {
      console.error(err);
      setFbError(err.message || "Failed to publish to Facebook Page.");
    } finally {
      setIsPublishingFb(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    // Try modern API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Clipboard API failed', err);
      }
    }
    // Fallback to legacy
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleCopy = async () => {
    if (post) {
      const success = await copyToClipboard(post.content);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleCopySources = async () => {
    if (post && post.sources.length > 0) {
      const text = post.sources.map(s => `${s.title || 'Source'}: ${s.uri}`).join('\n');
      const success = await copyToClipboard(text);
      if (success) {
        setSourcesCopied(true);
        setTimeout(() => setSourcesCopied(false), 2000);
      }
    }
  };

  const handleDownloadImage = () => {
    if (post?.imageUrl) {
      const link = document.createElement('a');
      link.href = post.imageUrl;
      link.download = `insightgen-${formData.platform.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRegenerateImage = async () => {
    if (!post || isRegeneratingImage) return;
    
    setIsRegeneratingImage(true);
    try {
      const newImageUrl = await generatePostImage(formData, selectedStyle);
      if (newImageUrl) {
        onImageUpdate(newImageUrl);
      }
    } catch (err) {
      console.error("Failed to regenerate image", err);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleSmartShare = async (targetPlatform: Platform) => {
    if (!post) return;
    
    setShareMessage('Preparing post...');

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const canNativeShare = isMobile && navigator.share && navigator.canShare && post.imageUrl;

    if (canNativeShare) {
      await copyToClipboard(post.content);

      try {
        const res = await fetch(post.imageUrl!);
        const blob = await res.blob();
        const file = new File([blob], 'post.png', { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `My ${targetPlatform} Post`,
            text: post.content 
          });
          setShareMessage('Text copied! Image shared.'); 
          setTimeout(() => setShareMessage(null), 3000);
          return; 
        }
      } catch (err) {
        console.log('Native share failed, falling back to web flow', err);
      }
    }

    let url = '';
    const encodedText = encodeURIComponent(post.content);

    switch (targetPlatform) {
        case 'LinkedIn':
            url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodedText}`;
            break;
        case 'X (Twitter)':
            url = `https://twitter.com/intent/tweet?text=${encodedText}`;
            break;
        case 'Facebook':
            url = `https://www.facebook.com/`; 
            break;
        case 'Instagram':
            url = `https://www.instagram.com/`; 
            break;
        case 'Medium':
            url = `https://medium.com/new-story`;
            break;
    }

    if (url) {
        window.open(url, '_blank', 'width=1000,height=800,noopener,noreferrer');
    }

    await copyToClipboard(post.content);

    if (post.imageUrl) {
      handleDownloadImage();
    }

    let message = 'Text copied & Image saved!';
    setShareMessage(message);
    setTimeout(() => setShareMessage(null), 6000);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 h-full flex flex-col items-center justify-center text-center min-h-[500px]">
        <div className="relative mb-6">
           <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center relative z-10">
             <Globe className="w-8 h-8 text-indigo-600 animate-pulse" />
           </div>
           <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
        </div>
        <h3 className="text-xl font-bold text-slate-900">Researching & Writing</h3>
        <div className="mt-4 flex flex-col space-y-2 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Searching latest papers & news...</span>
          </div>
          <div className="flex items-center gap-2">
             <Check className="w-4 h-4 text-emerald-500" />
            <span>Analyzing {formData.topic} trends...</span>
          </div>
          <div className="flex items-center gap-2 opacity-75">
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            <span>Drafting human-sounding {formData.platform} post...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 h-full flex flex-col items-center justify-center text-center min-h-[500px]">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
          <Smartphone className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Generation Paused</h3>
        <p className="text-slate-500 mt-2 max-w-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 text-indigo-600 font-medium hover:underline">
          Try refreshing
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border-0 p-8 h-full flex flex-col items-center justify-center text-center min-h-[500px]">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl shadow-inner flex items-center justify-center mb-6 transform rotate-3">
          <Share2 className="w-10 h-10 text-indigo-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Ready to Research</h3>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
          Select a topic on the left. AI will browse the open web for the latest breakthroughs and write a human-quality post for you.
        </p>
      </div>
    );
  }

  const renderPrimaryAction = () => {
    switch (formData.platform) {
      case 'LinkedIn':
        return (
          <button onClick={() => handleSmartShare('LinkedIn')} className="flex-1 bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <Linkedin className="w-5 h-5" />
            <span>Post to LinkedIn</span>
          </button>
        );
      case 'X (Twitter)':
        return (
          <button onClick={() => handleSmartShare('X (Twitter)')} className="flex-1 bg-black hover:bg-gray-800 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <Twitter className="w-5 h-5" />
            <span>Post to X</span>
          </button>
        );
      case 'Facebook':
        // Modified: If connected to a page AND not in manual mode, make the primary button the Auto-Post button
        if (fbUser && selectedFbPage && !useManualFb) {
           return (
              <button 
                onClick={handleDirectFacebookPublish}
                disabled={isPublishingFb}
                className="flex-1 bg-[#0866ff] hover:bg-[#004ddb] text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                {isPublishingFb ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                <span>Publish to {selectedFbPage.name}</span>
              </button>
           );
        }
        // Fallback or Manual
        return (
          <div className="flex-1 flex gap-2">
             <button onClick={() => handleSmartShare('Facebook')} className="flex-1 bg-white border border-[#0866ff] text-[#0866ff] hover:bg-[#0866ff]/5 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm">
               <Facebook className="w-5 h-5" />
               <span>Copy & Open Profile (Manual)</span>
             </button>
          </div>
        );
      case 'Medium':
        return (
          <button onClick={() => handleSmartShare('Medium')} className="flex-1 bg-black text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <BookOpen className="w-5 h-5" />
            <span>Open Medium</span>
          </button>
        );
      case 'Instagram':
        return (
          <button 
            onClick={() => handleSmartShare('Instagram')}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Instagram className="w-5 h-5" />
            <span>Prepare for Instagram</span>
          </button>
        );
    }
  };

  // Render Facebook Direct Publish Section (Config Area)
  const renderFacebookConfig = () => {
    if (formData.platform !== 'Facebook') return null;

    if (useManualFb) {
      return (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Manual Posting Mode Active</span>
           </div>
           <button 
             onClick={() => toggleManualMode(false)} 
             className="text-xs text-[#0866ff] font-medium hover:underline"
           >
             Try Automation (Requires App ID)
           </button>
        </div>
      );
    }

    return (
      <div className="mt-4 bg-[#0866ff]/5 border border-[#0866ff]/20 rounded-xl p-4">
        <h4 className="text-sm font-bold text-[#0866ff] flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4" />
          Facebook Page Automation
        </h4>

        {fbPublishSuccess ? (
           <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
             <Check className="w-4 h-4" />
             {fbPublishSuccess}
             <button onClick={() => setFbPublishSuccess(null)} className="ml-auto text-xs underline">Post Another</button>
           </div>
        ) : (
          <>
            {!fbUser ? (
              <div className="space-y-3">
                 {needsAppId && (
                   <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                         <Settings className="w-3 h-3" /> 
                         Meta Developer App ID
                      </label>
                      <input 
                        type="text" 
                        value={customAppId}
                        onChange={(e) => setCustomAppId(e.target.value)}
                        placeholder="e.g. 1234567890"
                        className="w-full text-sm border-slate-200 rounded-md py-1.5 px-2 focus:ring-[#0866ff] focus:border-[#0866ff]"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Must come from <a href="https://developers.facebook.com" target="_blank" className="underline hover:text-indigo-600">developers.facebook.com</a>. <br/>
                        <span className="text-red-400">Do NOT use your Profile ID (e.g. 615...)</span>.
                      </p>
                   </div>
                 )}
                 
                 <button 
                  onClick={handleFacebookLogin}
                  disabled={isConnectingFb || (needsAppId && !customAppId)}
                  className="w-full bg-[#0866ff] hover:bg-[#004ddb] text-white py-2 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                 >
                   {isConnectingFb ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                   {needsAppId ? 'Set ID & Connect' : 'Connect Facebook Page'}
                 </button>
                 
                 <div className="text-center">
                    <button 
                      onClick={() => toggleManualMode(true)}
                      className="text-[11px] text-slate-500 underline hover:text-indigo-600"
                    >
                      Don't have a Developer App ID? Switch to Manual Mode
                    </button>
                 </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                    {fbUser.picture?.data?.url && (
                        <img src={fbUser.picture.data.url} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
                    )}
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-medium text-slate-900 truncate">Connected as {fbUser.name}</p>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Target Page</label>
                  {fbPages.length === 0 ? (
                    <div className="text-sm text-red-500 bg-red-50 p-2 rounded">No pages found for this account.</div>
                  ) : (
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-white border border-[#0866ff]/30 rounded-lg py-2 pl-3 pr-8 text-sm text-slate-700 focus:ring-1 focus:ring-[#0866ff] focus:border-[#0866ff]"
                        value={selectedFbPage?.id || ''}
                        onChange={(e) => setSelectedFbPage(fbPages.find(p => p.id === e.target.value) || null)}
                      >
                        {fbPages.map(page => (
                          <option key={page.id} value={page.id}>{page.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {fbError && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="break-words">{fbError}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-xl shadow-slate-200/60 flex flex-col h-full overflow-hidden">
      
      {shareMessage && (
        <div className="absolute top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
           <div className="mx-auto max-w-md bg-slate-800 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
             <div className="bg-emerald-500 rounded-full p-1 flex-shrink-0">
               <Check className="w-4 h-4 text-white" />
             </div>
             <div className="flex-1">
                <p className="font-semibold text-sm">{shareMessage}</p>
             </div>
           </div>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-white z-10">
         <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
            <div>
               <h3 className="font-bold text-slate-900 text-lg">Generated Result</h3>
               <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mt-1">{formData.platform} • {formData.tone}</p>
            </div>
            <div className="flex items-center gap-2">
               <button
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5 ${
                    copied 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
            </div>
         </div>
         
         <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {renderPrimaryAction()}
            </div>
            {renderFacebookConfig()}
         </div>
      </div>

      {/* Content Area */}
      <div className="p-6 md:p-8 overflow-y-auto max-h-[700px] flex-grow bg-[#F8FAFC]">
        
        {/* Research Insight Card */}
        {post.researchSummary && (
          <div className="mb-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Research Insight</span>
            </div>
            <p className="text-sm text-slate-700 italic leading-relaxed">"{post.researchSummary}"</p>
            <div className="mt-3 flex items-center gap-2">
                <span className="bg-white px-2 py-1 rounded-md text-[10px] font-medium text-slate-500 border border-slate-200 shadow-sm flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Angle: {post.contentAngle}
                </span>
            </div>
          </div>
        )}

        {/* Image */}
        {post.imageUrl && (
          <div className="mb-8">
             <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 group relative bg-slate-50 flex justify-center items-center min-h-[300px]">
              {isRegeneratingImage && (
                <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                   <div className="flex flex-col items-center animate-pulse">
                     <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                     <span className="text-sm font-bold text-indigo-900">Designing new visual...</span>
                   </div>
                </div>
              )}
              
              <img 
                src={post.imageUrl} 
                alt="Generated AI Art" 
                className="max-h-[550px] w-auto max-w-full object-contain mx-auto shadow-sm"
              />
              
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={handleDownloadImage}
                  className="bg-white/90 backdrop-blur text-slate-900 p-2 rounded-lg shadow-sm hover:bg-white transition-colors"
                  title="Download Image"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Controls */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center space-x-2 text-sm text-slate-700">
                  <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                    <Palette className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs uppercase tracking-wide text-slate-500">Style:</span>
                  <select 
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value as ImageStyle)}
                    className="bg-transparent border-none text-sm font-medium text-slate-900 focus:ring-0 cursor-pointer hover:text-indigo-600 py-0 pl-0 pr-6"
                    disabled={isRegeneratingImage}
                  >
                    {IMAGE_STYLES.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
               </div>
               
               <button
                  onClick={handleRegenerateImage}
                  disabled={isRegeneratingImage}
                  className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all disabled:opacity-50"
               >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                  <span>Redesign</span>
               </button>
            </div>
          </div>
        )}

        {/* Text Content */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className={`prose prose-slate prose-indigo max-w-none text-slate-800 leading-relaxed ${formData.platform === 'X (Twitter)' ? 'whitespace-pre-wrap' : ''}`}>
            <ReactMarkdown
              components={{
                p: ({children}) => <p className="mb-4 whitespace-pre-wrap">{children}</p>,
                ul: ({children}) => <ul className="list-disc pl-4 mb-4 space-y-2 marker:text-indigo-400">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal pl-4 mb-4 space-y-2 marker:text-indigo-400">{children}</ol>,
                li: ({children}) => <li className="pl-1">{children}</li>,
                strong: ({children}) => <span className="font-bold text-slate-900 bg-indigo-50 px-1 rounded">{children}</span>,
                h1: ({children}) => <h1 className="text-xl font-bold mb-3 text-slate-900 border-b pb-2">{children}</h1>,
                h2: ({children}) => <h2 className="text-lg font-bold mb-3 text-slate-900 mt-6">{children}</h2>,
                h3: ({children}) => <h3 className="text-base font-bold mb-2 text-slate-900 mt-4">{children}</h3>,
                a: ({children, href}) => <a href={href} className="text-indigo-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">{children}</a>
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Sources Footer */}
      {post.sources.length > 0 && (
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Research Sources
            </p>
            <button 
               onClick={handleCopySources}
               className="flex items-center space-x-1 text-slate-500 hover:text-indigo-600 transition-colors font-medium"
               title="Copy all source URLs"
             >
                {sourcesCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{sourcesCopied ? 'Copied' : 'Copy Links'}</span>
             </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {post.sources.map((source, idx) => (
                <a 
                  key={idx}
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors truncate max-w-[200px]"
                >
                  <ExternalLink className="w-3 h-3 mr-1.5 flex-shrink-0 opacity-50" />
                  <span className="truncate">{source.title || 'Source'}</span>
                </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostResult;