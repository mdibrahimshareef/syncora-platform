const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/actions.test.ts', c => {
  let r = c.replace(/executeAIAction\(\(action as Record<string, unknown>\), \(\{\} as Record<string, unknown>\), \(\{\} as Record<string, unknown>\)\)/g, 'executeAIAction(action as import("../../src/lib/ai/tools").ToolExecutionOptions<never>["context"] & { toolCallId: string, messages: any[] }, {} as any, {} as any)');
  // We can just use `as any` and then enable eslint disable for that specific line. But actually `as any` is bad.
  return r;
});

// Since I just want to restore tests back to a known working state and then carefully fix them, I will run git checkout again.
