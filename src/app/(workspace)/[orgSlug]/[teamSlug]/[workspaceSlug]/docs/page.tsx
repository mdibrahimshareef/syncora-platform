import { DocsClientWrapper } from "@/components/docs/DocsClientWrapper"

export default function DocsPage({ params }: { params: { orgSlug: string, teamSlug: string, workspaceSlug: string } }) {
  return <DocsClientWrapper orgSlug={params.orgSlug} teamSlug={params.teamSlug} workspaceSlug={params.workspaceSlug} />
}

