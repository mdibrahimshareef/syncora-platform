const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/actions.test.ts', c => c.replace(/const result = \(await \(tools\.create_task as any\)\.execute\(\{ title: 'Fix login bug' \}, \{\} as any\)\) as any/g, "const createTaskTool = tools.create_task as { execute: (args: Record<string, unknown>, options: Record<string, unknown>) => Promise<Record<string, unknown>> };\n    const result = await createTaskTool.execute({ title: 'Fix login bug' }, {});"));

replaceFile('tests/ai/tools.test.ts', c => {
  let r = c.replace(/const result = \(await \(tools\.create_task as any\)\.execute\(\{ title: 'New task' \}, \{\} as any\)\) as any/g, "const createTaskTool = tools.create_task as { execute: (args: Record<string, unknown>, options: Record<string, unknown>) => Promise<Record<string, unknown>> };\n    const result = await createTaskTool.execute({ title: 'New task' }, {});");
  r = r.replace(/expect\(\(tools\.search_tasks as any\)\.parameters\)/g, "expect((tools.search_tasks as { parameters: unknown }).parameters)");
  return r;
});

replaceFile('tests/ai/workspace-isolation.test.ts', c => {
  let r = c.replace(/mockChain: any/g, "mockChain: import('../mock-supabase').ChainableMock");
  r = r.replace(/await \(tools\.search_tasks as any\)\.execute\(\{ query: 'test' \}, \{\} as any\)/g, "const searchTaskTool = tools.search_tasks as { execute: (args: Record<string, unknown>, options: Record<string, unknown>) => Promise<Record<string, unknown>> };\n    await searchTaskTool.execute({ query: 'test' }, {});");
  return r;
});

replaceFile('tests/ai/r4.3/resume.test.ts', c => c.replace(/mockSupabase as any/g, 'mockSupabase as unknown as import("@supabase/supabase-js").SupabaseClient').replace(/chain: any/g, 'chain: import("../mock-supabase").ChainableMock'));

replaceFile('tests/ai/r4/workflow-verification.test.ts', c => c.replace(/\(result as any\)\.error/g, '(result as { error: string }).error'));
