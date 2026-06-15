export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  weaknesses: string;
  structure: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface IdeaAnalysis {
  suggestedApproach: string;
  rationale: string;
  ambiguities: string[];
  suggestedQuestions: string[];
}

export interface GeneratedPromptResult {
  completedPrompt: string;
  sideNotes: Array<{
    targetSection: string;
    note: string;
    principle: string;
  }>;
  overallWhy: string;
}

export interface OfflineExample {
  id: string;
  title: string;
  category: string;
  flawedPrompt: string;
  selectedTemplateId: string;
  templatedOutput: string;
  analysis: {
    flaws: string[];
    improvements: string[];
    rationale: string;
  };
}
