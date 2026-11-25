import { AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import type { ScoreBreakdown } from '../types/analysis';

interface AtsScoreSectionProps {
  score: number;
  summary: string;
  breakdown?: Partial<ScoreBreakdown> | null;
}

function getScoreTier(score: number) {
  if (score >= 80) {
    return {
      label: 'Strong Alignment',
      strokeClass: 'text-emerald-600',
      textClass: 'text-emerald-700',
      barClass: 'bg-emerald-600',
      Icon: CheckCircle2,
    };
  }
  if (score >= 55) {
    return {
      label: 'Moderate Alignment',
      strokeClass: 'text-amber-600',
      textClass: 'text-amber-700',
      barClass: 'bg-amber-500',
      Icon: TrendingUp,
    };
  }
  return {
    label: 'Needs Tailoring',
    strokeClass: 'text-red-600',
    textClass: 'text-red-700',
    barClass: 'bg-red-600',
    Icon: AlertCircle,
  };
}

export function AtsScoreSection({
  score,
  summary,
  breakdown,
}: AtsScoreSectionProps) {
  const safeScore = Number.isFinite(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, Math.round(safeScore)));
  const tier = getScoreTier(clampedScore);
  const TierIcon = tier.Icon;

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const metrics = [
    { label: 'Keyword Alignment', value: breakdown?.keywordAlignment ?? 0 },
    { label: 'Experience Relevance', value: breakdown?.experienceRelevance ?? 0 },
    { label: 'Impact & Metrics', value: breakdown?.impactAndMetrics ?? 0 },
  ];

  return (
    <section
      id="score-section"
      aria-labelledby="ats-score-heading"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-6 sm:p-7"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Circular ATS Score Gauge */}
        <div className="relative flex items-center justify-center shrink-0 w-32 h-32 mx-auto sm:mx-0">
          <svg
            className="w-32 h-32 -rotate-90"
            viewBox="0 0 120 120"
            role="img"
            aria-label={`ATS Match Score: ${clampedScore}%`}
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-100"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${tier.strokeClass} transition-[stroke-dashoffset] duration-700 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {clampedScore}%
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              ATS Match
            </span>
          </div>
        </div>

        {/* Score Verdict */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
            <h2
              id="ats-score-heading"
              className="text-lg font-semibold text-slate-900"
            >
              ATS Match Score
            </h2>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-medium ${tier.textClass}`}
            >
              <TierIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{tier.label}</span>
            </span>
          </div>
          <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600">
            {summary}
          </p>
        </div>
      </div>

      {/* Sub-metric Breakdown */}
      <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {metrics.map((metric) => {
          const safeVal = Number.isFinite(metric.value) ? metric.value : 0;
          const val = Math.max(0, Math.min(100, Math.round(safeVal)));
          return (
            <div key={metric.label}>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-slate-600 truncate">
                  {metric.label}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums shrink-0">
                  {val}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full origin-left transition-transform duration-500 ease-out ${
                    val >= 80
                      ? 'bg-emerald-600'
                      : val >= 55
                        ? 'bg-blue-700'
                        : 'bg-amber-500'
                  }`}
                  style={{ transform: `scaleX(${val / 100})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
