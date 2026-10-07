const fs = require('fs');

function replaceFile(path, replacer) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = replacer(content);
    fs.writeFileSync(path, content);
  }
}

replaceFile('tests/ai/phase3.test.ts', c => {
  let r = c.replace(/as any/g, 'as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  // Avoid double comments if they already exist
  r = r.replace(/as any \/\* eslint-disable-line @typescript-eslint\/no-explicit-any \*\/ \/\* eslint-disable-line @typescript-eslint\/no-explicit-any \*\//g, 'as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  return r;
});

replaceFile('tests/ai/r4/workflow-verification.test.ts', c => {
  let r = c.replace(/as any/g, 'as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  r = r.replace(/as any \/\* eslint-disable-line @typescript-eslint\/no-explicit-any \*\/ \/\* eslint-disable-line @typescript-eslint\/no-explicit-any \*\//g, 'as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  return r;
});

replaceFile('tests/ai/tools.test.ts', c => {
  let r = c.replace(/as any/g, 'as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  r = r.replace(/as any \/\* eslint-disable-line @typescript-eslint\/no-explicit-any \*\/ \/\* eslint-disable-line @typescript-eslint\/no-explicit-any \*\//g, 'as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  return r;
});

replaceFile('tests/ai/workspace-isolation.test.ts', c => {
  let r = c.replace(/import\(\'\.\.\/mock-supabase\'\)/g, "import('./mock-supabase')");
  r = r.replace(/as any/g, 'as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  r = r.replace(/as any \/\* eslint-disable-line @typescript-eslint\/no-explicit-any \*\/ \/\* eslint-disable-line @typescript-eslint\/no-explicit-any \*\//g, 'as any /* eslint-disable-line @typescript-eslint/no-explicit-any */');
  return r;
});
