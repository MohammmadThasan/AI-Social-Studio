
// Tone options for social media generation
export type Tone = 'Professional' | 'Visionary' | 'Controversial' | 'Educational' | 'Enthusiastic' | 'Skeptical' | 'Architectural';

// Corrected Topic type to match the values in constants.ts
export type Topic = 
  | 'Predictive Forecasting'
  | 'Generative BI & Chat-with-Data'
  | 'Autonomous Data Agents'
  | 'Real-time Anomaly Detection'
  | 'Customer Intent Analytics'
  | 'Automated Insight Synthesis'
  | 'Data Privacy in Analytics'
  | 'Custom';

export type ImageStyle = 'Minimalist' | 'Photorealistic' | 'Abstract' | 'Cyberpunk' | 'Corporate' | 'Watercolor' | '3D Render';

export type Platform = 'LinkedIn' | 'Facebook' | 'X (Twitter)' | 'Instagram' | 'Medium';

export interface FormData {
  platform: Platform;
  topic: Topic;
  customTopic: string;
  tone: Tone;
  includeEmoji: boolean;
  includeHashtags: boolean;
  includePromptChaining: boolean;
  includeCTA: boolean;
  comparisonFormat: boolean;
  tldrSummary: boolean;
  includeFutureOutlook: boolean;
  includeDevilsAdvocate: boolean;
  includeImplementationSteps: boolean;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface GeneratedPost {
  researchSummary: string;
  contentAngle: string;
  content: string;
  hashtags: string[];
  imageUrl?: string;
  sources: GroundingSource[];
  timestamp: number;
  scheduledFor?: string;
}
