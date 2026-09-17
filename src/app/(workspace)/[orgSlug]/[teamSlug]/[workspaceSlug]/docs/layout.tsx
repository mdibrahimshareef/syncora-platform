import { ReactNode } from "react"
import { DocumentSidebar } from "@/components/documents/DocumentSidebar"
import * as React from "react"

export default function DocsLayout({ children, params }: { children: ReactNode, params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = React.use(params)
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-64 border-r border-border shrink-0 bg-muted/20 flex flex-col hidden md:flex">
        <DocumentSidebar workspaceSlug={workspaceSlug} />
      </div>
      <div className="flex-1 overflow-auto bg-background">
        {children}
      </div>
    </div>
  )
}
