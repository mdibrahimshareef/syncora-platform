import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321', // Dummy URL just to see if it's a type/build error, wait I don't have the env vars
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'
)

// We can't actually query without env vars.
