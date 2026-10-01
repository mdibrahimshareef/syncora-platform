const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const wsId = '68a5acc5-42c2-437c-9a1b-ada0608cb7ac';

async function testRealtime() {
  const channel = supabase.channel('test-realtime2');
  
  channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `workspace_id=eq.${wsId}` }, (payload) => {
    console.log('REALTIME UPDATE RECEIVED:', payload);
  });
  
  channel.subscribe(async (status) => {
    console.log('SUBSCRIPTION STATUS:', status);
    if (status === 'SUBSCRIBED') {
      const { data } = await supabase.from('projects').insert({
        workspace_id: wsId,
        name: 'Test Project 2',
        slug: 'test-slug-2-' + Date.now(),
        status: 'Active'
      }).select().single();
      
      console.log('Updating project...');
      await supabase.from('projects').update({ name: 'Updated name' }).eq('id', data.id);
    }
  });
  
  setTimeout(() => process.exit(0), 10000);
}

testRealtime();
