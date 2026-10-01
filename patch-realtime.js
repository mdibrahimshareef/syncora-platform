
const fs = require('fs');
let content = fs.readFileSync('src/stores/data-store.ts', 'utf8');

const matchers = [
  'applyRealtimeProjectInsert: (payload) => {\n    set((state) => {',
  'applyRealtimeProjectUpdate: (payload) => {\n    set((state) => {',
  'applyRealtimeProjectDelete: (payload) => {\n    set((state) => {',
  'applyRealtimeTaskUpdate: (payload) => {\n    set((state) => {',
  'applyRealtimeTaskInsert: (payload) => {\n    set((state) => {',
  'applyRealtimeTaskDelete: (payload) => {\n    set((state) => {',
  'applyRealtimeMilestoneInsert: (payload) => {\n    set((state) => {',
  'applyRealtimeMilestoneUpdate: (payload) => {\n    set((state) => {',
  'applyRealtimeMilestoneDelete: (payload) => {\n    set((state) => {',
];

matchers.forEach(matcher => {
  content = content.replace(matcher, matcher + '\n      if (payload.workspace_id && payload.workspace_id !== state.activeWorkspaceId) return state;');
});

fs.writeFileSync('src/stores/data-store.ts', content);
console.log('Realtime patched');

