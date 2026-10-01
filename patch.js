
const fs = require('fs');
let content = fs.readFileSync('src/stores/data-store.ts', 'utf8');

const replacements = [
  [/const projects = await projectApi\.getProjects\(supabase, activeWorkspaceId\)\s*set\(\{ projects/g, 'const projects = await projectApi.getProjects(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ projects'],
  [/const workspaceTasks = await taskApi\.getWorkspaceTasks\(supabase, activeWorkspaceId\)\s*set\(\{ workspaceTasks/g, 'const workspaceTasks = await taskApi.getWorkspaceTasks(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ workspaceTasks'],
  [/const searchResults = await searchApi\.performGlobalSearch\(supabase, activeWorkspaceId, query\)\s*set\(\{ searchResults/g, 'const searchResults = await searchApi.performGlobalSearch(supabase, activeWorkspaceId, query)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ searchResults'],
  [/const activity = await activityApi\.getRecentActivity\(supabase, activeWorkspaceId\)\s*set\(\{ activity \}\)/g, 'const activity = await activityApi.getRecentActivity(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ activity })'],
  [/const data = await integrationsApi\.getIntegrations\(supabase, activeWorkspaceId\)\s*set\(\{ integrations/g, 'const data = await integrationsApi.getIntegrations(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ integrations'],
  [/const data = await integrationsApi\.getWebhooks\(supabase, activeWorkspaceId\)\s*set\(\{ webhookEndpoints/g, 'const data = await integrationsApi.getWebhooks(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ webhookEndpoints'],
  [/const docs = await documentsApi\.getDocuments\(supabase, activeWorkspaceId\)\s*set\(\{ documents/g, 'const docs = await documentsApi.getDocuments(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ documents'],
  [/const reqs = await requestsApi\.getRequests\(supabase, activeWorkspaceId\)\s*set\(\{ requests/g, 'const reqs = await requestsApi.getRequests(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ requests'],
  [/const forms = await requestsApi\.getRequestForms\(supabase, activeWorkspaceId\)\s*set\(\{ requestForms/g, 'const forms = await requestsApi.getRequestForms(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ requestForms'],
  [/const data = await filtersApi\.getSavedFilters\(supabase, activeWorkspaceId\)\s*set\(\{ savedFilters/g, 'const data = await filtersApi.getSavedFilters(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ savedFilters'],
  [/const customers = await customersApi\.getCustomers\(supabase, activeWorkspaceId\)\s*set\(\{ customers \}\)/g, 'const customers = await customersApi.getCustomers(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ customers })'],
  [/const customerRequests = await customersApi\.getCustomerRequests\(supabase, activeWorkspaceId\)\s*set\(\{ customerRequests \}\)/g, 'const customerRequests = await customersApi.getCustomerRequests(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ customerRequests })'],
  [/const automations = await automationsApi\.getAutomations\(supabase, activeWorkspaceId\)\s*set\(\{ automations \}\)/g, 'const automations = await automationsApi.getAutomations(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ automations })'],
  [/const automationRuns = await automationsApi\.getAutomationRuns\(supabase, activeWorkspaceId\)\s*set\(\{ automationRuns \}\)/g, 'const automationRuns = await automationsApi.getAutomationRuns(supabase, activeWorkspaceId)\n      if (get().activeWorkspaceId !== activeWorkspaceId) return;\n      set({ automationRuns })'],
  [/const members = data\.map\(\(d: any\) => \(\{[\s\S]*?\}\)\)\s*set\(\{ workspaceMembers: members \}\)/g, (match) => match.replace('set({ workspaceMembers: members })', 'if (get().activeWorkspaceId !== activeWorkspaceId) return;\n        set({ workspaceMembers: members })')],
];

replacements.forEach(([regex, repl]) => {
  content = content.replace(regex, repl);
});

fs.writeFileSync('src/stores/data-store.ts', content);
console.log('Patched');

