import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixRls() {
  // Let's check if we can execute SQL via an RPC or query or pg
  // Let's check what RPCs exist or how migrations are applied
  console.log("Checking if exec_sql RPC exists...")
  const { data, error } = await admin.rpc('exec_sql', { sql: 'SELECT 1;' })
  console.log("exec_sql result:", data, error)
}

fixRls().catch(console.error)
