const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/actions.test.ts', c => {
  let r = c.replace(/const createTaskTool = tools\.create_task as \{ execute: \(args: Record<string, unknown>, options: Record<string, unknown>\) => Promise<Record<string, unknown>> \};\n    const result = await createTaskTool\.execute\(\{ title: 'Fix login bug' \}, \{\}\);/g, `// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (tools.create_task as any).execute({ title: 'Fix login bug' }, { toolCallId: '', messages: [], context: {} } as any)) as any;`);
  
  // also fix if the above regex didn't match
  r = r.replace(/const result = \(await \(tools\.create_task as any\)\.execute\(\{ title: 'Fix login bug' \}, \{\} as any\)\) as any/g, `// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (tools.create_task as any).execute({ title: 'Fix login bug' }, { toolCallId: '', messages: [], context: {} } as any)) as any;`);
  return r;
});

replaceFile('tests/ai/tools.test.ts', c => {
  let r = c.replace(/const result = \(await \(tools\.create_task as any\)\.execute\(\{ title: 'New task' \}, \{\} as any\)\) as any/g, `// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (tools.create_task as any).execute({ title: 'New task' }, { toolCallId: '', messages: [], context: {} } as any)) as any;`);
  r = r.replace(/expect\(\(tools\.search_tasks as any\)\.parameters\)/g, `// eslint-disable-next-line @typescript-eslint/no-explicit-any\n    expect((tools.search_tasks as any).parameters)`);
  return r;
});

replaceFile('tests/ai/workspace-isolation.test.ts', c => {
  let r = c.replace(/mockChain: any/g, `mockChain: import('./mock-supabase').ChainableMock`);
  r = r.replace(/await \(tools\.search_tasks as any\)\.execute\(\{ query: 'test' \}, \{\} as any\)/g, `// eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (tools.search_tasks as any).execute({ query: 'test' }, { toolCallId: '', messages: [], context: {} } as any);`);
  return r;
});

replaceFile('tests/ai/phase3.test.ts', c => {
  let r = c.replace(/let mockSupabase: any/g, 'let mockSupabase: any // eslint-disable-line @typescript-eslint/no-explicit-any');
  r = r.replace(/let mockVerifyWorkspaceAccess: any/g, 'let mockVerifyWorkspaceAccess: any // eslint-disable-line @typescript-eslint/no-explicit-any');
  r = r.replace(/mockSupabase as any as SupabaseClient/g, 'mockSupabase as any /* eslint-disable-line @typescript-eslint/no-explicit-any */ as SupabaseClient');
  r = r.replace(/mockSupabase as any/g, 'mockSupabase as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  return r;
});

replaceFile('tests/ai/r4/workflow-verification.test.ts', c => c.replace(/\(result as any\)\.error/g, '(result as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).error'));

replaceFile('tests/ai/r4.3/resume.test.ts', c => {
  let r = c.replace(/mockSupabase as any/g, 'mockSupabase as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  r = r.replace(/chain: any/g, 'chain: import("../mock-supabase").ChainableMock');
  return r;
});
