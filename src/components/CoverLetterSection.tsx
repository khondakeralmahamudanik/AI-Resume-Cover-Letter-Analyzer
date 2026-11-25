import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Pencil, Eye } from 'lucide-react';
import type { OutputLanguage } from '../types/analysis';
import { copyTextToClipboard } from '../utils/clipboard';

interface CoverLetterSectionProps {
  initialLetter: string;
  language?: OutputLanguage;
}

export function CoverLetterSection({
  initialLetter,
  language,
}: CoverLetterSectionProps) {
  const [letterText, setLetterText] = useState(initialLetter);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLetterText(initialLetter);
    setIsEditing(false);
    setCopied(false);
  }, [initialLetter]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const wordCount = letterText.trim()
    ? letterText.trim().split(/\s+/).length
    : 0;

  const handleCopy = async () => {
    if (!letterText.trim()) return;
    const ok = await copyTextToClipboard(letterText);
    if (ok) {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownload = () => {
    if (!letterText.trim()) return;
    const blob = new Blob([letterText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tailored-cover-letter.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section
      id="cover-letter-section"
      aria-labelledby="cover-letter-heading"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-6 sm:p-7"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id="cover-letter-heading"
              className="text-lg font-semibold text-slate-900"
            >
              Tailored Cover Letter
            </h2>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {wordCount} words
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
            Customized to the target job description using your resume experience.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isEditing ? (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Preview</span>
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Edit</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Download .txt</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
              copied
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-blue-700 text-white hover:bg-blue-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy Cover Letter</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pt-5">
        {isEditing ? (
          <textarea
            aria-label="Edit tailored cover letter"
            value={letterText}
            onChange={(e) => setLetterText(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-slate-300 bg-slate-50/50 p-4 text-[15px] leading-relaxed text-slate-800 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
          />
        ) : (
          <div className="max-w-[70ch] space-y-4 text-[15px] leading-[1.7] text-slate-800 whitespace-pre-wrap">
            {letterText}
          </div>
        )}
      </div>
    </section>
  );
}
