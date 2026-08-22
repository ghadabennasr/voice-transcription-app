# Voice Transcription App

Voice-to-voice app for TalentAI candidate interviews: the user speaks, the app transcribes and understands the voice, and returns a response built with a Next.js frontend, a Fastify backend, and the Gemini Live API for speech understanding.

Full research behind the AI provider choice (Munsit, Speechmatics, OpenAI/Whisper, Deepgram, Gemini) is in `/docs/research-report.docx`. Architecture diagram is in `/docs/architecture.pdf`.

## Prerequisites

Before starting, make sure you have:

- **Node.js** (LTS version) check with `node -v` in your terminal. If it errors, install from [nodejs.org](https://nodejs.org)
- **Git** check with `git --version`. If it errors, install from [git-scm.com](https://git-scm.com)
- **VS Code** (or any code editor)
- A GitHub account with access to this repo
- A **Gemini API key** (free tier) get one at [aistudio.google.com](https://aistudio.google.com)

## Project structure

```
voice-transcription-app/
├── frontend/         # Next.js app (records audio, displays results)
├── backend/          # Fastify server (talks to Gemini)
├── docs/             # Research report + architecture diagram
├── .env.example      # Template for environment variables
└── README.md
```

## Setup first time only

1. Clone the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/voice-transcription-app.git
   cd voice-transcription-app
   ```

2. Configure Git with your identity (first time on this machine only):
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your@email.com"
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Install backend dependencies:
   ```bash
   cd ../backend
   npm install
   ```

5. Set up your environment variables:
   - Copy `.env.example` to `.env` inside `/backend`
   - Add your own Gemini API key (never commit `.env`, it's already in `.gitignore`)
   ```
   GEMINI_API_KEY=your_key_here
   ```

## Running the project

Open **two terminals** (one for each):

**Terminal 1 — backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:4000` (or whatever port is set in `backend/.env`).

## Git workflow — branches

This project uses three branches:

- **`dev`** — where new code is written and first tried out
- **`test`** — where finished `dev` code gets tested before it's considered safe
- **`main`** — the stable, working version of the project

**Flow:** write code on `dev` → once it works, merge into `test` and test it there → once confirmed working, merge `test` into `main`.

```bash
# Working on dev
git checkout dev
git pull
# ...write code, commit as usual...
git push

# Once dev is ready, merge it into test
git checkout test
git pull
git merge dev
git push
# ...test it here...

# Once test is confirmed working, merge into main
git checkout main
git pull
git merge test
git push
```

**Rules:**
- Never commit `.env` or any API key, on any branch
- Always `git pull` before starting work on a branch, to avoid conflicts
- Use `git merge`, never copy-paste code between branches manually
- Commit with clear messages, e.g. `feat: add record button`, `fix: audio upload bug`

## Status

- [ ] Audio recording (frontend)
- [ ] Send audio to backend
- [ ] Backend → Gemini (basic upload)
- [ ] Backend → Gemini Live API (real-time streaming)
- [ ] Display/play response in frontend