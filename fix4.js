const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/actions.test.ts', c => {
  let r = c.replace(/import\(\\"..\/..\/src\/lib\/ai\/tools\\"\)/g, "import('../../src/lib/ai/tools')");
  r = r.replace(/result: import\(\\"..\/..\/src\/lib\/ai\/action-executor\\"\).ActionExecutionResult/g, "result: import('../../src/lib/ai/action-executor').ActionExecutionResult");
  r = r.replace(/result\.status/g, "(result as any).status"); // result might be ActionExecutionResult which is discriminated union
  r = r.replace(/result\.data/g, "(result as any).data");
  r = r.replace(/result\.error/g, "(result as any).error");
  return r;
});

replaceFile('tests/ai/phase3.test.ts', c => c.replace(/import\(\\"..\/mock-supabase\\"\)/g, 'import("./mock-supabase")'));

replaceFile('tests/ai/r4.3/resume.test.ts', c => c.replace(/mockSupabase as any as MockSupabaseClient/g, 'mockSupabase as unknown as import("@supabase/supabase-js").SupabaseClient'));

replaceFile('tests/ai/r4/workflow-verification.test.ts', c => c.replace(/result\.error/g, '(result as any).error'));

replaceFile('tests/ai/workspace-isolation.test.ts', c => {
  let r = c.replace(/import\(\\"..\/..\/src\/lib\/ai\/tools\\"\)/g, 'import("../../src/lib/ai/tools")');
  r = r.replace(/mockChain: import\(\\"..\/mock-supabase\\"\).ChainableMock/g, 'mockChain: import("./mock-supabase").ChainableMock');
  r = r.replace(/mockChain\.select/g, '(mockChain as any).select');
  return r;
});

replaceFile('tests/ai/tools.test.ts', c => c.replace(/import\(\\"..\/..\/src\/lib\/ai\/tools\\"\)/g, 'import("../../src/lib/ai/tools")'));
