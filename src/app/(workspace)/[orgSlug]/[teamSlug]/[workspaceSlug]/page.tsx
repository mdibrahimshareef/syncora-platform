import { DashboardClientWrapper } from "@/components/dashboard/DashboardClientWrapper"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id || '')
    .single()

  const firstName = profile?.full_name?.split(' ')[0] || 'User'

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Good morning, {firstName}</h2>
        <p className="text-muted-foreground">
          Here's what is happening across your workspace.
        </p>
      </div>
      
      <DashboardClientWrapper />
    </div>
  )
}
