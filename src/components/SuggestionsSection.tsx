import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { ImprovementSuggestion, OutputLanguage } from '../types/analysis';
import { copyTextToClipboard } from '../utils/clipboard';

interface SuggestionsSectionProps {
  suggestions: ImprovementSuggestion[];
  language?: OutputLanguage;
}

export function SuggestionsSection({
  suggestions,
  language,
}: SuggestionsSectionProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCopiedIndex(null);
  }, [suggestions]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyExample = async (text: string, index: number) => {
    const copied = await copyTextToClipboard(text);
    if (copied) {
      setCopiedIndex(index);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedIndex((prev) => (prev === index ? null : prev));
      }, 2000);
    }
  };

  return (
    <section
      id="suggestions-section"
      aria-labelledby="suggestions-heading"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-6 sm:p-7"
    >
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2
            id="suggestions-heading"
            className="text-lg font-semibold text-slate-900"
          >
            Actionable Improvement Suggestions
          </h2>
          <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
            ({suggestions.length})
          </span>
          {language && (
            <>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-xs font-medium text-slate-500">
                {language === 'bn' ? 'বাংলা' : 'English'}
              </span>
            </>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Targeted edits to increase ATS relevance and recruiter clarity.
        </p>
      </div>

      <ol className="divide-y divide-slate-200">
        {suggestions.map((item, idx) => {
          const isHighImpact = item.impact === 'High';
          const num = String(idx + 1).padStart(2, '0');
          return (
            <li key={`${item.title}-${idx}`} className="py-5 first:pt-2 last:pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                <h3 className="text-[15px] font-semibold text-slate-900">
                  <span className="font-mono text-slate-400 mr-2 tabular-nums">
                    {num}.
                  </span>
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                  <span>{item.area}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-medium ${
                      isHighImpact ? 'text-blue-700' : 'text-slate-600'
                    }`}
                  >
                    {item.impact} Impact
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {item.action}
              </p>

              {item.exampleRewrite && (
                <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-slate-500">
                      Suggested Phrasing
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyExample(item.exampleRewrite, idx)
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy phrasing</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {item.exampleRewrite}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
