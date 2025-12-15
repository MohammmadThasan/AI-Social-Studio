
import { GoogleGenAI } from "@google/genai";
import { FormData, GeneratedPost, GroundingSource, ImageStyle } from '../types';
import { SYSTEM_INSTRUCTION } from '../constants';

const apiKey = process.env.API_KEY;

// Initialize the client
const ai = new GoogleGenAI({ apiKey });

export const generateSocialPost = async (data: FormData): Promise<GeneratedPost> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const topicToUse = data.topic === 'Custom' ? data.customTopic : data.topic;
  const platform = data.platform || 'LinkedIn';
  
  // Platform specific configuration
  let platformConstraint = '';
  let platformStyle = '';

  switch (platform) {
    case 'X (Twitter)':
      platformConstraint = 'Strictly under 280 characters TOTAL. Single tweet only. NO THREADS.';
      platformStyle = 'Viral one-liner. High impact. No fluff. Use arrows (->) for causality.';
      break;
    case 'Instagram':
      platformConstraint = 'Keep it under 150 words. Focus on the visual hook.';
      platformStyle = 'Relatable, lifestyle-tech blend. First line must be a hook.';
      break;
    case 'Medium':
      platformConstraint = '600-800 words. Use Markdown headers (##).';
      platformStyle = 'Deep dive, educational, storytelling. detailed examples. Structure: Context -> The Problem -> The New Solution -> Implication.';
      break;
    case 'Facebook':
      platformConstraint = '300-700 characters. Conversational.';
      platformStyle = 'Friendly, community-focused, slightly informal.';
      break;
    default: // LinkedIn
      platformConstraint = '900-1300 characters.';
      platformStyle = 'Professional but warm. Insight-driven. Use spacing for readability.';
      break;
  }

  // We explicitly ask for a JSON object to separate the research from the content
  const prompt = `
    TASK: Perform DEEP RESEARCH and write a viral, high-engagement ${platform} post about "${topicToUse}".

    STEP 1: 🕵️ DEEP WEB SEARCH (MANDATORY)
    Use Google Search to find 3 distinct types of information from the last 2 weeks:
    1.  **Hard Data**: A specific benchmark, cost metric, latency number, or financial figure.
    2.  **Industry News/Magazines**: A recent article from a major tech publication (Wired, Verge, TechCrunch) or a top engineering blog (OpenAI, Uber, Netflix).
    3.  **Community Pulse**: A controversial opinion or debate currently happening in the AI community.
    
    *Constraint*: Do not just invent facts. Find real ones.

    STEP 2: 🧠 SYNTHESIS & ANGLE
    Identify the "So What?". Why does this matter to a human engineer or business leader right now?
    Select an angle: ${data.tone}.

    STEP 3: ✍️ WRITE POST (HUMAN-MODE)
    -   **Hook**: Start with a "Pattern Interrupt" - a surprising fact, a contrarian statement, or a "Stop doing this" command.
    -   **Body**: Deliver the insight found in Step 1. Be specific. Use numbers.
    -   **Formatting**: Use line breaks, bullet points, and bold text to make it skimmable.
    -   **Interactive Ending**: Ask a specific question based on the content to drive comments.
    -   **Style**: ${platformStyle}
    -   **Constraints**: ${platformConstraint}
    -   ${data.includePromptChaining ? 'Include a "Prompt Chain" example: A sequence of 2 linked prompts solving a specific task.' : ''}
    -   ${data.includeEmoji ? 'Use emojis naturally (not spammy).' : 'NO emojis.'}

    STEP 4: 📦 FORMAT OUTPUT
    Return a valid JSON object with these keys:
    {
      "researchSummary": "A concise summary of the specific papers, articles, or data points you found. Mention the source names.",
      "contentAngle": "The specific angle taken (e.g., 'Cost Analysis', 'Architecture Deep Dive').",
      "postContent": "The actual social media post text, formatted with Markdown.",
      "hashtags": ["tag1", "tag2"]
    }
  `;

  try {
    // Generate Text
    // IMPORTANT: responseMimeType and responseSchema are NOT supported when using tools like googleSearch.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.85, // Slightly higher for more creative/human phrasing
      },
    });

    let jsonString = response.text || "{}";
    
    // Clean up potential markdown code blocks if the model includes them
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedResult;
    try {
        parsedResult = JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON", e);
        // Fallback if JSON parsing fails - provide raw text in content
        parsedResult = {
            researchSummary: "Could not parse research summary.",
            contentAngle: "General",
            postContent: response.text || "Error generating content format.",
            hashtags: []
        };
    }
    
    // Extract grounding metadata (sources)
    const sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            title: chunk.web.title,
            uri: chunk.web.uri,
          });
        }
      });
    }

    // Filter unique sources by URI
    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);
    
    // Append hashtags to content if requested, unless it's Medium (usually tags are separate) or IG (usually in first comment or bottom)
    let finalContent = parsedResult.postContent;
    if (data.includeHashtags && parsedResult.hashtags && parsedResult.hashtags.length > 0) {
        const tagsString = parsedResult.hashtags.map((t: string) => t.startsWith('#') ? t : `#${t}`).join(' ');
        if (platform !== 'Medium') {
            finalContent += `\n\n${tagsString}`;
        }
    }

    return {
      researchSummary: parsedResult.researchSummary,
      contentAngle: parsedResult.contentAngle,
      content: finalContent,
      hashtags: parsedResult.hashtags || [],
      sources: uniqueSources,
      timestamp: Date.now(),
    };

  } catch (error) {
    console.error("Gemini Text API Error:", error);
    throw new Error("Failed to generate post. Please check your connection or API key.");
  }
};

export const generatePostImage = async (
  data: FormData, 
  style: ImageStyle = 'Minimalist',
  manualAspectRatio?: string,
  manualPrompt?: string
): Promise<string | undefined> => {
  if (!apiKey) return undefined;

  const topicToUse = data.topic === 'Custom' ? data.customTopic : data.topic;
  
  // Determine aspect ratio: Use manual if provided, otherwise default per platform
  let aspectRatio = manualAspectRatio;
  if (!aspectRatio) {
    switch (data.platform) {
        case 'Instagram':
        aspectRatio = "1:1"; 
        break;
        case 'Facebook':
        aspectRatio = "4:3"; 
        break;
        case 'X (Twitter)':
        aspectRatio = "16:9"; 
        break;
        case 'Medium':
        aspectRatio = "16:9"; 
        break;
        case 'LinkedIn':
        aspectRatio = "16:9"; 
        break;
        default:
        aspectRatio = "16:9";
    }
  }

  // Construct Prompt
  let imagePrompt = '';
  
  if (manualPrompt && manualPrompt.trim().length > 0) {
      imagePrompt = `
        Create a digital illustration based on this description: "${manualPrompt}".
        Style: ${style} art style.
        Mood: ${data.tone}.
        Aspect Ratio: ${aspectRatio}.
        Important: Do not include any text or words inside the image.
      `;
  } else {
      imagePrompt = `
        Create a professional, modern, high-quality digital illustration suitable for a ${data.platform} post about: "${topicToUse}".
        Style: ${style} art style. 
        Mood: ${data.tone}. 
        Aspect Ratio: ${aspectRatio}. 
        Important: Do not include any text or words inside the image.
      `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: imagePrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return undefined;
  } catch (error) {
    console.warn("Gemini Image API Error:", error);
    return undefined; 
  }
};
