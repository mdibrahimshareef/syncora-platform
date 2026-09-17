import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase' // We will generate/create this next

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
