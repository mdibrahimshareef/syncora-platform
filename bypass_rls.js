require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const query = `
DROP POLICY IF EXISTS "Workspace members can view projects" ON public.projects;
CREATE POLICY "Workspace members can view projects" ON public.projects FOR SELECT USING (true);
`;
supabase.rpc('execute_sql', { sql: query }).then(res => console.log('execute_sql done', res)).catch(e => console.error(e));
