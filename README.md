# SFU C2C

Upload your SFU advising transcript (PDF) and a target job role to get a short list of SFU courses that help you move toward that role. Completed courses are excluded; only courses you haven’t taken are suggested.

---

## Flow overview

```
[You]  Upload PDF transcript  +  Enter target role
         ↓                              ↓
    POST /api/parse-transcript      (kept in UI state)
         ↓
    Parse transcript (see below)
         ↓
    [You]  Click "Get course recommendations"
         ↓
    POST /api/recommend-courses  { parsedTranscript, targetRole }
         ↓
    Recommend courses (see below)
         ↓
    [UI]  Show course plan (transcript details + top 10 courses)
```

---

## 1. Input → Parse transcript (`POST /api/parse-transcript`)

**Input:** PDF file (SFU advising transcript) sent as `file` or `transcript` in the request body.

| Step | What happens | Where |
|------|----------------|------|
| 1 | PDF bytes are read from the request. | `route.ts` |
| 2 | **pdf-parse** extracts raw text from the PDF. | `lib/pdf.ts` → `extractTextFromPdf(buffer)` |
| 3 | **Local (regex)** extraction on the full text: completed courses, major, total credits. | `lib/transcriptParser.ts` → `extractCompletedCoursesFromTranscript`, `extractMajorFromTranscript`, `extractTotalCreditsFromTranscript` |
| 4 | If regex finds **&lt; 5 courses**: **OpenAI** is used to extract `completed_courses` from the transcript (so different PDF layouts still work). | `route.ts` – fallback with `EXTRACT_COURSES_SYSTEM` |
| 5 | If **major** or **total_credits** are missing: **OpenAI** is used on a short header snippet to fill them. | `route.ts` – fallback with `MAJOR_CREDITS_SYSTEM` |

**Output:** JSON with `student_major`, `completed_courses` (array of `{ code: "CMPT 225" }`), and `total_credits_completed`.

- **pdf-parse:** used for every request (PDF → text).
- **OpenAI:** used only when regex fails (too few courses) or when major/credits are missing.

---

## 2. Parse result + target role → Course recommendations (`POST /api/recommend-courses`)

**Input:** JSON body with `parsedTranscript` (from step 1) and `targetRole` (e.g. `"Machine Learning Engineer"`).

| Step | What happens | Where |
|------|----------------|------|
| 1 | **Map role → SFU departments.** If the role is in a built-in map (e.g. "machine learning engineer" → CMPT, MATH, STAT, MACM), that is used. Otherwise **OpenAI** is asked for a JSON array of department codes. | `route.ts` – `ROLE_TO_DEPTS` or one OpenAI call |
| 2 | **SFU Courses API** is called to get course outlines for those departments. | `lib/sfuCourses.ts` → `fetchOutlinesForRoadmap` → `fetchOutlinesByDepartment(dept)` |
| 3 | Each department is fetched with `GET https://api.sfucourses.com/v1/rest/outlines?dept=...`. Results are merged and deduped, up to a cap (e.g. 80 courses, 5 depts). | `lib/sfuCourses.ts` |
| 4 | **Filter out completed courses:** any course whose code is in `parsedTranscript.completed_courses` is removed. | `route.ts` – `completedSet(parsedTranscript)`, then filter `allOutlines` |
| 5 | The remaining courses are trimmed to a short list (e.g. 30) with titles and short descriptions, then sent to **OpenAI** with a prompt: “Rank the TOP 10 most useful for this role” and return JSON (`course_code`, `reason`). | `route.ts` – `slimOutlinesForPrompt`, then `promptOpenAI(rankPrompt, { json: true })` |
| 6 | The top 10 from OpenAI’s response are turned into the final list (with course names from the SFU outlines). | `route.ts` – build `recommended_courses` from `ranked` and `codeToOutline` |

**Output:** JSON with `major`, `target_role`, `total_credits_completed`, `credits_remaining` (e.g. 120 − total), and `recommended_courses` (array of `{ course_code, course_name?, reason }`).

- **SFU Courses API:** used to get course catalog (outlines by department).
- **OpenAI:** used for role→departments (if not in map) and for ranking the top 10 courses.

---

## Summary: when each service is used

| Service | When it’s used |
|--------|-----------------|
| **pdf-parse** | Every transcript parse: PDF → raw text. |
| **Local regex** | Every transcript parse: courses, major, credits from text. |
| **OpenAI (parse)** | Only when regex finds &lt; 5 courses, or when major/credits are missing. |
| **SFU Courses API** | Every recommendation request: fetch outlines by department (`/v1/rest/outlines?dept=...`). |
| **OpenAI (recommend)** | Role→departments if role not in `ROLE_TO_DEPTS`; always for ranking the top 10 courses. |

---

## Run locally

1. Install dependencies: `npm install`
2. Add `.env.local` with `OPENAI_API_KEY=...`
3. Start dev server: `npm run dev`
4. Open http://localhost:3000, upload a transcript PDF, enter a target role, then get recommendations.
