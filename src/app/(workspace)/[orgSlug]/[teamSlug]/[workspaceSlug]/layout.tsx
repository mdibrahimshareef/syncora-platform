import { WorkspaceContextInitializer } from "@/components/providers/WorkspaceContextInitializer"

export default function WorkspaceSlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <WorkspaceContextInitializer />
      {children}
    </>
  )
}
