const fs = require('fs');
const path = require('path');

const files = [
  "src/components/settings/OrganizationMembers.tsx",
  "src/components/settings/WorkspaceMembers.tsx",
  "src/components/tasks/TaskListView.tsx"
];

for (const f of files) {
  const p = path.join(__dirname, '..', f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    // Replace DropdownMenuTrigger asChild with just DropdownMenuTrigger
    content = content.replace(/<DropdownMenuTrigger asChild>/g, '<DropdownMenuTrigger>');
    fs.writeFileSync(p, content);
  }
}
