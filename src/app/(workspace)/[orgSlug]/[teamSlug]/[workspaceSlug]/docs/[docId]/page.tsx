import { DocEditorClient } from "@/components/docs/DocEditorClient"

export default function DocEditorPage({ params }: { params: { orgSlug: string, teamSlug: string, workspaceSlug: string, docId: string } }) {
  const backUrl = `/${params.orgSlug}/${params.teamSlug}/${params.workspaceSlug}/docs`
  return <DocEditorClient docId={params.docId} backUrl={backUrl} />
}
