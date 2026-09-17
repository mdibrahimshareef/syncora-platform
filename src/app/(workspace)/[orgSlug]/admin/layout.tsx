import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const supabase = await createClient()

  // 1. Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // 2. Fetch the organization to get its ID
  const { data: orgData } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (!orgData) {
    redirect('/')
  }

  // 3. Verify the user is an admin or owner of THIS organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgData.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
    // 4. Server-side redirect if not authorized
    redirect(`/${orgSlug}`)
  }

  return <>{children}</>
}
