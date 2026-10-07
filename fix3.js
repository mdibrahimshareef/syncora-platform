const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/actions.test.ts', c => {
  let r = c.replace(/import\(\\"..\/..\/..\/src\/lib\/ai\/tools\\"\)/g, "import(\\'../../src/lib/ai/tools\\')");
  r = r.replace(/result: any/g, 'result: import("../../src/lib/ai/action-executor").ActionExecutionResult');
  r = r.replace(/\(result as any\)/g, 'result'); // wait, if it's ActionExecutionResult, it has .error if status === 'failed'
  return r;
});

replaceFile('tests/ai/phase3.test.ts', c => c.replace(/import\(\\"..\/mock-supabase\\"\)/g, 'import("./mock-supabase")'));

replaceFile('tests/ai/r4.3/resume.test.ts', c => c.replace(/as any as MockSupabaseClient/g, 'as unknown as import("../mock-supabase").MockSupabaseClient'));

replaceFile('tests/ai/r4/workflow-verification.test.ts', c => c.replace(/\(result as any\)\.error/g, 'result.error')); // Ah, result doesn't have error if it's completed? Actually result can be failed.

replaceFile('tests/ai/workspace-isolation.test.ts', c => {
  let r = c.replace(/import\(\\"..\/..\/..\/src\/lib\/ai\/tools\\"\)/g, 'import("../../src/lib/ai/tools")');
  r = r.replace(/mockChain: import\(\\"..\/mock-supabase\\"\).ChainableMock/g, 'mockChain: import("../mock-supabase").ChainableMock');
  return r;
});

replaceFile('tests/ai/tools.test.ts', c => c.replace(/import\(\\"..\/..\/..\/src\/lib\/ai\/tools\\"\)/g, 'import("../../src/lib/ai/tools")'));
