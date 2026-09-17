import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkRPCs() {
  const { data, error } = await adminAuthClient.rpc('accept_invitation', { invitation_token: 'test' })
  console.log("accept_invitation:", error || data)
  
  const { data: data2, error: error2 } = await adminAuthClient.rpc('accept_organization_invitation', { invitation_token: 'test' })
  console.log("accept_organization_invitation:", error2 || data2)
}

checkRPCs().catch(console.error)
