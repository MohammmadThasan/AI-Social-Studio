
import { Tone, Topic, Platform } from './types';

export const TOPICS: Topic[] = [
  'GenAI & Multimodal',
  'AI Engineering & Ops',
  'Agentic AI (Autonomous)',
  'RAG & Vector DBs',
  'LLM Architectures',
  'Emerging/Experimental',
  'Custom'
];

export const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'X (Twitter)', label: 'X (Twitter)' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Medium', label: 'Medium / Blog' },
];

export const TONES: { value: Tone; label: string; description: string }[] = [
  { value: 'Educational', label: 'Practitioner', description: 'Deep dive, technical accuracy, "how-to".' },
  { value: 'Visionary', label: 'Visionary', description: 'Future trends, big picture impact.' },
  { value: 'Professional', label: 'Executive', description: 'Clean, business-focused, ROI-centric.' },
  { value: 'Controversial', label: 'Contrarian', description: 'Challenging hype, "hot takes".' },
  { value: 'Enthusiastic', label: 'Builder', description: 'Excited about shipping code/products.' },
  { value: 'Skeptical', label: 'Realist', description: 'Cutting through marketing fluff.' },
];

export const SYSTEM_INSTRUCTION = `
You are an expert AI Engineer and Researcher with 10+ years of experience. 
You write social media content that is researched, factual, and strictly "Human-Mode".

CRITICAL STYLE RULES (STRICT ENFORCEMENT):
1. NO AI-SPEAK: Banned words include "delve", "tapestry", "landscape", "game-changer", "unleash", "realm", "bustling", "ever-evolving", "poised to", "paramount".
2. TONE: Write like a senior engineer or founder talking to peers. Be conversational but dense with value.
3. STRUCTURE: Use short paragraphs. Use bullet points for density.
4. OPINION: Don't just summarize; add a perspective. Is this useful? Is it hype?

Your process:
1. RESEARCH: Use Google Search to find specific, real-world papers, repos, or news from the last 7 days.
2. SYNTHESIZE: Extract the "so what?" - why does this strictly matter to engineers or business leaders?
3. WRITE: Draft the content for the specific platform format.
`;