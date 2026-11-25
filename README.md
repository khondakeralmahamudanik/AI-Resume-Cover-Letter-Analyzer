# AI Resume & Cover Letter Analyzer

A full-stack web application that compares your resume against any job description to calculate an ATS match score, surface missing keywords, suggest targeted resume improvements, and draft a tailored cover letter in English or Bengali.

## Features

- **ATS Match Score (0–100%)**: Overall compatibility score with sub-metrics for **Keyword Alignment**, **Experience Relevance**, and **Impact & Metrics**.
- **Resume Upload & Paste**: Paste resume text directly or drag-and-drop `.pdf`, `.docx`, `.txt`, and `.md` files (up to 5 MB).
- **Keyword Gap Analysis**: Separates matched keywords from prioritized missing keywords (`Technical Skill`, `Domain & Tooling`, `Leadership & Soft Skill`, `Qualification`).
- **Actionable Suggestions**: Concrete improvement actions with example rewrites tailored to the target role.
- **Tailored Cover Letter**: Generates a custom cover letter in **English** or **বাংলা (Bengali)** with selectable tones (`Confident`, `Executive`, `Concise`) and one-click copy.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express (`server.ts`)
- **Document Parsing**: `unpdf` (`.pdf`), `mammoth` (`.docx`)
- **AI**: Google Gemini API (`@google/genai`)

## Local Development

### Prerequisites

- Node.js `>= 20.0.0` (tested on Node 22)
- A Google Gemini API key

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your environment file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Set your Gemini API key inside `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server (Express + Vite on `http://localhost:3000`):
   ```bash
   npm run dev
   ```

5. Build and run for production:
   ```bash
   npm run build
   npm start
   ```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts the Express backend + Vite dev middleware on port `3000` |
| `npm run build` | Builds the frontend production bundle into `dist/` |
| `npm start` | Runs the production Express server (`server.ts`) serving API routes and `dist/` |
| `npm run lint` | Runs TypeScript typechecking (`tsc --noEmit`) |

## GitHub Pages & Deployment Notes

### Fixing the `No such file or directory @ dir_chdir0 - /github/workspace/docs` Error

That error happens when GitHub Pages is configured to **Deploy from a branch** using the `/docs` folder (which triggers GitHub's legacy Jekyll builder). This project builds its frontend into `dist/` using Vite rather than Jekyll.

This repository includes:
- `.github/workflows/deploy-pages.yml` — builds the Vite app with the proper subpath (`VITE_BASE_PATH`) and deploys `dist/` directly.
- `.github/workflows/ci.yml` — runs typechecking (`npm run lint`) and builds (`npm run build`) on pushes and pull requests.
- `public/.nojekyll` — disables Jekyll processing on the deployed bundle.

To enable the workflow in your GitHub repository:
1. Open your repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, switch from **Deploy from a branch** to **GitHub Actions**.
3. Push to `main` (or `master`), or trigger **Deploy to GitHub Pages** manually from the **Actions** tab.

### Full-Stack Hosting Requirement

GitHub Pages only hosts static frontend assets (`dist/`). Because AI analysis (`/api/analyze`) and PDF/DOCX text extraction (`/api/extract-resume`) run on the Express server (`server.ts`) so your `GEMINI_API_KEY` stays private on the server, deploy the full-stack app to a Node.js host (such as **Google Cloud Run**, **Render**, **Railway**, or **Fly.io**) using `npm run build` and `npm start`, with `GEMINI_API_KEY` set in the server environment variables.

## Project Structure

```text
├── .github/workflows/     # CI & GitHub Pages workflows
├── public/                # Static assets & .nojekyll
├── src/
│   ├── components/        # Workspace UI components
│   ├── data/              # Sample resume and job description
│   ├── types/             # Shared TypeScript interfaces
│   ├── utils/             # Clipboard and client helpers
│   ├── App.tsx            # Main application shell & state
│   └── index.css          # Tailwind v4 theme & styles
├── server.ts              # Express server + Gemini & file parsing APIs
├── vite.config.ts         # Vite configuration (supports VITE_BASE_PATH)
├── .env.example           # Required environment variable template
└── package.json
```

## License

Licensed under the [Apache License 2.0](LICENSE).
