"use client"

import { motion } from "framer-motion"

export function CompassRose({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      aria-hidden
    >
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 240, repeat: Infinity, ease: "linear" }}
        style={{ transformBox: "view-box", transformOrigin: "100px 100px" }}
      >
        <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
        <circle cx="100" cy="100" r="62" stroke="currentColor" strokeWidth="0.5" opacity="0.25" strokeDasharray="2 4" />
        {Array.from({ length: 72 }).map((_, i) => (
          <line
            key={i}
            x1="100"
            y1="6"
            x2="100"
            y2={i % 9 === 0 ? "18" : "12"}
            stroke="currentColor"
            strokeWidth="0.6"
            opacity={i % 9 === 0 ? "0.7" : "0.35"}
            transform={`rotate(${i * 5} 100 100)`}
          />
        ))}
      </motion.g>
      {/* Star points */}
      <motion.g
        animate={{ rotate: -360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
        style={{ transformBox: "view-box", transformOrigin: "100px 100px" }}
      >
        {[0, 90, 180, 270].map((deg) => (
          <polygon
            key={deg}
            points="100,18 108,100 100,182 92,100"
            fill="currentColor"
            opacity="0.18"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
        {[45, 135, 225, 315].map((deg) => (
          <polygon
            key={deg}
            points="100,40 105,100 100,160 95,100"
            fill="currentColor"
            opacity="0.1"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
      </motion.g>
      <circle cx="100" cy="100" r="3" fill="currentColor" />
    </svg>
  )
}
