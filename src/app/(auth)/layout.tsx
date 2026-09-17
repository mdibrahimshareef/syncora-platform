import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication - SYNCORA",
  description: "Login or create an account for SYNCORA.",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 md:p-8">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
