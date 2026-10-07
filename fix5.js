const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/actions.test.ts', c => c.replace(/\.\.\/\.\.\/\.\.\/src\/lib\/ai\/tools/g, '../../src/lib/ai/tools'));
replaceFile('tests/ai/phase3.test.ts', c => c.replace(/\.\.\/mock-supabase/g, './mock-supabase'));
replaceFile('tests/ai/r4.3/resume.test.ts', c => c.replace(/mockSupabase as unknown as import\(\"@supabase\/supabase-js\"\)\.SupabaseClient/g, 'mockSupabase as any'));
replaceFile('tests/ai/r4/workflow-verification.test.ts', c => c.replace(/result\.error/g, '(result as any).error'));
replaceFile('tests/ai/tools.test.ts', c => c.replace(/\.\.\/\.\.\/\.\.\/src\/lib\/ai\/tools/g, '../../src/lib/ai/tools'));
replaceFile('tests/ai/workspace-isolation.test.ts', c => {
  let r = c.replace(/\.\.\/\.\.\/\.\.\/src\/lib\/ai\/tools/g, '../../src/lib/ai/tools');
  r = r.replace(/mockChain\./g, '(mockChain as any).');
  return r;
});
