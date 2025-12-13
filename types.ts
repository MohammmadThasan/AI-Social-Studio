
export type Tone = 'Professional' | 'Visionary' | 'Controversial' | 'Educational' | 'Enthusiastic' | 'Skeptical';

export type Topic = 
  | 'GenAI & Multimodal'
  | 'AI Engineering & Ops'
  | 'Agentic AI (Autonomous)'
  | 'RAG & Vector DBs'
  | 'LLM Architectures'
  | 'Emerging/Experimental'
  | 'Custom';

export type ImageStyle = 'Minimalist' | 'Photorealistic' | 'Abstract' | 'Cyberpunk' | 'Corporate' | 'Watercolor';

export type Platform = 'LinkedIn' | 'Facebook' | 'X (Twitter)' | 'Instagram' | 'Medium';

export interface FormData {
  platform: Platform;
  topic: Topic;
  customTopic: string;
  tone: Tone;
  includeEmoji: boolean;
  includeHashtags: boolean;
  includePromptChaining: boolean;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface GeneratedPost {
  researchSummary: string; // Brief summary of the researched insight
  contentAngle: string;    // Technical, Business, Ethical, etc.
  content: string;         // The actual post
  hashtags: string[];
  imageUrl?: string;
  sources: GroundingSource[];
  timestamp: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

export interface FacebookUser {
  id: string;
  name: string;
  picture?: {
    data: {
      url: string;
    }
  };
}