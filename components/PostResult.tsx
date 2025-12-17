
import React, { useState, useEffect } from 'react';
import { GeneratedPost, FormData, ImageStyle, Platform, FacebookPage, FacebookUser } from '../types';
import { PLATFORM_SPECS } from '../constants';
import { generatePostImage, rewritePost } from '../services/geminiService';
import { initFacebookSdk, loginToFacebook, getFacebookUser, getFacebookPages, publishToFacebookPage, setFacebookAppId, hasFacebookAppId, checkLoginStatus } from '../services/facebookService';
import ReactMarkdown from 'react-markdown';
import { 
  Copy, Check, Share2, ExternalLink, Globe, Linkedin, Facebook, Download, 
  RefreshCw, RefreshCcw, Palette, Twitter, Instagram, Loader2, LogIn, 
  ChevronDown, Settings, BookOpen, Sparkles, Zap, MonitorPlay,
  User, ThumbsUp, MessageSquare, Repeat, Send, MoreHorizontal, AlertCircle,
  RectangleHorizontal, RectangleVertical, Square, Sliders, Type, Search, Info,
  Code, Users, Briefcase, Layers, Calendar, Clock, Upload, Cuboid as Cube
} from 'lucide-react';

interface PostResultProps {
  post: GeneratedPost | null;
  isLoading: boolean;
  error: string | null;
  formData: FormData;
  onImageUpdate: (url: string) => void;
  onContentUpdate: (content: string) => void;
}

const IMAGE_STYLES: ImageStyle[] = ['3D Render', 'Photorealistic', 'Minimalist', 'Abstract', 'Cyberpunk', 'Corporate'];

const STYLE_PREVIEWS: Record<ImageStyle, string> = {
  '3D Render': 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
  'Minimalist': 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
  'Photorealistic': 'bg-gradient-to-br from-slate-700 to-black',
  'Abstract': 'bg-gradient-to-tr from-amber-200 via-violet-600 to-sky-900',
  'Cyberpunk': 'bg-slate-900 border border-cyan-500/50 shadow-[inset_0_0_10px_rgba(6,182,212,0.2)]',
  'Corporate': 'bg-gradient-to-br from-blue-900 to-slate-900',
  'Watercolor': 'bg-gradient-to-br from-sky-300 via-rose-300 to-lime-300',
};

// --- Character Counter Component ---
const CharacterCounter: React.FC<{ text: string; platform: Platform }> = ({ text, platform }) => {
  const specs = PLATFORM_SPECS[platform];
  const count = text.length;
  const isOverMax = count > specs.max;
  const isSweetSpot = count >= specs.sweetSpot[0] && count <= specs.sweetSpot[1];
  const isTooShort = count < specs.sweetSpot[0];
  const isTooLong = count > specs.sweetSpot[1] && !isOverMax;

  const visualMax = platform === 'Facebook' ? Math.max(200, count + 50) : specs.max;
  const percent = Math.min(100, (count / visualMax) * 100);

  let statusColor = 'bg-slate-200 dark:bg-slate-700'; 
  let textColor = 'text-slate-500';
  let statusText = '';
  let icon = <Info className="w-3 h-3" />;

  if (isOverMax) {
    statusColor = 'bg-red-500';
    textColor = 'text-red-600 dark:text-red-400';
    statusText = '❌ ERROR: Exceeds Hard Limit';
    icon = <AlertCircle className="w-3 h-3" />;
  } else if (isSweetSpot) {
    statusColor = 'bg-emerald-500';
    textColor = 'text-emerald-600 dark:text-emerald-400';
    statusText = '✅ OPTIMIZED';
    icon = <Check className="w-3 h-3" />;
  } else if (isTooShort || isTooLong) {
    statusColor = 'bg-amber-400';
    textColor = 'text-amber-600 dark:text-amber-400';
    statusText = `⚠️ WARNING: Outside Sweet Spot (${count} chars)`;
    icon = <Info className="w-3 h-3" />;
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
           <Type className="w-3 h-3" />
           Validation
        </span>
        <span className={`${textColor} flex items-center gap-1`}>
          {icon}
          {statusText}
        </span>
      </div>
      
      <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out rounded-full ${statusColor}`} 
          style={{ width: `${percent}%` }}
        />
        {specs.sweetSpot[0] > 0 && (
           <div 
             className="absolute top-0 bottom-0 w-0.5 bg-black/10 dark:bg-white/10" 
             style={{ left: `${(specs.sweetSpot[0] / visualMax) * 100}%` }} 
             title="Sweet Spot Start"
           />
        )}
        {specs.sweetSpot[1] < visualMax && (
           <div 
             className="absolute top-0 bottom-0 w-0.5 bg-black/10 dark:bg-white/10" 
             style={{ left: `${(specs.sweetSpot[1] / visualMax) * 100}%` }} 
             title="Sweet Spot End"
           />
        )}
      </div>

      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 dark:text-slate-500">
        <span>{count.toLocaleString()} / {specs.max.toLocaleString()}</span>
        {specs.cutoff && count > specs.cutoff && (
          <span className="text-orange-400 font-medium flex items-center gap-1">
             <Info className="w-2.5 h-2.5" /> Hook limit: ~{specs.cutoff}
          </span>
        )}
        <span>Target: {specs.sweetSpot[0]}-{specs.sweetSpot[1]}</span>
      </div>
    </div>
  );
};

const PostResult: React.FC<PostResultProps> = ({ post, isLoading, error, formData, onImageUpdate, onContentUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [sourcesCopied, setSourcesCopied] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('3D Render');
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  // Scheduling State
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  
  // Image Generation Settings
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showImageSettings, setShowImageSettings] = useState(false);

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

  // Sync default Aspect Ratio with Platform
  useEffect(() => {
    switch (formData.platform) {
      case 'Instagram': setAspectRatio('1:1'); break;
      case 'Facebook': setAspectRatio('4:3'); break;
      default: setAspectRatio('16:9'); break;
    }
  }, [formData.platform]);

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
                
                const storedPageId = localStorage.getItem('fb_selected_page_id');
                const targetPage = pages.find(p => p.id === storedPageId) || (pages.length > 0 ? pages[0] : null);
                if (targetPage) setSelectedFbPage(targetPage);
                
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
      
      const storedPageId = localStorage.getItem('fb_selected_page_id');
      const targetPage = pages.find(p => p.id === storedPageId) || (pages.length > 0 ? pages[0] : null);
      if (targetPage) {
        setSelectedFbPage(targetPage);
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
    setShareMessage(`Publishing to ${selectedFbPage.name}...`);

    try {
      await publishToFacebookPage(selectedFbPage.id, selectedFbPage.access_token, post.content, post.imageUrl);
      setFbPublishSuccess(`Successfully posted to ${selectedFbPage.name}!`);
      setShareMessage('Published successfully!');
      setTimeout(() => setShareMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFbError(err.message || "Failed to publish to Facebook Page.");
      setShareMessage('Publish failed.');
      setTimeout(() => setShareMessage(null), 3000);
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
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (err) {
        console.warn('Fallback: Unable to copy', err);
      }
      document.body.removeChild(textArea);
      if (!success) {
        console.error("Clipboard copy failed (both methods).");
      }
      return success;
    } catch (e) {
      console.error("Copy failed completely", e);
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
  
  const handleManualPost = async () => {
    if (!post) return;
    
    // 1. Copy Text
    await copyToClipboard(post.content);
    
    // 2. Download Image
    if (post.imageUrl) {
        handleDownloadImage();
    }

    // 3. Feedback
    setShareMessage('Text copied & Image saved for manual posting!');
    setTimeout(() => setShareMessage(null), 5000);
    
    // 4. Open Facebook
    window.open('https://facebook.com', '_blank');
  };

  const handleRegenerateImage = async () => {
    if (!post || isRegeneratingImage) return;
    setIsRegeneratingImage(true);
    try {
      const newImageUrl = await generatePostImage(formData, selectedStyle, aspectRatio, customPrompt);
      if (newImageUrl) {
        onImageUpdate(newImageUrl);
      }
    } catch (err) {
      console.error("Failed to regenerate image", err);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleRewrite = async (audience: string) => {
      if (!post || isRewriting) return;
      setIsRewriting(true);
      try {
          const newContent = await rewritePost(post.content, formData.platform, audience);
          onContentUpdate(newContent);
      } catch (e) {
          console.error(e);
      } finally {
          setIsRewriting(false);
      }
  };

  const handleSmartShare = async (targetPlatform: Platform) => {
    if (!post) return;

    // Facebook Auto-Post Logic
    if (targetPlatform === 'Facebook' && !useManualFb) {
         if (!fbUser) {
             setShareMessage('Connecting to Facebook...');
             await handleFacebookLogin();
             return;
         }
         if (!selectedFbPage) {
             setShareMessage("Please select a Page below.");
             setTimeout(() => setShareMessage(null), 3000);
             return;
         }
         await handleDirectFacebookPublish();
         return;
    }

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
  
  const handleConfirmSchedule = () => {
    if (!scheduleDate) return;
    const selected = new Date(scheduleDate);
    const now = new Date();
    if (selected <= now) {
      setShareMessage('Please select a future date and time.');
      setTimeout(() => setShareMessage(null), 3000);
      return;
    }
    const formattedDate = selected.toLocaleString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
    });
    setShareMessage(`Post scheduled for ${formattedDate}`);
    setShowSchedule(false);
    setTimeout(() => setShareMessage(null), 5000);
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

        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
           <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Image Studio</span>
              <button 
                onClick={() => setShowImageSettings(!showImageSettings)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                {showImageSettings ? 'Hide Prompt' : 'Custom Prompt'}
                <Sliders className="w-3 h-3" />
              </button>
           </div>
           <div className="mb-4">
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-2 font-medium">Visual Style</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                 {IMAGE_STYLES.map(style => (
                    <button
                        key={style}
                        onClick={() => setSelectedStyle(style)}
                        disabled={isRegeneratingImage}
                        className={`group relative flex flex-col gap-1.5 p-1.5 rounded-lg transition-all text-left ${
                            selectedStyle === style 
                                ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-indigo-500/50' 
                                : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <div className={`w-full aspect-[4/3] sm:aspect-square rounded-md overflow-hidden ${STYLE_PREVIEWS[style]} relative`}>
                             {style === 'Cyberpunk' && <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-cyan-900/50 to-transparent" />}
                             {style === '3D Render' && <div className="absolute inset-0 flex items-center justify-center"><Cube className="w-5 h-5 text-white animate-pulse" /></div>}
                             {style === 'Minimalist' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" /></div>}
                            {selectedStyle === style && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                    <div className="bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm">
                                        <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className={`text-[9px] font-medium truncate w-full text-center ${selectedStyle === style ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                            {style}
                        </span>
                    </button>
                 ))}
              </div>
           </div>
           <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
                 <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Dimensions</label>
                    <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 inline-flex">
                       <button 
                         onClick={() => setAspectRatio('1:1')}
                         className={`p-1.5 rounded ${aspectRatio === '1:1' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                         title="Square (1:1)"
                       >
                          <Square className="w-3.5 h-3.5" />
                       </button>
                       <button 
                         onClick={() => setAspectRatio('4:3')}
                         className={`p-1.5 rounded ${aspectRatio === '4:3' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                         title="Standard (4:3)"
                       >
                          <RectangleHorizontal className="w-3.5 h-3.5 scale-90" />
                       </button>
                       <button 
                         onClick={() => setAspectRatio('16:9')}
                         className={`p-1.5 rounded ${aspectRatio === '16:9' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                         title="Landscape (16:9)"
                       >
                          <RectangleHorizontal className="w-3.5 h-3.5" />
                       </button>
                       <button 
                         onClick={() => setAspectRatio('3:4')}
                         className={`p-1.5 rounded ${aspectRatio === '3:4' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                         title="Portrait Standard (3:4)"
                       >
                          <RectangleVertical className="w-3.5 h-3.5 scale-90" />
                       </button>
                        <button 
                         onClick={() => setAspectRatio('9:16')}
                         className={`p-1.5 rounded ${aspectRatio === '9:16' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                         title="Portrait Tall (9:16)"
                       >
                          <RectangleVertical className="w-3.5 h-3.5" />
                       </button>
                    </div>
                 </div>
             <button
                onClick={handleRegenerateImage}
                disabled={isRegeneratingImage}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                Generate New Version
             </button>
           </div>
           {showImageSettings && (
             <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                   <Type className="w-3 h-3" />
                   Custom Image Prompt (Optional)
                </label>
                <textarea 
                   value={customPrompt}
                   onChange={(e) => setCustomPrompt(e.target.value)}
                   placeholder={`Describe exactly what you want to see... (e.g. "A futuristic dashboard glowing in neon blue on a dark desk")`}
                   className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-16"
                />
             </div>
           )}
        </div>
      </div>
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center h-[600px] transition-colors duration-300">
        <div className="relative">
           <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-500 animate-pulse" />
           </div>
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Crafting your post...</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">
          Analyzing {formData.topic} trends, researching data points, and optimizing for {formData.platform}.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-8 text-center flex flex-col items-center justify-center h-[400px]">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generation Failed</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">{error}</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center h-[600px] transition-colors duration-300">
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner rotate-3 transition-transform hover:rotate-6">
           <Zap className="w-10 h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ready to create?</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">
          Select your platform and topic on the left to generate high-engagement social media content powered by Gemini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       {/* 1. Research Summary Card */}
       <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
           <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                 <Search className="w-5 h-5" />
              </div>
              <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Research & Context</h3>
                  <p className="text-xs text-slate-500">Based on real-time search data</p>
              </div>
           </div>
           
           <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
             <ReactMarkdown>{post.researchSummary}</ReactMarkdown>
           </div>
           
           <div className="flex flex-wrap gap-2 mt-4">
              {post.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{source.title || 'Source'}</span>
                  </a>
              ))}
              <button 
                onClick={handleCopySources}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1.5 rounded-full transition-colors"
              >
                  {sourcesCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {sourcesCopied ? 'Copied' : 'Copy Sources'}
              </button>
           </div>
       </div>

       {/* 2. Main Post Preview Card */}
       <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Toolbar */}
          <div className="border-b border-slate-100 dark:border-slate-800 p-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
             <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {formData.platform}
                </span>
                <span className="text-xs text-slate-400">Preview Mode</span>
             </div>
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowSchedule(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  title="Schedule Post"
                >
                    <Calendar className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200 dark:border-slate-700"></div>
                <button 
                  onClick={() => handleRewrite('Technical')}
                  disabled={isRewriting}
                  className="text-[10px] font-medium px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                   Make Technical
                </button>
                <button 
                  onClick={() => handleRewrite('General')}
                  disabled={isRewriting}
                  className="text-[10px] font-medium px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                   Make Simple
                </button>
             </div>
          </div>

          <div className="p-6">
             <div className="max-w-2xl mx-auto">
                 <MockProfileHeader platform={formData.platform} />
                 
                 <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-slate-100 font-normal">
                     {isRewriting ? (
                         <div className="space-y-2 animate-pulse">
                             <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                             <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                             <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-5/6"></div>
                         </div>
                     ) : (
                        post.content
                     )}
                 </div>

                 {post.imageUrl && <ImageSection />}
                 <MockEngagement platform={formData.platform} />
             </div>
          </div>
          
          {/* Footer Actions */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4">
             <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                 <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleCopy}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-all shadow-sm"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy Text'}
                    </button>
                    
                    {formData.platform === 'Facebook' && (
                        <>
                        <div className="relative">
                            {!selectedFbPage ? (
                                <button
                                    onClick={handleFacebookLogin}
                                    disabled={isConnectingFb}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-70"
                                >
                                    {isConnectingFb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
                                    Connect Page
                                </button>
                            ) : (
                                <button
                                    onClick={handleDirectFacebookPublish}
                                    disabled={isPublishingFb}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-70"
                                >
                                    {isPublishingFb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Publish Now
                                </button>
                            )}
                        </div>
                        {/* Manual Button */}
                         <button
                            onClick={handleManualPost}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-all shadow-sm"
                            title="Copy text & download image to post manually"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Post Manually
                        </button>
                        </>
                    )}
                 </div>
                 
                 <button 
                    onClick={() => handleSmartShare(formData.platform)}
                    disabled={isPublishingFb || isConnectingFb}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all ${
                        formData.platform === 'Facebook' && !useManualFb
                            ? 'bg-[#1877F2] hover:bg-[#166fe5] text-white' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                 >
                    {isPublishingFb || isConnectingFb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    {formData.platform === 'Facebook' && !useManualFb 
                        ? (isPublishingFb ? 'Publishing...' : isConnectingFb ? 'Connecting...' : (selectedFbPage ? `Post to ${selectedFbPage.name}` : 'Connect / Auto-Post'))
                        : 'Share / Open App'
                    }
                 </button>
             </div>
             
             {/* Feedback / Validation */}
             <CharacterCounter text={post.content} platform={formData.platform} />
             
             {/* Facebook Status / Errors */}
             {formData.platform === 'Facebook' && (
                 <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                     <div className="flex items-center justify-between mb-2">
                         <span className="font-semibold text-slate-500 uppercase tracking-wide">Facebook Integration</span>
                         <button onClick={() => toggleManualMode(!useManualFb)} className="text-indigo-600 hover:underline">
                             {useManualFb ? "Switch to Auto Mode" : "Switch to Manual Mode"}
                         </button>
                     </div>
                     
                     {useManualFb ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded border border-amber-200 dark:border-amber-800">
                             Manual Mode: Copy the text and download the image to post manually.
                        </div>
                     ) : (
                         <>
                            {!needsAppId && !selectedFbPage && (
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 flex items-center gap-2">
                                    <Info className="w-3 h-3" /> Connect a page to publish directly.
                                </div>
                            )}
                            
                            {selectedFbPage && (
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    Connected to: <strong>{selectedFbPage.name}</strong>
                                </div>
                            )}

                            {fbPublishSuccess && (
                                <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded flex items-center gap-2">
                                    <Check className="w-3 h-3" /> {fbPublishSuccess}
                                </div>
                            )}

                            {fbError && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded border border-red-100 dark:border-red-800">
                                    {fbError}
                                </div>
                            )}

                            {needsAppId && (
                                <div className="mt-2">
                                    <input 
                                        type="text" 
                                        placeholder="Enter Facebook App ID" 
                                        value={customAppId}
                                        onChange={(e) => setCustomAppId(e.target.value)}
                                        className="w-full p-2 text-xs border border-slate-300 rounded mb-2 dark:bg-slate-800 dark:border-slate-700"
                                    />
                                    <p className="text-[10px] text-slate-400">
                                        Required for direct publishing. Create an app at <a href="https://developers.facebook.com" target="_blank" className="underline">developers.facebook.com</a>.
                                    </p>
                                </div>
                            )}
                         </>
                     )}
                 </div>
             )}
          </div>
       </div>
       
       {/* Share Toast */}
       {shareMessage && (
           <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-amber-400" />
                   {shareMessage}
               </div>
           </div>
       )}
       
       {/* Schedule Modal */}
       {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Schedule Post</h3>
                    <button onClick={() => setShowSchedule(false)} className="text-slate-400 hover:text-slate-600">
                        <span className="sr-only">Close</span>
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Date & Time</label>
                        <input 
                            type="datetime-local" 
                            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white"
                            onChange={(e) => setScheduleDate(e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                        <Info className="w-3 h-3 inline mr-1" /> 
                        This is a simulation. In a real app, this would queue your post via an API.
                    </p>
                    <button 
                        onClick={handleConfirmSchedule}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                        Confirm Schedule
                    </button>
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

export default PostResult;
