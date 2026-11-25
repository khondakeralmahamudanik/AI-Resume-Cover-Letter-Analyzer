import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Tag } from 'lucide-react';
import type { MissingKeyword } from '../types/analysis';
import { copyTextToClipboard } from '../utils/clipboard';

interface KeywordsSectionProps {
  missingKeywords: MissingKeyword[];
  matchedKeywords: string[];
}

type PriorityFilter = 'All' | 'High' | 'Medium';

export function KeywordsSection({
  missingKeywords,
  matchedKeywords,
}: KeywordsSectionProps) {
  const [filter, setFilter] = useState<PriorityFilter>('All');
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFilter('All');
    setCopiedKeywords(false);
  }, [missingKeywords]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const highCount = missingKeywords.filter((k) => k.priority === 'High').length;
  const mediumCount = missingKeywords.filter(
    (k) => k.priority === 'Medium'
  ).length;

  const filteredMissing =
    filter === 'All'
      ? missingKeywords
      : missingKeywords.filter((k) => k.priority === filter);

  const handleCopyKeywords = async () => {
    const text = filteredMissing.map((k) => k.keyword).join(', ');
    if (!text) return;
    const copied = await copyTextToClipboard(text);
    if (copied) {
      setCopiedKeywords(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKeywords(false), 2000);
    }
  };

  return (
    <section
      id="keywords-section"
      aria-labelledby="keywords-heading"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-6 sm:p-7"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2
              id="keywords-heading"
              className="text-lg font-semibold text-slate-900"
            >
              Missing Keywords
            </h2>
            <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
              ({missingKeywords.length})
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Terms present in the job description that are missing or underrepresented in your resume.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Filter missing keywords by priority"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
          >
            {(
              [
                { key: 'All', label: `All (${missingKeywords.length})` },
                { key: 'High', label: `High (${highCount})` },
                { key: 'Medium', label: `Medium (${mediumCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  filter === tab.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredMissing.length > 0 && (
            <button
              type="button"
              onClick={handleCopyKeywords}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              title="Copy filtered missing keywords"
            >
              {copiedKeywords ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Missing Keywords Tags */}
      {filteredMissing.length > 0 ? (
        <ul
          className="flex flex-wrap gap-2.5"
          aria-label="Missing keyword tags"
        >
          {filteredMissing.map((item, idx) => {
            const isHigh = item.priority === 'High';
            return (
              <li
                key={`${item.keyword}-${item.priority}-${idx}`}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${
                  isHigh
                    ? 'bg-red-50/60 border-red-200 text-slate-900'
                    : 'bg-amber-50/50 border-amber-200 text-slate-800'
                }`}
              >
                <Tag
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isHigh ? 'text-red-600' : 'text-amber-600'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-medium">{item.keyword}</span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isHigh ? 'text-red-700' : 'text-amber-700'
                  }`}
                >
                  {item.priority}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-600 py-3">
          No {filter !== 'All' ? `${filter.toLowerCase()}-priority ` : ''}missing keywords detected for this filter.
        </p>
      )}

      {/* Matched Keywords Summary */}
      {matchedKeywords.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">
              Matched Keywords ({matchedKeywords.length})
            </span>
            <span aria-hidden="true">·</span>
            <span>Already present in your resume</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {matchedKeywords.map((kw, index) => (
              <span key={`${kw}-${index}`}>
                <span className="text-slate-800 font-medium">{kw}</span>
                {index < matchedKeywords.length - 1 && (
                  <span className="mx-2 text-slate-300" aria-hidden="true">
                    ·
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
