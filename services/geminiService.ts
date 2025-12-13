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
      platformConstraint = 'Strictly 1-3 tweets length (under 280 chars per thought). Thread style is okay if needed, but keep it concise.';
      platformStyle = 'Short, punchy, low context-switching. Use arrows (->) or distinct line breaks.';
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
  // Note: We cannot use responseSchema with googleSearch, so we prompt for it.
  const prompt = `
    TASK: Research and write a ${platform} post about "${topicToUse}".

    STEP 1: RESEARCH
    Use Google Search to find the absolute latest (last 2 weeks) developments, research papers (arXiv), GitHub repos, or viral discussions related to "${topicToUse}".
    Focus on: AI Engineering, Agentic Workflows, RAG optimizations, or Model Architecture.
    Filter out generic marketing fluff. Find the "meat".

    STEP 2: WRITE POST
    Write the content following these rules:
    - Platform: ${platform}
    - Tone: ${data.tone} (See system instruction for strict style guide).
    - Style: ${platformStyle}
    - Constraints: ${platformConstraint}
    - ${data.includePromptChaining ? 'Include a "Prompt Chain" example: A sequence of 2 linked prompts solving a specific task.' : ''}
    - ${data.includeEmoji ? 'Use emojis naturally (not spammy).' : 'NO emojis.'}

    STEP 3: FORMAT
    You must return a valid JSON object. Do not include markdown formatting like \`\`\`json.
    The JSON object must have these keys:
    {
      "researchSummary": "A 1-2 sentence summary of the specific real-world event/paper/update found during research.",
      "contentAngle": "The specific angle taken (e.g., 'Technical Deep Dive', 'Contrarian View', 'Business Utility').",
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
        temperature: 0.7, 
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

export const generatePostImage = async (data: FormData, style: ImageStyle = 'Minimalist'): Promise<string | undefined> => {
  if (!apiKey) return undefined;

  const topicToUse = data.topic === 'Custom' ? data.customTopic : data.topic;
  
  // Supported aspect ratios: "1:1", "3:4", "4:3", "9:16", "16:9"
  let aspectRatio = "16:9"; 
  
  switch (data.platform) {
    case 'Instagram':
      // Square is ideal for Instagram feed/grid
      aspectRatio = "1:1"; 
      break;
    case 'Facebook':
      // 4:3 is a good balance for Facebook feed visibility (taller than 16:9)
      aspectRatio = "4:3"; 
      break;
    case 'X (Twitter)':
      // 16:9 is the standard preview size for Twitter cards
      aspectRatio = "16:9"; 
      break;
    case 'Medium':
      // 16:9 is standard for blog post headers
      aspectRatio = "16:9"; 
      break;
    case 'LinkedIn':
      // 16:9 is professional and works well with link previews, 
      // though 1:1 is also common. We stick to 16:9 for the "Wider" look.
      aspectRatio = "16:9"; 
      break;
    default:
      aspectRatio = "16:9";
  }

  const imagePrompt = `
    Create a professional, modern, high-quality digital illustration suitable for a ${data.platform} post about: "${topicToUse}".
    Style: ${style} art style. 
    Mood: ${data.tone}. 
    Aspect Ratio: ${aspectRatio}. 
    Important: Do not include any text or words inside the image.
  `;

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