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
        Constraint: LinkedIn Authority
        - STYLE: Punchy, first-person expert. A mix of short and long sentences.
        - STRUCTURE: Hook (scrolling stopper) -> The Problem -> The Data -> The Solution -> The Takeaway.
        - FORMAT: White space between lines. NO ASTERISKS.
      `;
      break;
    case 'X (Twitter)':
      platformStrategy = `
        Constraint: X/Twitter Post
        - STYLE: Direct, news-like, or high-value tip. Thread-starter style.
        - FORMAT: NO ASTERISKS.
      `;
      break;
    default:
      platformStrategy = `Keep it professional, human-sounding, and strictly avoid all asterisks (*).`;
  }

  const prompt = `
    GOAL: Write a high-viral, authoritative ${platform} post about "${topicToUse}".

    STEP 1: DEEP RESEARCH (The "Truth" Phase)
    - Search for specific, hard data points from the last 3-6 months. Look for benchmarks, costs, latency numbers, or adoption rates.
    - Find a "Counter-Narrative": What is the common advice/hype that is actually wrong or misleading?
    - Find a real-world example: A company or tool that succeeded or failed recently.
    - VERIFY: Ensure all dates and numbers are accurate.

    STEP 2: SYNTHESIS (The "Insight" Phase)
    - Combine the hard data with the counter-narrative.
    - Ask: "Why does this matter to a senior practitioner right now?"
    - Formulate a strong opinion. Don't hedge. Be decisive.

    STEP 3: DRAFTING (The "Human" Phase)
    - Tone: ${data.tone}.
    - Style: Short, punchy sentences. Variable rhythm. No fluff. Write as if arguing with a smart peer.
    - Hook: Start with a startling fact, a direct question, or a contrarian statement.
    - Body: Deliver value immediately. Use the data from Step 1.
    - Conclusion: End with a specific question or call to action.
    - CONSTRAINT: ABSOLUTELY NO ASTERISKS (*).
    - CONSTRAINT: Do NOT use forbidden words (delve, unlock, landscape, revolutionary, etc.).

    ${data.comparisonFormat ? '- Structure: Compare "The Old Way" vs "The New Reality".' : ''}
    ${data.includeCTA ? '- End with a high-engagement question.' : ''}
    ${data.includeDevilsAdvocate ? '- Explicitly mention the downsides/risks/costs.' : ''}
    ${data.includeEmoji ? '- Use minimal, high-quality emojis.' : '- NO emojis.'}

    Return JSON:
    {
      "researchSummary": "A data-heavy summary of your deep web and social media findings. Cite specific numbers and dates. NO ASTERISKS.",
      "contentAngle": "The unique, contrarian, or data-backed hook you chose.",
      "postContent": "The final post. NO ASTERISKS.",
      "hashtags": ["#tag1", "#tag2"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        temperature: 0.7, 
        thinkingConfig: { thinkingBudget: 32768 } 
      },
    });

    let jsonString = response.text || "{}";
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    // Final safety check for asterisks in the raw response text before parsing
    jsonString = jsonString.replace(/\*/g, '');

    let parsedResult;
    try {
        parsedResult = JSON.parse(jsonString);
    } catch (e) {
        parsedResult = {
            researchSummary: "Analysis of the latest technical deployments and social sentiment indicates rapid evolution in this sector.",
            contentAngle: "Real-world implementation strategies",
            postContent: response.text?.replace(/\*/g, '') || "Technical synthesis complete.",
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
  
  let instruction = "";
  if (audience === 'Technical') {
      instruction = "Make it more rigorous. Focus on architectural patterns, latency, cost per token, and trade-offs. Assume the reader is a Principal Engineer. Remove marketing fluff.";
  } else if (audience === 'Simple') {
      instruction = "Explain it like I'm 12, but don't be patronizing. Use a clear analogy (like comparing AI to a library or a chef). Focus on the 'why' and the benefit. Use short sentences.";
  }

  const prompt = `
    Rewrite this ${platform} post for a ${audience} audience. 
    ${instruction} 
    STRICTLY NO ASTERISKS (*). 
    Do not use the words 'delve' or 'unlock'.
    Keep the core facts accurate. 
    Original: ${content}
  `;
  
  const response = await ai.models.generateContent({ 
    model: "gemini-3-pro-preview", 
    contents: prompt,
    config: { 
      systemInstruction: "You are a senior technical editor. Your goal is clarity and impact. ABSOLUTELY NO ASTERISKS (*) ALLOWED.",
      thinkingConfig: { thinkingBudget: 4000 } 
    } 
  });
  return (response.text || content).replace(/\*/g, '');
};

export const generatePostImage = async (data: FormData, style: ImageStyle = '3D Render', manualAspectRatio: string = '1:1', manualPrompt?: string): Promise<string | undefined> => {
  if (!process.env.API_KEY) return undefined;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const topicToUse = data.topic === 'Custom' ? data.customTopic : data.topic;
  
  const styleModifiers: Record<string, string> = {
    '3D Render': "Ultra-high-fidelity 3D render, isometric perspective, soft global illumination, octane render style, glassmorphism elements, frosted glass and matte plastic textures, clean minimal geometry, professional studio lighting, 8k resolution.",
    'Photorealistic': "professional lifestyle photography of a workspace with modern tech, warm cinematic lighting, sharp focus, 8k.",
    'Minimalist': "elegant geometric abstract, thin lines, clean negative space, vector aesthetic.",
    'Abstract': "fluid digital gradients, organic data flow, soft ethereal lighting.",
    'Cyberpunk': "tech-noir, vibrant neon accents, detailed circuitry, holographic interfaces, dark background.",
    'Corporate': "clean modern office UI, glassmorphism, professional and friendly, soft blue and white shadows."
  };

  const modifier = styleModifiers[style] || styleModifiers['3D Render'];
  const imagePrompt = manualPrompt || `Professional 3D conceptual illustration for: ${topicToUse}. ${modifier}. No text. High resolution.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: imagePrompt }] },
      config: {
        imageConfig: {
          aspectRatio: manualAspectRatio as any || "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return undefined;
  } catch (error: any) {
    console.error("Image generation failed:", error);
    return undefined; 
  }
};