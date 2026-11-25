import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-3.1-flash-lite';

const TONE_INSTRUCTIONS: Record<string, string> = {
  confident:
    'Confident, clear, and results-oriented—highlighting measurable achievements without sounding boastful.',
  executive:
    'Executive and strategic—emphasizing leadership, architectural ownership, cross-functional impact, and business outcomes.',
  concise:
    'Crisp and concise—under 260 words, high-signal paragraphs, direct opening hook, zero filler phrases.',
};

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add it in the Settings > Secrets panel.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 800
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: number }).status)
          : undefined;

      // Do not retry client errors like 400, 401, 403, 404
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err;
      }

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, attempt))
        );
      }
    }
  }
  throw lastError;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, (ch) =>
      ch === '\u00A0' ? ' ' : ''
    )
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPdfBuffer(buf: Buffer): boolean {
  return buf.subarray(0, 1024).includes(Buffer.from('%PDF-'));
}

function isZipBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04
  );
}

function isLegacyDocBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0
  );
}

const app = express();

app.post(
  '/api/extract-resume',
  express.raw({ type: '*/*', limit: '6mb' }),
  async (req: Request, res: Response) => {
    try {
      const rawNameHeader = req.headers['x-file-name'];
      let rawName = '';
      if (typeof rawNameHeader === 'string') {
        try {
          rawName = decodeURIComponent(rawNameHeader);
        } catch {
          rawName = rawNameHeader;
        }
      }
      const safeFileName = path.basename(rawName || 'resume');
      const ext = path.extname(safeFileName).toLowerCase();

      const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

      if (buffer.length === 0) {
        res.status(400).json({
          error: 'The uploaded file is empty. Please choose a non-empty PDF, Word (.docx), or text file.',
        });
        return;
      }

      if (buffer.length > MAX_UPLOAD_BYTES) {
        res.status(413).json({
          error: 'File is too large. Please upload a resume file smaller than 5 MB.',
        });
        return;
      }

      if (ext === '.doc' || isLegacyDocBuffer(buffer)) {
        res.status(400).json({
          error:
            'Legacy .doc format is not supported. Please save your file as .docx or .pdf, or paste the resume text directly.',
        });
        return;
      }

      const detectedPdf = ext === '.pdf' || (!ext && isPdfBuffer(buffer));
      const detectedDocx = ext === '.docx' || (!ext && isZipBuffer(buffer));

      if (detectedPdf) {
        if (!isPdfBuffer(buffer)) {
          res.status(400).json({
            error:
              'This file does not appear to be a valid PDF document. Please check the file or paste your resume text directly.',
          });
          return;
        }

        let extractedRaw = '';
        try {
          const result = await extractText(new Uint8Array(buffer), {
            mergePages: true,
          });
          extractedRaw = typeof result.text === 'string' ? result.text : '';
        } catch (pdfErr: unknown) {
          const msg =
            pdfErr instanceof Error ? pdfErr.message.toLowerCase() : '';
          if (msg.includes('password') || msg.includes('encrypt')) {
            res.status(422).json({
              error:
                'This PDF is password-protected or encrypted. Please unlock it or paste your resume text directly.',
            });
            return;
          }
          res.status(422).json({
            error:
              'Unable to read this PDF file. It may be corrupted or use an unsupported structure.',
          });
          return;
        }

        const cleaned = cleanExtractedText(extractedRaw);
        if (!cleaned) {
          res.status(422).json({
            error:
              'No selectable text could be extracted from this PDF. If it is a scanned or image-only PDF, please paste your resume text directly.',
          });
          return;
        }

        res.json({ text: cleaned, fileName: safeFileName, fileType: 'pdf' });
        return;
      }

      if (detectedDocx) {
        if (!isZipBuffer(buffer)) {
          res.status(400).json({
            error:
              'This file does not appear to be a valid Word (.docx) document. Please verify the file or paste your resume text directly.',
          });
          return;
        }

        let extractedRaw = '';
        try {
          const result = await mammoth.extractRawText({ buffer });
          extractedRaw = result.value ?? '';
        } catch {
          res.status(422).json({
            error:
              'Unable to read this Word (.docx) file. It may be corrupted or password-protected.',
          });
          return;
        }

        const cleaned = cleanExtractedText(extractedRaw);
        if (!cleaned) {
          res.status(422).json({
            error:
              'This Word (.docx) document appears to contain no readable text.',
          });
          return;
        }

        res.json({ text: cleaned, fileName: safeFileName, fileType: 'docx' });
        return;
      }

      if (ext === '.txt' || ext === '.md') {
        if (buffer.includes(0x00)) {
          res.status(400).json({
            error:
              'The uploaded text file appears to contain binary data and cannot be read as plain text.',
          });
          return;
        }
        const cleaned = cleanExtractedText(buffer.toString('utf8'));
        if (!cleaned) {
          res.status(422).json({
            error: 'The uploaded text file is empty.',
          });
          return;
        }
        res.json({ text: cleaned, fileName: safeFileName, fileType: 'text' });
        return;
      }

      res.status(400).json({
        error:
          'Unsupported file format. Please upload a .pdf, .docx, .txt, or .md resume file.',
      });
    } catch (err: unknown) {
      console.error('Resume extraction error:', err);
      res.status(500).json({
        error: 'Failed to process the uploaded file. Please try again or paste your resume text directly.',
      });
    }
  }
);

app.use(express.json({ limit: '1mb' }));

app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      resume?: unknown;
      jobDescription?: unknown;
      tone?: unknown;
      language?: unknown;
    };

    const resume = typeof body.resume === 'string' ? body.resume.trim() : '';
    const jobDescription =
      typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';
    const toneKey =
      typeof body.tone === 'string' && body.tone in TONE_INSTRUCTIONS
        ? body.tone
        : 'confident';
    const language = body.language === 'bn' ? 'bn' : 'en';

    if (!resume || !jobDescription) {
      res.status(400).json({
        error: 'Both a Resume and a Job Description are required to run an analysis.',
      });
      return;
    }

    if (resume.length < 40 || jobDescription.length < 40) {
      res.status(400).json({
        error:
          'Please provide more detail in both the Resume and Job Description (at least 40 characters each).',
      });
      return;
    }

    const ai = createGeminiClient();

    const languageInstruction =
      language === 'bn'
        ? 'Write scoreSummary, all improvementSuggestions fields (title, area, action, exampleRewrite), and the entire coverLetter in natural, polished, professional Bengali (বাংলা). Keep exact technical skill names, tools, and matchedKeywords/missingKeywords in their original terms as used in the job description/resume so ATS keyword matching remains exact.'
        : 'Write scoreSummary, all improvementSuggestions fields (title, area, action, exampleRewrite), and the entire coverLetter in natural, polished, professional English.';

    const prompt = `Analyze the following candidate Resume against the target Job Description.

Target Cover Letter Tone: ${TONE_INSTRUCTIONS[toneKey]}
Target Output Language: ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}

=== CANDIDATE RESUME ===
${resume.slice(0, 24000)}

=== TARGET JOB DESCRIPTION ===
${jobDescription.slice(0, 24000)}
`;

    const response = await generateWithRetry(() =>
      ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction: `You are an expert technical recruiter, Applicant Tracking System (ATS) specialist, and career strategist.
Evaluate the candidate's Resume strictly and honestly against the Job Description.

Language Requirement:
${languageInstruction}

Guidelines:
1. atsMatchScore (0-100 integer): Calculate a realistic, well-calibrated ATS alignment score based on required skills, domain tools, seniority/scope match, and quantified achievements. Do not inflate scores arbitrarily.
2. scoreSummary: Write 1-2 crisp sentences explaining the primary drivers of the score and the single biggest gap (in the Target Output Language).
3. scoreBreakdown: Score 0-100 integers for keywordAlignment, experienceRelevance, and impactAndMetrics.
4. matchedKeywords: List up to 12 exact key skills, technologies, or qualifications present in BOTH the resume and the job description.
5. missingKeywords: List 5 to 12 specific keywords, technologies, frameworks, methodologies, or qualifications explicitly sought in the job description that are missing or clearly underrepresented in the resume. Categorize each accurately and mark priority as "High" (core requirement) or "Medium" (preferred/supporting).
6. improvementSuggestions: Provide 4 to 6 concrete, actionable improvements tailored to this exact resume and role, written in the Target Output Language. Each suggestion must specify the resume area (e.g., "Summary", "Experience Bullets", "Skills Matrix" or its natural equivalent in Bengali), impact level ("High" or "Medium"), a clear action step, and a realistic exampleRewrite grounded ONLY in truth from the candidate's existing resume (never fabricate employers, metrics, or fake experience; if suggesting quantification, use a clear bracketed placeholder like [X%]).
7. coverLetter: Write a polished, ready-to-send cover letter in the Target Output Language tailored to the exact role and company mentioned in the job description (or a clean bracketed placeholder if omitted), weaving in real accomplishments from the resume, formatted with clear greeting, 3-4 well-paced paragraphs, and a professional sign-off using the candidate's name if present in the resume.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              atsMatchScore: {
                type: Type.INTEGER,
                description: 'Overall ATS match score from 0 to 100.',
              },
              scoreSummary: {
                type: Type.STRING,
                description: '1-2 sentence executive explanation of the ATS match score.',
              },
              scoreBreakdown: {
                type: Type.OBJECT,
                properties: {
                  keywordAlignment: { type: Type.INTEGER },
                  experienceRelevance: { type: Type.INTEGER },
                  impactAndMetrics: { type: Type.INTEGER },
                },
                required: [
                  'keywordAlignment',
                  'experienceRelevance',
                  'impactAndMetrics',
                ],
              },
              matchedKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Up to 12 key skills/requirements matched in both.',
              },
              missingKeywords: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      enum: [
                        'Technical Skill',
                        'Domain & Tooling',
                        'Leadership & Soft Skill',
                        'Qualification',
                      ],
                    },
                    priority: {
                      type: Type.STRING,
                      enum: ['High', 'Medium'],
                    },
                  },
                  required: ['keyword', 'category', 'priority'],
                },
              },
              improvementSuggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    area: { type: Type.STRING },
                    impact: {
                      type: Type.STRING,
                      enum: ['High', 'Medium'],
                    },
                    action: { type: Type.STRING },
                    exampleRewrite: { type: Type.STRING },
                  },
                  required: ['title', 'area', 'impact', 'action', 'exampleRewrite'],
                },
              },
              coverLetter: {
                type: Type.STRING,
                description: 'Complete tailored cover letter with paragraph breaks.',
              },
            },
            required: [
              'atsMatchScore',
              'scoreSummary',
              'scoreBreakdown',
              'matchedKeywords',
              'missingKeywords',
              'improvementSuggestions',
              'coverLetter',
            ],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Empty response received from Gemini model.');
    }

    const cleanJsonText = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsedRaw: Record<string, unknown>;
    try {
      const parsedUnknown: unknown = JSON.parse(cleanJsonText);
      if (
        typeof parsedUnknown !== 'object' ||
        parsedUnknown === null ||
        Array.isArray(parsedUnknown)
      ) {
        throw new Error('Parsed response is not an object.');
      }
      parsedRaw = parsedUnknown as Record<string, unknown>;
    } catch {
      throw new Error('Received an invalid analysis format from Gemini. Please try again.');
    }

    const parseValidScore = (val: unknown): number | null => {
      if (typeof val === 'number' && Number.isFinite(val)) {
        return Math.max(0, Math.min(100, Math.round(val)));
      }
      if (typeof val === 'string' && val.trim() !== '') {
        const cleaned = val.trim().replace(/%$/, '');
        const n = Number(cleaned);
        if (Number.isFinite(n)) {
          return Math.max(0, Math.min(100, Math.round(n)));
        }
      }
      return null;
    };

    const rawBreakdown =
      typeof parsedRaw.scoreBreakdown === 'object' &&
      parsedRaw.scoreBreakdown !== null &&
      !Array.isArray(parsedRaw.scoreBreakdown)
        ? (parsedRaw.scoreBreakdown as Record<string, unknown>)
        : null;

    if (!rawBreakdown) {
      throw new Error('Gemini returned an incomplete score breakdown. Please try again.');
    }

    const keywordAlignment = parseValidScore(rawBreakdown.keywordAlignment);
    const experienceRelevance = parseValidScore(rawBreakdown.experienceRelevance);
    const impactAndMetrics = parseValidScore(rawBreakdown.impactAndMetrics);
    let atsMatchScore = parseValidScore(parsedRaw.atsMatchScore);

    if (
      keywordAlignment === null ||
      experienceRelevance === null ||
      impactAndMetrics === null ||
      atsMatchScore === null
    ) {
      throw new Error('Gemini returned invalid score metrics. Please try again.');
    }

    const matchedKeywords = Array.isArray(parsedRaw.matchedKeywords)
      ? parsedRaw.matchedKeywords.filter(
          (k): k is string => typeof k === 'string' && k.trim().length > 0
        )
      : [];

    // Guard against inconsistent 0% overall score when sub-scores or matched keywords are positive
    if (
      atsMatchScore === 0 &&
      (keywordAlignment > 0 || experienceRelevance > 0 || matchedKeywords.length > 0)
    ) {
      atsMatchScore = Math.max(
        1,
        Math.round(
          keywordAlignment * 0.45 +
            experienceRelevance * 0.35 +
            impactAndMetrics * 0.2
        )
      );
    }

    const improvementSuggestions = Array.isArray(parsedRaw.improvementSuggestions)
      ? parsedRaw.improvementSuggestions
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map((item) => ({
            title:
              typeof item.title === 'string' && item.title.trim()
                ? item.title.trim()
                : 'Resume Improvement',
            area:
              typeof item.area === 'string' && item.area.trim()
                ? item.area.trim()
                : 'Experience',
            impact: item.impact === 'Medium' ? 'Medium' : 'High',
            action: typeof item.action === 'string' ? item.action.trim() : '',
            exampleRewrite:
              typeof item.exampleRewrite === 'string'
                ? item.exampleRewrite.trim()
                : '',
          }))
          .filter((item) => item.action.length > 0)
      : [];

    const coverLetter =
      typeof parsedRaw.coverLetter === 'string' ? parsedRaw.coverLetter.trim() : '';

    if (improvementSuggestions.length === 0 || !coverLetter) {
      throw new Error(
        'Gemini returned an incomplete analysis (missing suggestions or cover letter). Please try again.'
      );
    }

    const normalized = {
      atsMatchScore,
      scoreSummary:
        typeof parsedRaw.scoreSummary === 'string' && parsedRaw.scoreSummary.trim()
          ? parsedRaw.scoreSummary.trim()
          : 'Analysis completed based on the provided resume and job description.',
      scoreBreakdown: {
        keywordAlignment,
        experienceRelevance,
        impactAndMetrics,
      },
      matchedKeywords,
      missingKeywords: Array.isArray(parsedRaw.missingKeywords)
        ? parsedRaw.missingKeywords
            .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
            .map((item) => ({
              keyword: typeof item.keyword === 'string' ? item.keyword.trim() : '',
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
      improvementSuggestions,
      coverLetter,
      language,
    };

    res.json(normalized);
  } catch (err: unknown) {
    console.error('Analysis error:', err);

    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status?: number }).status)
        : 500;
    const rawMessage =
      err instanceof Error ? err.message : 'Failed to analyze resume and job description.';

    if (status === 403 || rawMessage.includes('PERMISSION_DENIED')) {
      res.status(403).json({
        error:
          'Gemini API permission denied. Please verify your API key in the Settings > Secrets panel.',
      });
      return;
    }

    if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
      res.status(429).json({
        error:
          'Gemini API rate limit or quota reached. Please wait a moment and try again, or check your billing quota in Settings > Secrets.',
      });
      return;
    }

    if (status === 400 && rawMessage.includes('API_KEY_INVALID')) {
      res.status(400).json({
        error:
          'Invalid Gemini API key. Please check your GEMINI_API_KEY in the Settings > Secrets panel.',
      });
      return;
    }

    if (status === 404 || rawMessage.includes('NOT_FOUND')) {
      res.status(404).json({
        error: `Configured Gemini model (${MODEL_NAME}) was not found or is unavailable.`,
      });
      return;
    }

    res.status(status >= 400 && status < 600 ? status : 500).json({
      error: rawMessage,
    });
  }
});

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    res.status(413).json({
      error: 'Uploaded payload exceeds the maximum allowed size (5 MB).',
    });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON request payload.',
    });
    return;
  }
  next(err);
});

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
