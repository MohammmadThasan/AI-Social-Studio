import React, { useState, useEffect } from 'react';
import { GeneratedPost, FormData, ImageStyle, Platform, FacebookPage, FacebookUser } from '../types';
import { generatePostImage } from '../services/geminiService';
import { initFacebookSdk, loginToFacebook, getFacebookUser, getFacebookPages, publishToFacebookPage, setFacebookAppId, hasFacebookAppId, checkLoginStatus } from '../services/facebookService';
import ReactMarkdown from 'react-markdown';
import { 
  Copy, Check, Share2, ExternalLink, Globe, Linkedin, Facebook, Download, 
  RefreshCw, Palette, Twitter, Instagram, Smartphone, Loader2, LogIn, 
  ChevronDown, Settings, BookOpen, Sparkles, Zap, MonitorPlay,
  User, ThumbsUp, MessageSquare, Repeat, Send, Bookmark, MoreHorizontal, Heart, AlertCircle
} from 'lucide-react';

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
        const storedManualPref = localStorage.getItem('fb_manual_mode');
        if (storedManualPref === 'true') {
            setUseManualFb(true);
            return;
        }

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

        await initFacebookSdk().catch(err => console.error("FB Init Error", err));

        if (appId) {
            try {
                await checkLoginStatus();
                setIsConnectingFb(true);
                const user = await getFacebookUser();
                setFbUser(user);
                
                const pages = await getFacebookPages(user.id);
                setFbPages(pages);
                if (pages.length > 0) setSelectedFbPage(pages[0]);
                setIsConnectingFb(false);
            } catch (e) {
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
        if (!/^\d+$/.test(trimmedId)) {
            throw new Error("Invalid App ID. It must be a numeric ID (e.g., 123456789), not an email or name.");
        }
        setFacebookAppId(trimmedId);
        localStorage.setItem('fb_app_id', trimmedId);
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
      await publishToFacebookPage(selectedFbPage.id, selectedFbPage.access_token, post.content, post.imageUrl);
      setFbPublishSuccess(`Successfully posted to ${selectedFbPage.name}!`);
    } catch (err: any) {
      console.error(err);
      setFbError(err.message || "Failed to publish to Facebook Page.");
    } finally {
      setIsPublishingFb(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Clipboard API failed', err);
      }
    }
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
        case 'LinkedIn': url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodedText}`; break;
        case 'X (Twitter)': url = `https://twitter.com/intent/tweet?text=${encodedText}`; break;
        case 'Facebook': url = `https://www.facebook.com/`; break;
        case 'Instagram': url = `https://www.instagram.com/`; break;
        case 'Medium': url = `https://medium.com/new-story`; break;
    }

    if (url) window.open(url, '_blank', 'width=1000,height=800,noopener,noreferrer');
    await copyToClipboard(post.content);
    if (post.imageUrl) handleDownloadImage();

    let message = 'Text copied & Image saved!';
    setShareMessage(message);
    setTimeout(() => setShareMessage(null), 6000);
  };

  // Mock Components for Preview
  const PlatformIcon = ({ platform }: { platform: Platform }) => {
      switch(platform) {
          case 'LinkedIn': return <Linkedin className="w-5 h-5 text-[#0a66c2]" />;
          case 'X (Twitter)': return <Twitter className="w-5 h-5 text-black dark:text-white" />;
          case 'Facebook': return <Facebook className="w-5 h-5 text-[#0866ff]" />;
          case 'Instagram': return <Instagram className="w-5 h-5 text-[#E1306C]" />;
          case 'Medium': return <BookOpen className="w-5 h-5 text-slate-800 dark:text-slate-200" />;
          default: return <Share2 className="w-5 h-5 text-slate-500" />;
      }
  };

  const MockProfileHeader = ({ platform }: { platform: Platform }) => (
    <div className="flex items-center gap-3 mb-4">
       <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600">
         <User className="w-5 h-5 text-slate-400" />
       </div>
       <div className="flex flex-col leading-tight">
         <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1">
            Your Name
         </span>
         <span className="text-xs text-slate-500 flex items-center gap-1">
           Now • <Globe className="w-3 h-3" />
         </span>
       </div>
       <div className="ml-auto opacity-40 hover:opacity-100 cursor-pointer">
          <MoreHorizontal className="w-5 h-5 text-slate-500" />
       </div>
    </div>
  );

  const MockEngagement = ({ platform }: { platform: Platform }) => {
      if (platform === 'LinkedIn') {
        return (
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-6 text-slate-500 text-sm font-medium">
                    <div className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 -ml-2 rounded cursor-pointer transition-colors">
                        <ThumbsUp className="w-4 h-4 transform -scale-x-100" /> Like
                    </div>
                    <div className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded cursor-pointer transition-colors">
                        <MessageSquare className="w-4 h-4" /> Comment
                    </div>
                    <div className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded cursor-pointer transition-colors">
                        <Repeat className="w-4 h-4" /> Repost
                    </div>
                    <div className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded cursor-pointer transition-colors">
                        <Send className="w-4 h-4" /> Send
                    </div>
                </div>
            </div>
        );
      }
      return null;
  };

  const ImageSection = () => (
      <div className="mt-5 mb-2 group relative">
        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-center items-center min-h-[200px] relative">
            {isRegeneratingImage && (
                <div className="absolute inset-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin mb-2" />
                    <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">Refining visual...</span>
                </div>
            )}
            
            <img 
                src={post!.imageUrl} 
                alt="Generated AI Art" 
                className="w-full h-auto object-cover max-h-[500px]"
            />
            
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                    onClick={handleDownloadImage}
                    className="bg-black/70 backdrop-blur text-white p-2 rounded-lg hover:bg-black/90 transition-colors shadow-sm"
                    title="Download"
                >
                    <Download className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Style Controls */}
        <div className="mt-2 flex items-center justify-between px-1">
             <div className="flex items-center gap-2">
                 <Palette className="w-3.5 h-3.5 text-slate-400" />
                 <select 
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value as ImageStyle)}
                    className="bg-transparent border-none text-xs text-slate-600 dark:text-slate-400 focus:ring-0 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 py-0 pl-0 pr-6 font-medium"
                    disabled={isRegeneratingImage}
                  >
                    {IMAGE_STYLES.map(style => (
                      <option key={style} value={style} className="dark:bg-slate-800">{style}</option>
                    ))}
                  </select>
             </div>
             <button
                onClick={handleRegenerateImage}
                disabled={isRegeneratingImage}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
             >
                <RefreshCw className={`w-3 h-3 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                Regenerate
             </button>
        </div>
      </div>
  );


  // Loading State
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 h-full flex flex-col items-center justify-center text-center min-h-[600px] relative overflow-hidden">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
           <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Generating Content</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
           Analyzing <strong>{formData.topic}</strong> trends and drafting your post...
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 h-full flex flex-col items-center justify-center text-center min-h-[500px]">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-4 text-red-500 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Generation Paused</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-sm">
          Try refreshing
        </button>
      </div>
    );
  }

  // Empty State
  if (!post) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 h-full flex flex-col items-center justify-center text-center min-h-[600px]">
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
             <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Ready to Create</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
          Select a topic to start. AI will research the web, write your post, and design a custom image.
        </p>
      </div>
    );
  }

  // Action Button Rendering (Top)
  const renderPrimaryAction = () => {
    switch (formData.platform) {
      case 'LinkedIn':
        return (
          <button onClick={() => handleSmartShare('LinkedIn')} className="bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm">
            <Linkedin className="w-4 h-4" />
            <span>Post</span>
          </button>
        );
      case 'X (Twitter)':
        return (
          <button onClick={() => handleSmartShare('X (Twitter)')} className="bg-black dark:bg-slate-950 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm">
            <Twitter className="w-4 h-4" />
            <span>Post</span>
          </button>
        );
      case 'Facebook':
        if (fbUser && selectedFbPage && !useManualFb) {
           return (
              <button 
                onClick={handleDirectFacebookPublish}
                disabled={isPublishingFb}
                className="bg-[#0866ff] hover:bg-[#004ddb] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm"
              >
                {isPublishingFb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span>Publish</span>
              </button>
           );
        }
        return (
             <button onClick={() => handleSmartShare('Facebook')} className="bg-[#0866ff] text-white hover:bg-[#0054d1] px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm">
               <Facebook className="w-4 h-4" />
               <span>Copy</span>
             </button>
        );
      case 'Medium':
        return (
          <button onClick={() => handleSmartShare('Medium')} className="bg-black dark:bg-slate-950 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm">
            <BookOpen className="w-4 h-4" />
            <span>Open</span>
          </button>
        );
      case 'Instagram':
        return (
          <button 
            onClick={() => handleSmartShare('Instagram')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm text-sm"
          >
            <Instagram className="w-4 h-4" />
            <span>Share</span>
          </button>
        );
    }
  };
  
  // Facebook Config Panel
  const renderFacebookConfig = () => {
      if (formData.platform !== 'Facebook') return null;
  
      if (useManualFb) {
        return (
          <div className="mt-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manual Mode</span>
             </div>
             <button onClick={() => toggleManualMode(false)} className="text-xs text-[#0866ff] dark:text-[#4e92ff] font-medium hover:underline">
               Enable Auto-Post
             </button>
          </div>
        );
      }
  
      return (
        <div className="mt-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
          <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mb-3">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            Facebook Automation
          </h4>
  
          {fbPublishSuccess ? (
             <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2 text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
               <Check className="w-3 h-3" /> {fbPublishSuccess}
               <button onClick={() => setFbPublishSuccess(null)} className="ml-auto underline">Reset</button>
             </div>
          ) : (
            <>
              {!fbUser ? (
                <div className="space-y-2">
                   {needsAppId && (
                     <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">App ID</label>
                        <input 
                          type="text" 
                          value={customAppId}
                          onChange={(e) => setCustomAppId(e.target.value)}
                          placeholder="Meta App ID"
                          className="w-full text-xs border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded py-1 px-2 focus:ring-[#0866ff] focus:border-[#0866ff]"
                        />
                     </div>
                   )}
                   <button 
                    onClick={handleFacebookLogin}
                    disabled={isConnectingFb || (needsAppId && !customAppId)}
                    className="w-full bg-[#0866ff]/10 hover:bg-[#0866ff]/20 text-[#0866ff] dark:text-[#4e92ff] py-1.5 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                   >
                     {isConnectingFb ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                     {needsAppId ? 'Connect App' : 'Login with Facebook'}
                   </button>
                   
                   <div className="text-center">
                      <button onClick={() => toggleManualMode(true)} className="text-[10px] text-slate-400 hover:text-indigo-500 underline">Switch to Manual</button>
                   </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                      {fbUser.picture?.data?.url && (
                          <img src={fbUser.picture.data.url} alt="Profile" className="w-6 h-6 rounded-full" />
                      )}
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate flex-1">As {fbUser.name}</p>
                  </div>
                  <div className="relative">
                     <select 
                       className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 pl-2 pr-6 text-xs text-slate-700 dark:text-slate-300"
                       value={selectedFbPage?.id || ''}
                       onChange={(e) => setSelectedFbPage(fbPages.find(p => p.id === e.target.value) || null)}
                     >
                       {fbPages.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}
                     </select>
                     <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}
              {fbError && <div className="mt-2 text-[10px] text-red-500 bg-red-50 dark:bg-red-900/10 p-1.5 rounded border border-red-100 dark:border-red-900/30">{fbError}</div>}
            </>
          )}
        </div>
      );
    };

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden transition-colors duration-300">
      
      {/* Toast Notification */}
      {shareMessage && (
        <div className="absolute top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
           <div className="mx-auto max-w-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
             <div className="bg-emerald-500 rounded-full p-1 flex-shrink-0">
               <Check className="w-3 h-3 text-white" />
             </div>
             <p className="font-medium text-sm">{shareMessage}</p>
           </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col h-full">
        
        {/* Top Bar with Actions */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex items-center justify-between">
           <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                <PlatformIcon platform={formData.platform} />
              </div>
              <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Generated Result</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ready to publish</p>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <button onClick={handleCopy} className={`p-2 rounded-lg border transition-all ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`} title="Copy Text">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              {renderPrimaryAction()}
           </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30 p-6 md:p-8">
           
           {/* Research Context Callout - Clean, Professional */}
           {post.researchSummary && (
              <div className="mb-6 flex items-start gap-4 p-4 bg-white dark:bg-slate-900 border-l-4 border-indigo-500 rounded-r-lg shadow-sm">
                 <div className="pt-0.5">
                    <Zap className="w-4 h-4 text-indigo-500" />
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Research Insight</span>
                       <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {post.contentAngle}
                       </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                       {post.researchSummary}
                    </p>
                 </div>
              </div>
           )}

           {/* Social Post Preview Card */}
           <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 transition-colors duration-300 max-w-3xl mx-auto">
              
              <MockProfileHeader platform={formData.platform} />
              
              {/* Content Body - Refined Typography */}
              <div className={`prose prose-slate dark:prose-invert max-w-none mb-6 
                  prose-p:text-[15px] prose-p:leading-7 prose-p:text-slate-700 dark:prose-p:text-slate-300 
                  prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-white
                  prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
                  ${formData.platform === 'X (Twitter)' ? 'whitespace-pre-wrap font-sans' : ''}`}>
                 <ReactMarkdown>
                    {post.content}
                 </ReactMarkdown>
              </div>

              {/* Image Integration */}
              {post.imageUrl && (
                 <ImageSection />
              )}

              <MockEngagement platform={formData.platform} />

           </div>

           {/* Sources List */}
           {post.sources.length > 0 && (
              <div className="mt-8 max-w-3xl mx-auto">
                 <div className="flex items-center justify-between mb-3 px-1">
                    <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                       <Globe className="w-3.5 h-3.5" /> Sources Cited
                    </h5>
                    <button onClick={handleCopySources} className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors">
                       {sourcesCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                       {sourcesCopied ? 'Copied' : 'Copy All'}
                    </button>
                 </div>
                 <div className="space-y-2">
                    {post.sources.map((source, idx) => (
                       <a 
                         key={idx}
                         href={source.uri}
                         target="_blank"
                         rel="noopener noreferrer" 
                         className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all group"
                       >
                          <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded text-slate-400 group-hover:text-indigo-500 transition-colors">
                             <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-300 truncate flex-1 font-medium">{source.title || source.uri}</span>
                       </a>
                    ))}
                 </div>
              </div>
           )}

        </div>
        
        {/* Settings Panel Footer (Facebook) */}
        {renderFacebookConfig() && (
           <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              {renderFacebookConfig()}
           </div>
        )}
      </div>
    </div>
  );
};

export default PostResult;