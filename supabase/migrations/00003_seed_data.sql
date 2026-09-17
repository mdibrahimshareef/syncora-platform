-- Example Seed Data Migration (Optional for local development)
-- Run this AFTER creating a user through Supabase Auth, 
-- replacing 'YOUR_AUTH_UUID_HERE' with your actual user id to seed data properly.

-- DO NOT RUN AUTOMATICALLY ON PRODUCTION

/*
INSERT INTO public.workspaces (id, name, slug, description, created_by)
VALUES ('w1000000-0000-0000-0000-000000000000', 'Example Workspace', 'example-workspace', 'A demo workspace', 'YOUR_AUTH_UUID_HERE');

INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES ('w1000000-0000-0000-0000-000000000000', 'YOUR_AUTH_UUID_HERE', 'owner');

INSERT INTO public.projects (id, workspace_id, name, slug, description, icon, color, status, created_by)
VALUES ('p1000000-0000-0000-0000-000000000000', 'w1000000-0000-0000-0000-000000000000', 'Website Redesign', 'website-redesign', 'Redesigning the marketing site', 'globe', 'bg-blue-500', 'Active', 'YOUR_AUTH_UUID_HERE');

INSERT INTO public.tasks (id, project_id, title, description, status, priority, position, created_by)
VALUES ('t1000000-0000-0000-0000-000000000000', 'p1000000-0000-0000-0000-000000000000', 'Setup Next.js', 'Initialize the repo', 'Done', 'High', 0, 'YOUR_AUTH_UUID_HERE');
*/
