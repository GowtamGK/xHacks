/**
 * Fetch all companies and reviews from InternDB API and save to data/interndb.json
 * Run: npx tsx scripts/fetch-internships.ts
 */

import * as fs from "fs"
import * as path from "path"

const INTERNDB_BASE = "https://api.interndb.io/api/v1"
const DELAY_MS = 300 // avoid hammering the API

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  return res.json() as Promise<T>
}

type InternDBCompany = {
  companyId: string
  name: string
  logo: string
  reviewCount: number
  avgCADSalary: string | number
  avgUSDSalary: string | number
}

type InternDBReview = {
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

type InterndbData = {
  fetchedAt: string
  companies: InternDBCompany[]
  reviews: InternDBReview[]
}

async function main() {
  console.log("Fetching companies from InternDB...")
  const companies = (await fetchJson<InternDBCompany[]>(
    `${INTERNDB_BASE}/companies?q=&sortBy=mostReviews`
  )) as InternDBCompany[]

  const withReviews = companies.filter((c) => (c.reviewCount ?? 0) > 0)
  console.log(`Found ${companies.length} companies, ${withReviews.length} with reviews`)

  const allReviews: InternDBReview[] = []
  for (let i = 0; i < withReviews.length; i++) {
    const c = withReviews[i]
    try {
      await sleep(DELAY_MS)
      const reviews = (await fetchJson<InternDBReview[]>(
        `${INTERNDB_BASE}/reviews/company/${c.companyId}?sortBy=recentlyAdded`
      )) as InternDBReview[]
      allReviews.push(...reviews)
      console.log(`  [${i + 1}/${withReviews.length}] ${c.name}: ${reviews.length} reviews`)
    } catch (err) {
      console.warn(`  [${i + 1}/${withReviews.length}] ${c.name}: FAILED`, err)
    }
  }

  const data: InterndbData = {
    fetchedAt: new Date().toISOString(),
    companies: withReviews,
    reviews: allReviews,
  }

  const dataDir = path.join(process.cwd(), "data")
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  const outPath = path.join(dataDir, "interndb.json")
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8")

  console.log(`\nWrote ${allReviews.length} reviews from ${withReviews.length} companies to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
