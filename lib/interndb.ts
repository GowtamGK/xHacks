/**
 * Read and filter InternDB data from data/interndb.json
 */

import * as fs from "fs"
import * as path from "path"

export type InternDBReview = {
  _id: string
  CompanyID: string
  CompanyName?: string
  PositionTitle: string
  IsOffer: string
  Location: string
  WorkOption: string
  Role: string
  Salary?: number
  Currency?: string
  StartDate?: string
  EndDate?: string
  InterviewProcess?: string
  InterviewInformation?: string
  Comments?: string
  [key: string]: unknown
}

export type InterndbData = {
  fetchedAt: string
  companies: { companyId: string; name: string; reviewCount: number }[]
  reviews: InternDBReview[]
}

let cachedData: InterndbData | null = null

function getDataPath(): string {
  return path.join(process.cwd(), "data", "interndb.json")
}

export function readInterndbData(): InterndbData | null {
  if (cachedData) return cachedData
  const dataPath = getDataPath()
  if (!fs.existsSync(dataPath)) return null
  try {
    const raw = fs.readFileSync(dataPath, "utf-8")
    cachedData = JSON.parse(raw) as InterndbData
    return cachedData
  } catch {
    return null
  }
}

/** Match target role to InternDB Role or PositionTitle */
function roleMatchesTarget(role: string, positionTitle: string, targetRole: string): boolean {
  const r = role.toLowerCase()
  const p = positionTitle.toLowerCase()
  const t = targetRole.toLowerCase()
  const combined = `${r} ${p}`

  const keywords = t.split(/\s+/).filter((w) => w.length > 2)
  const hasMatch = keywords.some((kw) => combined.includes(kw))

  // Broad mappings: software → firmware/embedded/backend/frontend; ml → machine learning/ai
  if (t.includes("software") && (r.includes("software") || r.includes("firmware") || r.includes("embedded") || r.includes("backend") || r.includes("frontend") || p.includes("software"))) return true
  if ((t.includes("data") || t.includes("ml") || t.includes("machine learning")) && (r.includes("data") || r.includes("ml") || r.includes("machine learning") || r.includes("ai") || p.includes("ml") || p.includes("data"))) return true
  if (t.includes("web") && (r.includes("web") || r.includes("frontend") || r.includes("software") || p.includes("web"))) return true
  if (t.includes("product") && (r.includes("product") || p.includes("product"))) return true
  if (t.includes("engineer") && (r.includes("engineer") || p.includes("engineer"))) return true

  return hasMatch
}

/**
 * Filter reviews relevant to target role and optional company.
 * If companyName is given, filter to that company. Otherwise use all.
 */
export function getRelevantReviews(
  targetRole: string,
  companyName?: string
): InternDBReview[] {
  const data = readInterndbData()
  if (!data?.reviews?.length) return []

  let reviews = data.reviews

  if (companyName?.trim()) {
    const name = companyName.trim().toLowerCase()
    reviews = reviews.filter((r) => r.CompanyName?.toLowerCase().includes(name))
  }

  return reviews.filter((r) =>
    roleMatchesTarget(r.Role || "", r.PositionTitle || "", targetRole)
  )
}
