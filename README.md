# SFU C2C

Upload your SFU advising transcript (PDF) and a target job role to get personalized SFU course recommendations that help you move toward that role. Completed courses are excluded; only courses you haven't taken are suggested. The app also generates a **semester plan** (when courses are offered) and an **Internship Procurement Supplement** based on real internship reviews from [InternDB](https://www.interndb.io).

---

## Features

- **Transcript parsing** — Extracts completed courses, major, and credits from SFU advising PDFs
- **Course recommendations** — Top 10 SFU courses ranked for your target role (e.g. Software Engineer, Data Scientist)
- **Semester plan** — Schedules recommended courses by when SFU offers them (uses SFU Course Outlines API; future semesters use prediction)
- **Pace options** — Normal (3 courses/semester) or Speedrun (5 courses/semester)
- **Internship insights** — AI-synthesized guide from InternDB reviews: interview tips, skills that helped, compensation, and practical advice

---

## Flow overview

```
[You]  Upload PDF transcript  +  Enter target role  +  Choose pace
         ↓                              ↓                    ↓
    POST /api/parse-transcript      (UI state)          (UI state)
         ↓
    Parse transcript (regex + OpenAI fallback)
         ↓
    [You]  Click "Get course recommendations"
         ↓
    ┌─────────────────────────────────────────────────────────────────┐
    │  Parallel API calls                                              │
    │                                                                  │
    │  POST /api/recommend-courses     POST /api/internship-guide      │
    │  { parsedTranscript, targetRole, pace }   { targetRole }         │
    │         ↓                                    ↓                   │
    │  Course ranking + semester plan     InternDB reviews + OpenAI    │
    └─────────────────────────────────────────────────────────────────┘
         ↓                                    ↓
    [UI]  Show course plan (transcript, semester plan, how courses help)
          + Internship insights for {role}
```

---

## 1. Parse transcript (`POST /api/parse-transcript`)

**Input:** PDF file (SFU advising transcript) sent as `file` or `transcript` in the request body.

| Step | What happens | Where |
|------|--------------|-------|
| 1 | PDF bytes are read from the request | `route.ts` |
| 2 | **pdf-parse** extracts raw text from the PDF | `lib/pdf.ts` → `extractTextFromPdf(buffer)` |
| 3 | **Local (regex)** extraction: completed courses, major, total credits | `lib/transcriptParser.ts` |
| 4 | If regex finds &lt; 5 courses: **OpenAI** extracts `completed_courses` (handles different PDF layouts) | `route.ts` |
| 5 | If major or total_credits missing: **OpenAI** fills them from header snippet | `route.ts` |

**Output:** `{ student_major, completed_courses: [{ code }], total_credits_completed }`

---

## 2. Course recommendations (`POST /api/recommend-courses`)

**Input:** `{ parsedTranscript, targetRole, pace }` — pace is `"normal"` (3 courses/semester) or `"speedrun"` (5 courses/semester).

| Step | What happens | Where |
|------|--------------|-------|
| 1 | Map role → SFU departments (built-in map or OpenAI) | `route.ts` |
| 2 | **SFU Courses API** fetches outlines by department | `lib/sfuCourses.ts` |
| 3 | Filter out completed courses (including equivalence groups, e.g. MATH 150 vs 151) | `route.ts` |
| 4 | OpenAI ranks top 10 courses with reasons | `route.ts` |
| 5 | **SFU Course Outlines API** (offerings) — which semesters each recommended course is offered | `lib/sfuOfferings.ts` |
| 6 | Build semester plan: assign courses to semesters based on offerings | `route.ts` |

**Output:** `{ major, target_role, total_credits_completed, credits_remaining, recommended_courses, semester_plan }`

---

## 3. Internship guide (`POST /api/internship-guide`)

**Input:** `{ targetRole, companyName? }` — optional `companyName` filters to a specific company.

| Step | What happens | Where |
|------|--------------|-------|
| 1 | Read `data/interndb.json` (must exist — run `npm run fetch-internships`) | `lib/interndb.ts` |
| 2 | Filter reviews by role (keyword matching: software → firmware/embedded/backend/frontend, etc.) | `lib/interndb.ts` |
| 3 | Select up to 15 reviews, format for prompt | `route.ts` |
| 4 | **OpenAI** synthesizes "Internship Procurement Supplement": interview formats, skills, compensation, tips | `route.ts` |

**Output:** `{ guide, reviewCount }` or `{ guide: null, message }` if no reviews found.

---

## 4. InternDB data (`npm run fetch-internships`)

The internship guide uses local data from `data/interndb.json`. Populate it with:

```bash
npm run fetch-internships
```

This script:

1. Fetches companies from `https://api.interndb.io/api/v1/companies?q=&sortBy=mostReviews`
2. For each company with reviews, fetches reviews from `/reviews/company/{companyId}`
3. Writes `data/interndb.json` with `fetchedAt`, `companies`, `reviews`

Run periodically (e.g. weekly) to refresh. If the file is missing, the internship section shows: *"Run `npm run fetch-internships` to populate."*

---

## Services used

| Service | When used |
|---------|-----------|
| **pdf-parse** | Every transcript parse: PDF → raw text |
| **Local regex** | Every transcript parse: courses, major, credits |
| **OpenAI** | Parse fallback (&lt; 5 courses or missing major/credits); role→depts if not in map; course ranking; internship guide synthesis |
| **SFU Courses API** | Every recommendation: course outlines by department |
| **SFU Course Outlines API** | Every recommendation: when courses are offered (with cache) |
| **InternDB API** | Only during `npm run fetch-internships`; app reads local JSON |

---

## Run locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   Create `.env.local` with:
   ```
   OPENAI_API_KEY=sk-...
   ```
   Optional: `OPENAI_MODEL` (default: `gpt-4o-mini`).

3. **Internship data** (optional)
   ```bash
   npm run fetch-internships
   ```
   Without this, the internship section will prompt you to run it.

4. **Start dev server**
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 — upload a transcript, enter a target role, choose pace, then click "Get course recommendations".

---

## Project structure

```
app/
  api/
    parse-transcript/route.ts    # PDF → parsed transcript
    recommend-courses/route.ts   # Course ranking + semester plan
    internship-guide/route.ts    # InternDB reviews → OpenAI supplement
  components/
    UploadTranscript.tsx         # PDF upload + parse
    CourseResults.tsx            # Plan + semester + courses + internship insights
    AnimatedPathBackground.tsx
data/
  interndb.json                  # InternDB cache (from fetch-internships)
  sfu-offerings-cache.json       # SFU offerings cache (auto-generated)
lib/
  pdf.ts                         # PDF text extraction
  transcriptParser.ts            # Regex + extraction helpers
  sfuCourses.ts                  # SFU Courses API
  sfuOfferings.ts                # SFU Course Outlines (offerings)
  interndb.ts                    # Read/filter InternDB data
  openai.ts                      # OpenAI client
  types.ts                       # Shared types
scripts/
  fetch-internships.ts           # Fetch InternDB → data/interndb.json
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run fetch-internships` | Fetch InternDB companies + reviews → `data/interndb.json` |
