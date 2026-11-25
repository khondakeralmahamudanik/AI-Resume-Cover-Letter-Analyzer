import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import { AlertCircle, FileText, Loader2, Trash2, Upload, X } from 'lucide-react';
import type { CoverLetterTone, OutputLanguage } from '../types/analysis';

interface InputWorkspaceProps {
  resume: string;
  jobDescription: string;
  tone: CoverLetterTone;
  language: OutputLanguage;
  isAnalyzing: boolean;
  validationError: string | null;
  resetSignal: number;
  onResumeChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onToneChange: (tone: CoverLetterTone) => void;
  onLanguageChange: (language: OutputLanguage) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md']);

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function InputWorkspace({
  resume,
  jobDescription,
  tone,
  language,
  isAnalyzing,
  validationError,
  resetSignal,
  onResumeChange,
  onJobDescriptionChange,
  onToneChange,
  onLanguageChange,
  onAnalyze,
  onLoadSample,
}: InputWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    setFileError(null);
    setUploadedFileName(null);
  }, [resetSignal]);

  useEffect(() => {
    if (!resume.trim()) {
      setUploadedFileName(null);
    }
  }, [resume]);

  const processResumeFile = async (file: File) => {
    setFileError(null);

    const ext = getFileExtension(file.name);
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      if (ext === '.doc') {
        setFileError(
          'Legacy .doc files are not supported. Please save your resume as .docx or .pdf, or paste the text directly.'
        );
      } else {
        setFileError(
          `Unsupported file format (${ext || 'unknown'}). Please upload a .pdf, .docx, .txt, or .md file.`
        );
      }
      return;
    }

    if (file.size === 0) {
      setFileError('The selected file is empty. Please choose a file with resume content.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        'This file exceeds the 5 MB limit. Please upload a smaller PDF, Word (.docx), or text file.'
      );
      return;
    }

    if (ext === '.txt' || ext === '.md') {
      try {
        const rawText = await file.text();
        const cleaned = rawText.replace(/\r\n?/g, '\n').trim();
        if (!cleaned) {
          setFileError('The uploaded text file is empty.');
          return;
        }
        onResumeChange(cleaned);
        setUploadedFileName(file.name);
      } catch {
        setFileError('Unable to read this text file. Please paste the resume text directly.');
      }
      return;
    }

    // PDF (.pdf) and Word (.docx) extraction via backend
    setIsExtractingFile(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const response = await fetch('/api/extract-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: arrayBuffer,
      });

      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          if (typeof parsed === 'object' && parsed !== null) {
            data = parsed as Record<string, unknown>;
          }
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        if (typeof data.error === 'string') {
          throw new Error(data.error);
        }
        if (response.status === 404 || response.status === 405) {
          throw new Error(
            'PDF and Word (.docx) extraction requires the Node.js server. On static hosting, please paste your resume text or upload a .txt / .md file.'
          );
        }
        throw new Error('Unable to extract text from the uploaded file.');
      }

      const extracted = typeof data?.text === 'string' ? data.text.trim() : '';
      if (!extracted) {
        throw new Error('No readable text was found in the uploaded file.');
      }

      onResumeChange(extracted);
      setUploadedFileName(file.name);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to read the uploaded file. Please try again or paste your text directly.';
      setFileError(message);
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void processResumeFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    if (!isAnalyzing && !isExtractingFile) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    e.preventDefault();
    setIsDraggingOver(false);
    if (isAnalyzing || isExtractingFile) return;
    void processResumeFile(file);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isAnalyzing && !isExtractingFile) {
      e.preventDefault();
      onAnalyze();
    }
  };

  const resumeWords = countWords(resume);
  const jdWords = countWords(jobDescription);
  const isBusy = isAnalyzing || isExtractingFile;

  return (
    <section
      id="inputs-section"
      aria-labelledby="inputs-heading"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 id="inputs-heading" className="text-lg font-semibold text-slate-900">
            Application Inputs
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Paste text or upload a PDF, Word (.docx), or text resume.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFileError(null);
            setUploadedFileName(null);
            onLoadSample();
          }}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50/70 border border-blue-200 rounded-lg hover:bg-blue-100/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Load Sample</span>
        </button>
      </div>

      {/* Resume Field */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="resume-input"
            className="text-sm font-semibold text-slate-800"
          >
            Resume
          </label>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono tabular-nums">{resumeWords} words</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Upload PDF, Word (.docx), or text resume file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              title="Supported formats: .pdf, .docx, .txt, .md (up to 5 MB)"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isExtractingFile ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Reading file...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Upload PDF / DOCX / TXT</span>
                </>
              )}
            </button>
            {resume.length > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onResumeChange('');
                    setUploadedFileName(null);
                    setFileError(null);
                  }}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        {fileError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1 leading-relaxed">{fileError}</span>
            <button
              type="button"
              onClick={() => setFileError(null)}
              aria-label="Dismiss file error"
              className="text-red-500 hover:text-red-700 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative"
        >
          <textarea
            id="resume-input"
            value={resume}
            onChange={(e) => {
              onResumeChange(e.target.value);
              if (fileError) setFileError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            rows={9}
            placeholder="Paste your resume text here, or drag and drop a .pdf, .docx, .txt, or .md file..."
            className={`w-full rounded-lg border bg-slate-50/40 px-3.5 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 transition-colors resize-y min-h-[180px] disabled:opacity-60 ${
              isDraggingOver
                ? 'border-blue-700 bg-blue-50/40 ring-2 ring-blue-700/15'
                : 'border-slate-200'
            }`}
          />
        </div>

        {uploadedFileName && resume.length > 0 && (
          <p className="text-xs text-slate-500 truncate">
            Extracted from <span className="font-medium text-slate-700">{uploadedFileName}</span>
          </p>
        )}
      </div>

      {/* Job Description Field */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="jd-input"
            className="text-sm font-semibold text-slate-800"
          >
            Job Description
          </label>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono tabular-nums">{jdWords} words</span>
            {jobDescription.length > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => onJobDescriptionChange('')}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        <textarea
          id="jd-input"
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
          rows={9}
          placeholder="Paste the complete target job posting (role title, responsibilities, required & preferred qualifications)..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50/40 px-3.5 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 transition-colors resize-y min-h-[180px] disabled:opacity-60"
        />
      </div>

      {/* Output Language, Cover Letter Tone & Analyze Action */}
      <div className="pt-2 border-t border-slate-100 flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-600">
            Output Language
          </span>
          <div
            role="group"
            aria-label="Output language for suggestions and cover letter"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
          >
            {(
              [
                { id: 'en', label: 'English' },
                { id: 'bn', label: 'বাংলা (Bengali)' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onLanguageChange(option.id)}
                disabled={isBusy}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  language === option.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-600">
            Cover Letter Tone
          </span>
          <div
            role="group"
            aria-label="Cover letter tone"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
          >
            {(
              [
                { id: 'confident', label: 'Confident' },
                { id: 'executive', label: 'Executive' },
                { id: 'concise', label: 'Concise' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onToneChange(option.id)}
                disabled={isBusy}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  tone === option.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {validationError && (
          <p
            role="alert"
            className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
          >
            {validationError}
          </p>
        )}

        <button
          type="button"
          onClick={onAnalyze}
          disabled={isBusy}
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 active:bg-blue-900 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Analyzing Resume &amp; Job Match...</span>
            </>
          ) : (
            <span>Analyze</span>
          )}
        </button>
      </div>
    </section>
  );
}
