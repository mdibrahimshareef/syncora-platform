"use client"

import * as React from "react"
import { Eye, EyeOff, Check, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrengthIndicator?: boolean
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrengthIndicator = false, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const passwordValue = (value as string) || ""

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    // Requirements logic
    const reqs = [
      { id: 'length', text: 'At least 8 characters', met: passwordValue.length >= 8 },
      { id: 'number', text: 'Contains a number', met: /\d/.test(passwordValue) },
      { id: 'upper', text: 'Contains uppercase letter', met: /[A-Z]/.test(passwordValue) },
      { id: 'special', text: 'Contains special character', met: /[^A-Za-z0-9]/.test(passwordValue) },
    ]

    const metCount = reqs.filter(r => r.met).length
    
    // Strength logic
    let strengthText = ""
    let strengthColor = "bg-muted"
    
    if (passwordValue.length > 0) {
      if (metCount <= 1) {
        strengthText = "Weak"
        strengthColor = "bg-destructive"
      } else if (metCount <= 3) {
        strengthText = "Medium"
        strengthColor = "bg-yellow-500"
      } else {
        strengthText = "Strong"
        strengthColor = "bg-emerald-500"
      }
    }

    return (
      <div className="w-full space-y-3">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
            ref={ref}
            value={value}
            onChange={onChange}
            {...props}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
            tabIndex={-1} // Prevent tabbing to this button to keep form flow smooth
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            <span className="sr-only">
              {showPassword ? "Hide password" : "Show password"}
            </span>
          </button>
        </div>

        {showStrengthIndicator && (
          <div className="space-y-3">
            {/* Strength Bar */}
            <div className="space-y-1.5">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full transition-all duration-300 ease-in-out", strengthColor)}
                  style={{
                    width: passwordValue.length === 0 ? "0%" : `${(metCount / reqs.length) * 100}%`
                  }}
                />
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-muted-foreground">
                  {strengthText}
                </span>
              </div>
            </div>

            {/* Requirements Checklist */}
            <ul className="space-y-1.5">
              {reqs.map((req) => (
                <li key={req.id} className="flex items-center gap-2 text-xs">
                  {req.met ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <X className="size-3.5 text-muted-foreground/50" />
                  )}
                  <span
                    className={cn(
                      "transition-colors",
                      req.met ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    )}
                  >
                    {req.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"
