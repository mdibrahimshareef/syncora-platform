const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/actions.test.ts', c => c.replace(/\{\}/g, '{ toolCallId: "", messages: [], context: {} } as import("../../../src/lib/ai/tools").ToolExecutionOptions<never>').replace(/result: Record<string, unknown>/g, 'result: any'));

replaceFile('tests/ai/phase3.test.ts', c => {
  let r = c.replace(/projects: createChainable/g, 'projects: () => createChainable');
  r = r.replace(/workspace_members: createChainable/g, 'workspace_members: () => createChainable');
  r = r.replace(/tasks: createChainable/g, 'tasks: () => createChainable');
  r = r.replace(/activities: createChainable/g, 'activities: () => createChainable');
  return r;
});

replaceFile('tests/ai/r4.3/resume.test.ts', c => {
  let r = c.replace(/chain: unknown/g, 'chain: any');
  r = r.replace(/mockSupabase as MockSupabaseClient/g, 'mockSupabase as any as MockSupabaseClient');
  return r;
});

replaceFile('tests/ai/r4/workflow-verification.test.ts', c => {
  let r = c.replace(/projects: createChainable/g, 'projects: () => createChainable');
  r = r.replace(/workspace_members: createChainable/g, 'workspace_members: () => createChainable');
  r = r.replace(/tasks: createChainable/g, 'tasks: () => createChainable');
  r = r.replace(/result\.error/g, '(result as any).error');
  return r;
});

replaceFile('tests/ai/tools.test.ts', c => c.replace(/Object is of type 'unknown'/g, ''));
replaceFile('tests/ai/workspace-isolation.test.ts', c => c.replace(/mockChain: any/g, 'mockChain: import("../mock-supabase").ChainableMock'));
