import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(supabaseUrl, supabaseServiceKey)

async function testUser(email: string) {
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email
  })

  const token_hash = linkData?.properties?.hashed_token
  const cookieMap = new Map<string, string>()

  const serverClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => cookieMap.set(name, value))
      }
    }
  })

  const { data: authData } = await serverClient.auth.verifyOtp({
    token_hash: token_hash!,
    type: 'email'
  })

  const user = authData.user!

  const [
    rProfile,
    rWM,
    rOrgs,
    rTeams
  ] = await Promise.all([
    serverClient.from('profiles').select('*').eq('id', user.id).single(),
    serverClient.from('workspace_members').select('workspace_id, role, workspaces(id, name, slug, organization_id, team_id, organizations(id, name, slug), teams(id, name, slug))').eq('user_id', user.id),
    serverClient.from('organization_members').select('org_id, role, organizations(id, name, slug, logo_url, owner_id)').eq('user_id', user.id),
    serverClient.from('team_members').select('team_id, role, teams(id, org_id, name, slug, description, icon)').eq('user_id', user.id)
  ])

  console.log(`=== User ${email} ===`)
  console.log("Profile error:", rProfile.error)
  console.log("WM error:", rWM.error)
  console.log("Orgs error:", rOrgs.error)
  console.log("Teams error:", rTeams.error)
}

async function run() {
  await testUser('druvhrathe@gmail.com')
}

run().catch(console.error)
