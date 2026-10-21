export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 dark:bg-[#121212] p-4">
      {children}
    </div>
  )
}
