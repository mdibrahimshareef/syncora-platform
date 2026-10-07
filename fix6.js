const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/actions.test.ts', c => {
  let r = c.replace(/as never/g, 'as Record<string, unknown>');
  return r;
});

replaceFile('tests/ai/r4/workflow-verification.test.ts', c => c.replace(/as never/g, 'as Record<string, unknown>'));

replaceFile('tests/ai/tools.test.ts', c => c.replace(/as never/g, 'as Record<string, unknown>'));

replaceFile('tests/ai/workspace-isolation.test.ts', c => {
  let r = c.replace(/mockChain: any/g, 'mockChain: import("../mock-supabase").ChainableMock');
  r = r.replace(/as never/g, 'as Record<string, unknown>');
  r = r.replace(/as any/g, 'as Record<string, unknown>');
  return r;
});
