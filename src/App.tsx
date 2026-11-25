import { useRef, useState } from 'react';
import { AnalysisOutput } from './components/AnalysisOutput';
import { InputWorkspace } from './components/InputWorkspace';
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from './data/sampleData';
import type {
  AnalysisResult,
  CoverLetterTone,
  ImprovementSuggestion,
  MissingKeyword,
  OutputLanguage,
} from './types/analysis';

function clampScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value.trim().replace(/%$/, ''));
    if (Number.isFinite(num)) {
      return Math.max(0, Math.min(100, Math.round(num)));
    }
  }
  return null;
}

function normalizeAnalysisResult(raw: unknown): AnalysisResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Received an invalid analysis response from the server.');
  }

  const obj = raw as Record<string, unknown>;
  const breakdownObj =
    typeof obj.scoreBreakdown === 'object' &&
    obj.scoreBreakdown !== null &&
    !Array.isArray(obj.scoreBreakdown)
      ? (obj.scoreBreakdown as Record<string, unknown>)
      : null;

  const atsMatchScore = clampScore(obj.atsMatchScore);
  const keywordAlignment = breakdownObj
    ? clampScore(breakdownObj.keywordAlignment)
    : null;
  const experienceRelevance = breakdownObj
    ? clampScore(breakdownObj.experienceRelevance)
    : null;
  const impactAndMetrics = breakdownObj
    ? clampScore(breakdownObj.impactAndMetrics)
    : null;

  if (
    atsMatchScore === null ||
    keywordAlignment === null ||
    experienceRelevance === null ||
    impactAndMetrics === null
  ) {
    throw new Error(
      'Received an incomplete analysis payload from the server. Please try again.'
    );
  }

  return {
    atsMatchScore,
    scoreSummary:
      typeof obj.scoreSummary === 'string' && obj.scoreSummary.trim()
        ? obj.scoreSummary
        : 'Analysis completed based on your resume and job description.',
    scoreBreakdown: {
      keywordAlignment,
      experienceRelevance,
      impactAndMetrics,
    },
    matchedKeywords: Array.isArray(obj.matchedKeywords)
      ? obj.matchedKeywords.filter((k): k is string => typeof k === 'string')
      : [],
    missingKeywords: Array.isArray(obj.missingKeywords)
      ? obj.missingKeywords
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map((item): MissingKeyword => ({
            keyword: typeof item.keyword === 'string' ? item.keyword : '',
            category:
              item.category === 'Technical Skill' ||
              item.category === 'Domain & Tooling' ||
              item.category === 'Leadership & Soft Skill' ||
              item.category === 'Qualification'
                ? item.category
                : 'Technical Skill',
            priority: item.priority === 'Medium' ? 'Medium' : 'High',
          }))
          .filter((item) => item.keyword.length > 0)
      : [],
    improvementSuggestions: Array.isArray(obj.improvementSuggestions)
      ? obj.improvementSuggestions
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map((item): ImprovementSuggestion => ({
            title:
              typeof item.title === 'string' ? item.title : 'Resume Improvement',
            area: typeof item.area === 'string' ? item.area : 'Experience',
            impact: item.impact === 'Medium' ? 'Medium' : 'High',
            action: typeof item.action === 'string' ? item.action : '',
            exampleRewrite:
              typeof item.exampleRewrite === 'string' ? item.exampleRewrite : '',
          }))
          .filter((item) => item.action.length > 0)
      : [],
    coverLetter: typeof obj.coverLetter === 'string' ? obj.coverLetter : '',
    language: obj.language === 'bn' ? 'bn' : obj.language === 'en' ? 'en' : undefined,
  };
}

export default function App() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<CoverLetterTone>('confident');
  const [language, setLanguage] = useState<OutputLanguage>('en');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runAnalysis = async (
    resumeText: string,
    jdText: string,
    selectedTone: CoverLetterTone,
    selectedLanguage: OutputLanguage
  ) => {
    const trimmedResume = resumeText.trim();
    const trimmedJd = jdText.trim();

    if (!trimmedResume || !trimmedJd) {
      setValidationError(
        'Please paste both your Resume and a Job Description before analyzing.'
      );
      return;
    }

    if (trimmedResume.length < 40 || trimmedJd.length < 40) {
      setValidationError(
        'Please provide a bit more detail in both fields (at least 40 characters each).'
      );
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setValidationError(null);
    setError(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: trimmedResume,
          jobDescription: trimmedJd,
          tone: selectedTone,
          language: selectedLanguage,
        }),
        signal: controller.signal,
      });

      const rawBody = await response.text();
      let data: unknown = null;
      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const errorMsg =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof (data as { error?: unknown }).error === 'string'
            ? (data as { error: string }).error
            : `Analysis request failed (HTTP ${response.status}). Please try again.`;
        throw new Error(errorMsg);
      }

      if (controller.signal.aborted) return;
      setResult(normalizeAnalysisResult(data));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while communicating with the server.';
      setError(message);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsAnalyzing(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleAnalyzeClick = () => {
    void runAnalysis(resume, jobDescription, tone, language);
  };

  const handleLoadSample = () => {
    setResume(SAMPLE_RESUME);
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setValidationError(null);
    setError(null);
    setResetSignal((n) => n + 1);
  };

  const handleLoadSampleAndAnalyze = () => {
    setResume(SAMPLE_RESUME);
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setValidationError(null);
    setResetSignal((n) => n + 1);
    void runAnalysis(SAMPLE_RESUME, SAMPLE_JOB_DESCRIPTION, tone, language);
  };

  const handleResetWorkspace = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsAnalyzing(false);
    setResume('');
    setJobDescription('');
    setResult(null);
    setError(null);
    setValidationError(null);
    setResetSignal((n) => n + 1);
  };

  const hasContent =
    resume.trim().length > 0 ||
    jobDescription.trim().length > 0 ||
    result !== null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar: 3-zone contract */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            AI Resume &amp; Cover Letter Analyzer
          </a>

          <nav
            aria-label="Workspace sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#inputs-section"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Inputs
            </a>
            <a
              href="#score-section"
              aria-disabled={!result}
              tabIndex={result ? undefined : -1}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                result
                  ? 'hover:text-slate-900'
                  : 'text-slate-400 pointer-events-none'
              }`}
            >
              ATS Score
            </a>
            <a
              href="#keywords-section"
              aria-disabled={!result}
              tabIndex={result ? undefined : -1}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                result
                  ? 'hover:text-slate-900'
                  : 'text-slate-400 pointer-events-none'
              }`}
            >
              Keywords
            </a>
            <a
              href="#suggestions-section"
              aria-disabled={!result}
              tabIndex={result ? undefined : -1}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                result
                  ? 'hover:text-slate-900'
                  : 'text-slate-400 pointer-events-none'
              }`}
            >
              Suggestions
            </a>
            <a
              href="#cover-letter-section"
              aria-disabled={!result}
              tabIndex={result ? undefined : -1}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                result
                  ? 'hover:text-slate-900'
                  : 'text-slate-400 pointer-events-none'
              }`}
            >
              Cover Letter
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            {hasContent ? (
              <button
                type="button"
                onClick={handleResetWorkspace}
                disabled={isAnalyzing}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                New Analysis
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isAnalyzing}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                Try Sample
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main
        id="top"
        className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
      >
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance max-w-2xl">
            Align your resume with every role before you apply.
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 max-w-2xl">
            Compare your experience against any job description to surface missing keywords, prioritize edits, and draft a tailored cover letter.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <InputWorkspace
              resume={resume}
              jobDescription={jobDescription}
              tone={tone}
              language={language}
              isAnalyzing={isAnalyzing}
              validationError={validationError}
              resetSignal={resetSignal}
              onResumeChange={(val) => {
                setResume(val);
                if (validationError) setValidationError(null);
              }}
              onJobDescriptionChange={(val) => {
                setJobDescription(val);
                if (validationError) setValidationError(null);
              }}
              onToneChange={setTone}
              onLanguageChange={setLanguage}
              onAnalyze={handleAnalyzeClick}
              onLoadSample={handleLoadSample}
            />
          </div>

          <div className="lg:col-span-7">
            <AnalysisOutput
              result={result}
              isLoading={isAnalyzing}
              error={error}
              onRetry={handleAnalyzeClick}
              onLoadSampleAndAnalyze={handleLoadSampleAndAnalyze}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>AI Resume &amp; Cover Letter Analyzer</span>
          <span>Always review generated suggestions and cover letters for factual accuracy before submitting.</span>
        </div>
      </footer>
    </div>
  );
}
