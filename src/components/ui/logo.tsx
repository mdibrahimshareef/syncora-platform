import * as React from "react"
import { cn } from "@/lib/utils"

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 120 120" 
      fill="none"
      className={cn("w-8 h-8 text-primary", className)}
      {...props}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>
        <mask id="ribbon-cutout">
          <rect width="120" height="120" fill="white" />
          <path 
            d="M 95 35 A 25 25 0 0 0 45 35 C 45 60, 95 50, 95 75 A 25 25 0 0 1 45 75" 
            stroke="black" 
            strokeWidth="24" 
            strokeLinecap="round"
            fill="none"
          />
        </mask>
      </defs>

      {/* Back Ribbon */}
      <path 
        d="M 75 45 A 25 25 0 0 0 25 45 C 25 70, 75 60, 75 85 A 25 25 0 0 1 25 85" 
        stroke="url(#logo-gradient)" 
        strokeWidth="16" 
        strokeLinecap="round" 
        mask="url(#ribbon-cutout)"
      />
      
      {/* Front Ribbon */}
      <path 
        d="M 95 35 A 25 25 0 0 0 45 35 C 45 60, 95 50, 95 75 A 25 25 0 0 1 45 75" 
        stroke="url(#logo-gradient)" 
        strokeWidth="16" 
        strokeLinecap="round"
      />
    </svg>
  )
}
