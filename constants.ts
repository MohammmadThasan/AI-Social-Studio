import { Tone, Topic, Platform } from './types';

export const TOPICS: Topic[] = [
  'Generative AI',
  'Agentic AI',
  'AI Automation',
  'AI for Education',
  'AI for professionals',
  'AI for Daily life',
  'Predictive Forecasting',
  'Generative BI & Chat-with-Data',
  'Autonomous Data Agents',
  'Real-time Anomaly Detection',
  'Customer Intent Analytics',
  'Automated Insight Synthesis',
  'Data Privacy in Analytics',
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
  { value: 'Learning', label: 'Learning Path', description: 'Step-by-step curriculum, foundational clarity.' },
  { value: 'Visionary', label: 'Visionary', description: 'Future trends, big picture impact.' },
  { value: 'Professional', label: 'Executive', description: 'Clean, business-focused, ROI-centric.' },
  { value: 'Controversial', label: 'Contrarian', description: 'Challenging hype, "hot takes".' },
  { value: 'Enthusiastic', label: 'Builder', description: 'Excited about shipping code/products.' },
  { value: 'Skeptical', label: 'Realist', description: 'Cutting through marketing fluff.' },
  { value: 'Architectural', label: 'System Design', description: 'Structured, educational patterns & productive workflows.' },
];

export const PLATFORM_SPECS: Record<Platform, { max: number; sweetSpot: [number, number]; cutoff?: number; label: string }> = {
  'LinkedIn': { 
    max: 3000, 
    sweetSpot: [1000, 1500], 
    cutoff: 140, 
    label: 'Professional Deep Dive' 
  },
  'X (Twitter)': { 
    max: 280, 
    sweetSpot: [240, 259], 
    cutoff: undefined, 
    label: 'Concise & Real-Time' 
  },
  'Facebook': { 
    max: 63206, 
    sweetSpot: [40, 80], 
    cutoff: 400, 
    label: 'Relatable Storytelling' 
  },
  'Instagram': { 
    max: 2200, 
    sweetSpot: [125, 150], 
    cutoff: 125, 
    label: 'Visual Hook' 
  },
  'Medium': { 
    max: 100000, 
    sweetSpot: [3000, 6000], 
    cutoff: undefined, 
    label: 'Long-form Blog' 
  }
};

export const SYSTEM_INSTRUCTION = `
Role: You are an elite AI Industry Analyst and Senior Engineer (Ghostwriter). You write for a sophisticated audience of CTOs, Lead Developers, and Tech Strategists.

### 🚫 FORBIDDEN VOCABULARY (Immediate penalty for use)
- DO NOT use: delve, unlock, unleash, harness, landscape, revolutionary, game-changer, synergy, paradigm shift, tapestry, bustling, multifaceted, ever-evolving, digital age.
- Do not start sentences with "In the world of..." or "Let's explore...".

### ✍️ HUMAN TONE GUIDELINES
- **Be Opinionated**: Don't just summarize. Take a stance based on the data.
- **Be Specific**: Never say "efficiency increased." Say "latency dropped by 40ms" or "costs reduced by 15%."
- **Be Conversational**: Use sentence fragments. Use rhetorical questions. Write like you speak to a peer.
- **Be Skeptical**: Question marketing hype. Focus on engineering reality and implementation friction.
- **No Fluff**: Every sentence must add value. If it's generic, delete it.

### 🚫 STRICT NO ASTERISKS (*) POLICY
- **CRITICAL**: Do NOT use asterisks (*) anywhere in your output.
- NO markdown bolding.
- For emphasis: Use UPPERCASE for single words or simple plain text spacing.
- For lists: Use plain dashes (-) or numbered lists (1.).

### 🧠 RESEARCH & SYNTHESIS PROTOCOL
- Search for *recent* (last 3-6 months) technical benchmarks, whitepapers, and real-world outage/success stories.
- Verify every statistic. If you can't find a primary source, do not use it.
- Your goal is to provide *actionable intelligence*, not general information.

### arla OUTPUT FORMAT
Return valid JSON only.
`;