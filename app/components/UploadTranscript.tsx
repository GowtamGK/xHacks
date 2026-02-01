"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { ParsedTranscript } from "@/lib/types"

type UploadTranscriptProps = {
  onParsed: (parsed: ParsedTranscript) => void
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-emerald-400 flex-shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export function UploadTranscript({ onParsed }: UploadTranscriptProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showSuccess) return
    const t = setTimeout(() => setShowSuccess(false), 2500)
    return () => clearTimeout(t)
  }, [showSuccess])

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const res = await fetch("/api/parse-transcript", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to parse transcript")
        return
      }
      onParsed({
        student_major: data.student_major ?? "",
        completed_courses: Array.isArray(data.completed_courses) ? data.completed_courses : [],
        total_credits_completed: typeof data.total_credits_completed === "number" ? data.total_credits_completed : 0,
      })
      setShowSuccess(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDrag(true)
  }

  function onDragLeave() {
    setDrag(false)
  }

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${drag ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]" : "border-slate-600 bg-slate-800/30 hover:border-slate-500"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ""
          }}
        />
        <p className="text-slate-300 mb-2 font-medium">
          Upload your SFU transcript PDF
        </p>
        <p className="text-sm text-slate-500 mb-4">
          We'll extract your major and completed courses (no AI until after extraction).
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <Spinner />
              Parsing…
            </>
          ) : (
            "Choose PDF"
          )}
        </button>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2 border border-red-900/30"
        >
          {error}
        </motion.p>
      )}

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/95 border border-slate-600 shadow-lg shadow-black/30 text-slate-100">
              <svg
                className="h-5 w-5 text-emerald-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Transcript parsed successfully</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
