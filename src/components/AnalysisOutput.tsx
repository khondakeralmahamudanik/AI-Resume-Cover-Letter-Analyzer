import { AlertTriangle, FileCheck2, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import type { AnalysisResult } from '../types/analysis';
import { AtsScoreSection } from './AtsScoreSection';
import { KeywordsSection } from './KeywordsSection';
import { SuggestionsSection } from './SuggestionsSection';
import { CoverLetterSection } from './CoverLetterSection';

interface AnalysisOutputProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onLoadSampleAndAnalyze: () => void;
}

export function AnalysisOutput({
  result,
  isLoading,
  error,
  onRetry,
  onLoadSampleAndAnalyze,
}: AnalysisOutputProps) {
  if (isLoading) {
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col gap-5"
      >
        {/* Score Skeleton */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse mx-auto sm:mx-0 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3.5 w-28 bg-slate-100 rounded animate-pulse" />
                <div className="h-1.5 w-full bg-slate-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Keywords Skeleton */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-4">
          <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
          <div className="flex flex-wrap gap-2.5">
            {[96, 120, 84, 140, 108, 92, 116].map((w, idx) => (
              <div
                key={idx}
                className="h-8 bg-slate-100 rounded-md animate-pulse"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
        </div>

        {/* Suggestions & Cover Letter Skeleton */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-4">
          <div className="h-5 w-56 bg-slate-100 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="bg-white border border-red-200 rounded-xl p-6 sm:p-7"
      >
        <div className="flex items-start gap-3.5">
          <AlertTriangle
            className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              Unable to Complete Analysis
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {error}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="max-w-xl">
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mb-5">
            <FileCheck2 className="w-5 h-5 text-slate-700" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 text-balance">
            Ready to evaluate your application
          </h2>
          <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed mt-2">
            Paste your resume and the job description on the left, then select{' '}
            <strong className="font-semibold text-slate-900">Analyze</strong> to
            receive a comprehensive alignment report.
          </p>

          <dl className="mt-6 pt-6 border-t border-slate-100 divide-y divide-slate-100 text-sm">
            <div className="py-3 flex items-baseline gap-4">
              <dt className="font-mono text-xs font-medium text-slate-400 tabular-nums shrink-0">
                01.
              </dt>
              <dd className="text-slate-700">
                <span className="font-semibold text-slate-900">
                  ATS Match Score (0–100%)
                </span>{' '}
                — calibrated breakdown across keyword fit, experience relevance,
                and quantified impact.
              </dd>
            </div>
            <div className="py-3 flex items-baseline gap-4">
              <dt className="font-mono text-xs font-medium text-slate-400 tabular-nums shrink-0">
                02.
              </dt>
              <dd className="text-slate-700">
                <span className="font-semibold text-slate-900">
                  Missing Keywords
                </span>{' '}
                — tagged by priority so you know which terms to weave into your
                resume immediately.
              </dd>
            </div>
            <div className="py-3 flex items-baseline gap-4">
              <dt className="font-mono text-xs font-medium text-slate-400 tabular-nums shrink-0">
                03.
              </dt>
              <dd className="text-slate-700">
                <span className="font-semibold text-slate-900">
                  Actionable Improvement Suggestions
                </span>{' '}
                — concrete resume edits with copyable bullet phrasing.
              </dd>
            </div>
            <div className="py-3 flex items-baseline gap-4">
              <dt className="font-mono text-xs font-medium text-slate-400 tabular-nums shrink-0">
                04.
              </dt>
              <dd className="text-slate-700">
                <span className="font-semibold text-slate-900">
                  Tailored Cover Letter
                </span>{' '}
                — ready-to-edit prose customized to the role, with one-click copy.
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <button
              type="button"
              onClick={onLoadSampleAndAnalyze}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100/80 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <span>Load Sample &amp; Run Demo Analysis</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-5"
    >
      <AtsScoreSection
        score={result.atsMatchScore}
        summary={result.scoreSummary}
        breakdown={result.scoreBreakdown}
      />

      <KeywordsSection
        missingKeywords={result.missingKeywords}
        matchedKeywords={result.matchedKeywords}
      />

      <SuggestionsSection
        suggestions={result.improvementSuggestions}
        language={result.language}
      />

      <CoverLetterSection
        initialLetter={result.coverLetter}
        language={result.language}
      />
    </motion.div>
  );
}
