
import { GoogleGenAI } from "@google/genai";
import { FormData, GeneratedPost, GroundingSource, ImageStyle } from '../types';
import { SYSTEM_INSTRUCTION, PLATFORM_SPECS } from '../constants';

export const generateSocialPost = async (data: FormData): Promise<GeneratedPost> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const topicToUse = data.topic === 'Custom' ? data.customTopic : data.topic;
  const platform = data.platform || 'LinkedIn';
  const specs = PLATFORM_SPECS[platform];
  
  let platformStrategy = '';

  switch (platform) {
    case 'LinkedIn':
      platformStrategy = `
        Constraint: LinkedIn (Professional Insights)
        - **VOICE**: Senior AI Analytics Lead. Expert but accessible.
        - **Structure**: Hook (under 140 chars) -> Data Context -> The "Aha!" Moment -> Strategic Ask.
        - **Anti-Patterns**: No corporate "In today's landscape".
        - Technical Limit: 3,000 characters.
        - **Target Length**: 1,000–1,500 characters.
      `;
      break;
    case 'X (Twitter)':
      platformStrategy = `
        Constraint: X / Twitter (Concise & Real-Time)
        - **VOICE**: Insider, data-scientist vibe. Punchy.
        - Technical Limit: 280 characters.
        - **Target Length**: 240–259 characters.
      `;
      break;
    case 'Facebook':
      platformStrategy = `
        Constraint: Facebook (Relatable Storytelling)
        - **VOICE**: Casual but smart. "Why this AI thing helps you."
        - Technical Limit: 63,206 chars.
        - **Target Length**: 80–250 characters.
      `;
      break;
    case 'Instagram':
      platformStrategy = `
        Constraint: Instagram (Visual First)
        - **VOICE**: Aesthetic, trend-focused.
        - Technical Limit: 2,200 chars.
        - **Target Length**: 125–150 characters.
      `;
      break;
    default:
      platformStrategy = `Target Length: ${specs.sweetSpot[0]}-${specs.sweetSpot[1]} characters.`;
  }

  let angleInstruction: string = data.tone;
  if (data.tone === 'Architectural') {
    angleInstruction = "System Design & Data Engineering. Focus on ETL/ELT pipelines, vector databases, and scalable analytics architectures. Use analogies like 'plumbing' vs 'refining'.";
  }

  const prompt = `
    TASK: Perform DEEP RESEARCH and write a high-engagement ${platform} post about the AI Analytics topic: "${topicToUse}".

    STEP 1: 🕵️ DEEP WEB SEARCH (MANDATORY)
    Find 3 distinct data points from the last 2 weeks:
    1. **The Stat**: A specific analytics metric (e.g. "LLM latency reduced by 40% using...")
    2. **The Tech**: A recent framework update (e.g. LangGraph, dbt-core 1.x, etc.)
    3. **The Market**: A business impact (e.g. "Retailer X saved $YM by implementing...")

    STEP 2: 🧠 SYNTHESIS
    Angle: ${angleInstruction}. Focus on AI Analytics industry trends.

    STEP 3: ✍️ WRITE POST
    ${platformStrategy}
    
    **ADDITIONAL INSTRUCTIONS:**
    ${data.comparisonFormat ? '- Use comparison format (Before AI vs After AI Analytics).' : ''}
    ${data.includeCTA ? '- Include a strong Call to Action.' : ''}
    ${data.tldrSummary ? '- Add a TL;DR summary at the bottom.' : ''}
    ${data.includeFutureOutlook ? '- Predict the impact in 12 months.' : ''}
    ${data.includeDevilsAdvocate ? '- Add a contrarian view (e.g. why this might fail).' : ''}
    ${data.includeImplementationSteps ? '- Provide a 3-step action plan.' : ''}
    ${data.includeEmoji ? '- Max 3 relevant emojis.' : '- NO emojis.'}

    Return JSON:
    {
      "researchSummary": "Summary of findings with source names.",
      "contentAngle": "The take.",
      "postContent": "The actual text.",
      "hashtags": ["tag1", "tag2"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 2000 }
      },
    });

    let jsonString = response.text || "{}";
    const codeBlockMatch = jsonString.match(/```json\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1];
    } else {
      const firstOpen = jsonString.indexOf('{');
      const lastClose = jsonString.lastIndexOf('}');
      if (firstOpen !== -1 && lastClose !== -1) {
        jsonString = jsonString.substring(firstOpen, lastClose + 1);
      }
    }

    let parsedResult;
    try {
        parsedResult = JSON.parse(jsonString);
    } catch (e) {
        parsedResult = {
            researchSummary: "Analysis complete.",
            contentAngle: "General",
            postContent: response.text,
            hashtags: []
        };
    }
    
    const sources: GroundingSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    let finalContent = parsedResult.postContent;
    if (data.includeHashtags && parsedResult.hashtags?.length > 0) {
        const hashtags = parsedResult.hashtags.map((t: string) => t.startsWith('#') ? t : `#${t}`).join(' ');
        finalContent += `\n\n${hashtags}`;
    }

    return {
      researchSummary: parsedResult.researchSummary,
      contentAngle: parsedResult.contentAngle,
      content: finalContent,
      hashtags: parsedResult.hashtags || [],
      sources: sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i),
      timestamp: Date.now(),
    };
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
        throw new Error("API_LIMIT_REACHED");
    }
    throw error;
  }
};

export const rewritePost = async (content: string, platform: string, audience: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Rewrite this ${platform} AI Analytics post for a ${audience} audience. Sound like a human. Original: ${content}`;
  const response = await ai.models.generateContent({ model: "gemini-3-pro-preview", contents: prompt });
  return response.text || content;
};

export const generatePostImage = async (data: FormData, style: ImageStyle = '3D Render', manualAspectRatio?: string, manualPrompt?: string): Promise<string | undefined> => {
  if (!process.env.API_KEY) return undefined;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const topicToUse = data.topic === 'Custom' ? data.customTopic : data.topic;
  
  const styleModifiers: Record<string, string> = {
    '3D Render': "hyper-realistic 3D isometric render, Blender style, soft global illumination, octane render, 4k, trending on ArtStation, glass and matte textures, data visualization structures.",
    'Photorealistic': "professional high-res photography, cinematic lighting, shallow depth of field, sharp focus, 8k.",
    'Minimalist': "clean Bauhaus aesthetic, simple geometric shapes, limited palette.",
    'Abstract': "flowing data streams, complex mathematical patterns, ethereal light.",
    'Cyberpunk': "vibrant neon, data-noir aesthetic, high contrast.",
    'Corporate': "clean modern UI/UX visualization, glassmorphism elements."
  };

  const modifier = styleModifiers[style] || styleModifiers['3D Render'];
  const imagePrompt = manualPrompt || `Stunning visual for AI Analytics: ${topicToUse}. ${modifier}. No text.`;

  try {
    // Using gemini-2.5-flash-image to avoid mandatory pre-selection of API key
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: imagePrompt }] },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return undefined;
  } catch (error: any) {
    return undefined; 
  }
};
