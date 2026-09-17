const fs = require('fs');
const path = require('path');

const filesToFix = [
  "src/app/(workspace)/[orgSlug]/initiatives/page.tsx",
  "src/app/(workspace)/[orgSlug]/portfolios/page.tsx",
  "src/app/(workspace)/[orgSlug]/[teamSlug]/[workspaceSlug]/requests/page.tsx",
  "src/app/(workspace)/[orgSlug]/[teamSlug]/[workspaceSlug]/audit/page.tsx",
  "src/app/(workspace)/[orgSlug]/[teamSlug]/[workspaceSlug]/reports/page.tsx",
  "src/app/(workspace)/[orgSlug]/[teamSlug]/[workspaceSlug]/my-tasks/page.tsx",
  "src/app/(workspace)/[orgSlug]/[teamSlug]/[workspaceSlug]/approvals/page.tsx",
  "src/app/(workspace)/[orgSlug]/[teamSlug]/[workspaceSlug]/customers/page.tsx",
  "src/app/(workspace)/[orgSlug]/goals/page.tsx"
];

for (const file of filesToFix) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/import\s+{\s*createServerClient\s*}\s+from\s+["']@\/lib\/supabase\/server["']/g, 'import { createClient } from "@/lib/supabase/server"');
    content = content.replace(/const\s+supabase\s*=\s*createServerClient\(\)/g, 'const supabase = await createClient()');
    
    // Some might not have await because I missed it.
    // Let's replace 'createClient()' with 'await createClient()' if it's not awaited
    content = content.replace(/(?<!await\s)createClient\(\)/g, 'await createClient()');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
}
