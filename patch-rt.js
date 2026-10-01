
const fs = require('fs');
let content = fs.readFileSync('src/stores/data-store.ts', 'utf8');

const regexes = [
  /applyRealtimeProjectInsert:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\{/,
  /applyRealtimeProjectUpdate:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\{/,
  /applyRealtimeProjectDelete:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\(\{/,
  /applyRealtimeTaskUpdate:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\{/,
  /applyRealtimeTaskInsert:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\{/,
  /applyRealtimeTaskDelete:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\(\{/,
  /applyRealtimeMilestoneInsert:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\{/,
  /applyRealtimeMilestoneUpdate:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\{/,
  /applyRealtimeMilestoneDelete:\s*\(payload\)\s*=>\s*\{\s*set\(\(state\)\s*=>\s*\(\{/
];

regexes.forEach((r, i) => {
  const isImplicitReturn = i === 2 || i === 5 || i === 8;
  content = content.replace(r, (match) => {
    if (isImplicitReturn) {
      // Replace implicit return with explicit block
      return match.replace('({', '{ if (payload.workspace_id && payload.workspace_id !== state.activeWorkspaceId) return state; return {');
    } else {
      return match + ' if (payload.workspace_id && payload.workspace_id !== state.activeWorkspaceId) return state; ';
    }
  });
});

fs.writeFileSync('src/stores/data-store.ts', content);
console.log('patched');

