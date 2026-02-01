"use client"

/**
 * Animated path background - road surface with dashed center line and solid edges.
 * Highway-style aesthetic, visible and professional.
 */
export function AnimatedPathBackground() {
  const roadPath = "M 0 280 Q 250 220 600 400 T 1200 520"

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
      aria-hidden
    >
      <svg
        className="absolute w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
      >
        <defs>
          <linearGradient id="roadLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.4" />
            <stop offset="20%" stopColor="#5eead4" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="80%" stopColor="#5eead4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#5eead4" stopOpacity="0.4" />
          </linearGradient>
          <filter id="roadGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Road surface - dark asphalt band */}
        <path
          d={roadPath}
          fill="none"
          stroke="#1e293b"
          strokeWidth="70"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />

        {/* 2. Solid edge lines - lane boundaries */}
        <path
          d={roadPath}
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.35"
          transform="translate(0, -28)"
        />
        <path
          d={roadPath}
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.35"
          transform="translate(0, 28)"
        />

        {/* 3. Center dashed line - highway-style markings */}
        <path
          d={roadPath}
          fill="none"
          stroke="url(#roadLineGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="40 80"
          className="animate-path-draw"
          filter="url(#roadGlow)"
          style={{
            opacity: 0.95,
            animationDuration: "8s",
          }}
        />
      </svg>
    </div>
  )
}
