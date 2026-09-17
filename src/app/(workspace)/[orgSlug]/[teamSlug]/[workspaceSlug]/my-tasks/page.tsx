import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { MyWorkClientWrapper } from "@/components/dashboard/MyWorkClientWrapper"

export default async function MyWorkPage({ params }: { params: { orgSlug: string, teamSlug: string, workspaceSlug: string } }) {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null



  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <MyWorkClientWrapper />
    </div>
  )
}

