const fs = require('fs');
function fixFile(path, fixer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = fixer(content);
    fs.writeFileSync(path, content);
  }
}
fixFile('tests/ai/actions.test.ts', c => c.replace(/as any/g, '').replace(/as unknown/g, '').replace(/result: any/g, 'result: Record<string, unknown>'));
fixFile('tests/ai/phase3.test.ts', c => {
  let r = c.replace(/as any as SupabaseClient/g, '');
  r = r.replace(/as any/g, '');
  r = r.replace(/as unknown/g, '');
  r = r.replace(/let mockSupabase: unknown/g, 'let mockSupabase: import(\'../mock-supabase\').MockSupabaseClient;');
  r = r.replace(/let mockVerifyWorkspaceAccess: unknown/g, 'let mockVerifyWorkspaceAccess: import(\'vitest\').Mock;');
  r = r.replace(/_table/g, 'table');
  return r;
});
fixFile('tests/ai/r4.3/cancel.test.ts', c => c.replace(/as any/g, ''));
fixFile('tests/ai/r4.3/resume.test.ts', c => c.replace(/as any/g, ''));
fixFile('tests/ai/r4.3/retry.test.ts', c => c.replace(/as any/g, ''));
fixFile('tests/ai/r4.4/governance.test.ts', c => c.replace(/as any/g, ''));
fixFile('tests/ai/r4.3/security-red-team.test.ts', c => c.replace(/as any/g, '').replace(/\{\s*message:\s*'Not found'\s*\}/g, 'new Error(\"Not found\")'));
fixFile('tests/ai/r4/workflow-executor.test.ts', c => c.replace(/as any/g, '').replace(/_plan/g, 'plan'));
fixFile('tests/ai/r4/workflow-schema.test.ts', c => c.replace(/_plan/g, 'plan'));
fixFile('tests/ai/r4/workflow-verification.test.ts', c => c.replace(/as any/g, ''));
fixFile('tests/ai/workspace-isolation.test.ts', c => {
  let r = c.replace(/as any/g, 'as unknown as import(\'../../../src/lib/ai/tools\').ToolExecutionOptions<never>');
  r = r.replace(/mockChain: any/g, 'mockChain: import(\'../mock-supabase\').ChainableMock');
  return r;
});
fixFile('tests/ai/tools.test.ts', c => c.replace(/as any/g, 'as unknown as import(\'../../../src/lib/ai/tools\').ToolExecutionOptions<never>'));
