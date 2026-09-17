// Wait, since we are using Supabase service role, we should just make this a SQL script or run it via npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function seedTemplates() {
  const templates = [
    {
      name: 'Software Engineering',
      description: 'Standard software development lifecycle template',
      domain: 'engineering',
      category: 'project',
      is_global: true,
      content: {
        statuses: [
          { name: 'Backlog', color: 'gray', position: 0 },
          { name: 'Todo', color: 'blue', position: 1 },
          { name: 'In Progress', color: 'yellow', position: 2 },
          { name: 'In Review', color: 'purple', position: 3 },
          { name: 'Done', color: 'green', position: 4 }
        ],
        customFields: [
          { name: 'Story Points', type: 'number', options: null },
          { name: 'Component', type: 'select', options: ['Frontend', 'Backend', 'Database', 'Design'] }
        ],
        tasks: [
          { title: 'Setup repository', status: 'Done', priority: 'High', position: 0 },
          { title: 'Write technical spec', status: 'In Progress', priority: 'High', position: 1 },
          { title: 'Implement core features', status: 'Todo', priority: 'Medium', position: 2 },
          { title: 'Write unit tests', status: 'Todo', priority: 'Medium', position: 3 },
          { title: 'Deploy to staging', status: 'Backlog', priority: 'Low', position: 4 }
        ]
      }
    },
    {
      name: 'Marketing Campaign',
      description: 'End-to-end campaign tracking',
      domain: 'marketing',
      category: 'project',
      is_global: true,
      content: {
        statuses: [
          { name: 'Idea', color: 'gray', position: 0 },
          { name: 'Brief', color: 'blue', position: 1 },
          { name: 'Drafting', color: 'yellow', position: 2 },
          { name: 'Review', color: 'purple', position: 3 },
          { name: 'Published', color: 'green', position: 4 }
        ],
        customFields: [
          { name: 'Channel', type: 'select', options: ['Social', 'Email', 'Blog', 'Ad'] },
          { name: 'Budget', type: 'number', options: null }
        ],
        tasks: [
          { title: 'Draft campaign brief', status: 'Done', priority: 'High', position: 0 },
          { title: 'Design creative assets', status: 'Drafting', priority: 'High', position: 1 },
          { title: 'Review copy', status: 'Brief', priority: 'Medium', position: 2 },
          { title: 'Schedule social posts', status: 'Idea', priority: 'Medium', position: 3 }
        ]
      }
    },
    {
      name: 'HR Onboarding',
      description: 'New employee onboarding checklist',
      domain: 'hr',
      category: 'project',
      is_global: true,
      content: {
        statuses: [
          { name: 'Pre-boarding', color: 'gray', position: 0 },
          { name: 'Week 1', color: 'blue', position: 1 },
          { name: 'Month 1', color: 'yellow', position: 2 },
          { name: 'Completed', color: 'green', position: 3 }
        ],
        customFields: [
          { name: 'Department', type: 'select', options: ['Engineering', 'Sales', 'Marketing', 'Support'] }
        ],
        tasks: [
          { title: 'Send welcome email', status: 'Pre-boarding', priority: 'High', position: 0 },
          { title: 'Setup laptop & accounts', status: 'Pre-boarding', priority: 'High', position: 1 },
          { title: 'Team intro lunch', status: 'Week 1', priority: 'Medium', position: 2 },
          { title: '30-day check-in', status: 'Month 1', priority: 'Medium', position: 3 }
        ]
      }
    }
  ]

  const { error } = await supabase.from('templates').insert(templates)
  if (error) {
    console.error('Error seeding templates:', error)
  } else {
    console.log('Successfully seeded templates!')
  }
}

seedTemplates()
