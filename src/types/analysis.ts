export type CoverLetterTone = 'confident' | 'executive' | 'concise';
export type OutputLanguage = 'en' | 'bn';

export interface MissingKeyword {
  keyword: string;
  category:
    | 'Technical Skill'
    | 'Domain & Tooling'
    | 'Leadership & Soft Skill'
    | 'Qualification';
  priority: 'High' | 'Medium';
}

export interface ImprovementSuggestion {
  title: string;
  area: string;
  impact: 'High' | 'Medium';
  action: string;
  exampleRewrite: string;
}

export interface ScoreBreakdown {
  keywordAlignment: number;
  experienceRelevance: number;
  impactAndMetrics: number;
}

export interface AnalysisResult {
  atsMatchScore: number;
  scoreSummary: string;
  scoreBreakdown: ScoreBreakdown;
  matchedKeywords: string[];
  missingKeywords: MissingKeyword[];
  improvementSuggestions: ImprovementSuggestion[];
  coverLetter: string;
  language?: OutputLanguage;
}

export interface AnalyzeRequestPayload {
  resume: string;
  jobDescription: string;
  tone: CoverLetterTone;
  language?: OutputLanguage;
}
