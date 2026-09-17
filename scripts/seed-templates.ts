import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const TEMPLATES = [
  // --- Software / IT ---
  {
    name: 'Software Development',
    domain: 'Software / IT',
    category: 'Project',
    description: 'Standard agile workflow for software engineering teams.',
    content: {
      statuses: [
        { name: 'Backlog', color: '#6b7280', position: 0 },
        { name: 'Todo', color: '#3b82f6', position: 1 },
        { name: 'In Progress', color: '#f59e0b', position: 2 },
        { name: 'Code Review', color: '#8b5cf6', position: 3 },
        { name: 'QA', color: '#ec4899', position: 4 },
        { name: 'Done', color: '#10b981', position: 5 }
      ],
      customFields: [
        { name: 'Story Points', type: 'number', options: null },
        { name: 'Component', type: 'select', options: ['Frontend', 'Backend', 'Database', 'Infrastructure'] }
      ],
      tasks: [
        { title: 'Setup repository and CI/CD', status: 'Done', priority: 'High', position: 0 },
        { title: 'Write technical spec', status: 'In Progress', priority: 'High', position: 1 },
        { title: 'Implement core features', status: 'Todo', priority: 'Medium', position: 2 },
        { title: 'Write unit tests', status: 'Todo', priority: 'Medium', position: 3 },
        { title: 'Deploy to staging', status: 'Backlog', priority: 'Low', position: 4 }
      ]
    }
  },
  {
    name: 'IT Help Desk',
    domain: 'Software / IT',
    category: 'Support',
    description: 'Manage internal IT requests and incidents.',
    content: {
      statuses: [
        { name: 'New Ticket', color: '#ef4444', position: 0 },
        { name: 'Triage', color: '#f59e0b', position: 1 },
        { name: 'In Progress', color: '#3b82f6', position: 2 },
        { name: 'Waiting on User', color: '#8b5cf6', position: 3 },
        { name: 'Resolved', color: '#10b981', position: 4 },
        { name: 'Closed', color: '#6b7280', position: 5 }
      ],
      customFields: [
        { name: 'Ticket Type', type: 'select', options: ['Hardware', 'Software', 'Access', 'Network'] },
        { name: 'Urgency', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] }
      ],
      tasks: [
        { title: 'Laptop provisioning for new hire', status: 'In Progress', priority: 'High', position: 0 },
        { title: 'VPN connection issue', status: 'Waiting on User', priority: 'Medium', position: 1 },
        { title: 'Software license request', status: 'New Ticket', priority: 'Low', position: 2 }
      ]
    }
  },
  {
    name: 'DevOps / Release Management',
    domain: 'Software / IT',
    category: 'Operations',
    description: 'Track deployments, infrastructure changes, and release cycles.',
    content: {
      statuses: [
        { name: 'Planned', color: '#6b7280', position: 0 },
        { name: 'Development', color: '#3b82f6', position: 1 },
        { name: 'Testing', color: '#f59e0b', position: 2 },
        { name: 'Ready for Release', color: '#8b5cf6', position: 3 },
        { name: 'Deploying', color: '#ec4899', position: 4 },
        { name: 'Live', color: '#10b981', position: 5 },
        { name: 'Rollback', color: '#ef4444', position: 6 }
      ],
      customFields: [
        { name: 'Environment', type: 'select', options: ['Dev', 'Staging', 'Production'] },
        { name: 'Downtime Expected', type: 'select', options: ['Yes', 'No'] }
      ],
      tasks: [
        { title: 'Migrate database to v2', status: 'Planned', priority: 'High', position: 0 },
        { title: 'Update SSL certificates', status: 'Live', priority: 'High', position: 1 },
        { title: 'Configure auto-scaling', status: 'Testing', priority: 'Medium', position: 2 }
      ]
    }
  },

  // --- Marketing / Creative ---
  {
    name: 'Content Creation',
    domain: 'Marketing / Creative',
    category: 'Project',
    description: 'Editorial workflow for producing and publishing content.',
    content: {
      statuses: [
        { name: 'Ideas', color: '#6b7280', position: 0 },
        { name: 'Brief', color: '#3b82f6', position: 1 },
        { name: 'Writing', color: '#f59e0b', position: 2 },
        { name: 'Review', color: '#8b5cf6', position: 3 },
        { name: 'Approved', color: '#10b981', position: 4 },
        { name: 'Published', color: '#059669', position: 5 }
      ],
      customFields: [
        { name: 'Channel', type: 'select', options: ['Blog', 'Twitter', 'LinkedIn', 'Newsletter'] },
        { name: 'Publish Date', type: 'date', options: null }
      ],
      tasks: [
        { title: 'Draft campaign brief', status: 'Done', priority: 'High', position: 0 },
        { title: 'Design creative assets', status: 'In Progress', priority: 'High', position: 1 },
        { title: 'Review copy', status: 'Review', priority: 'Medium', position: 2 },
        { title: 'Schedule social posts', status: 'Ideas', priority: 'Medium', position: 3 }
      ]
    }
  },
  {
    name: 'Social Media Campaign',
    domain: 'Marketing / Creative',
    category: 'Campaign',
    description: 'Plan, schedule, and execute social media marketing campaigns.',
    content: {
      statuses: [
        { name: 'Planning', color: '#6b7280', position: 0 },
        { name: 'Asset Creation', color: '#f59e0b', position: 1 },
        { name: 'Copywriting', color: '#3b82f6', position: 2 },
        { name: 'Approval Required', color: '#ef4444', position: 3 },
        { name: 'Scheduled', color: '#8b5cf6', position: 4 },
        { name: 'Live', color: '#10b981', position: 5 }
      ],
      customFields: [
        { name: 'Platform', type: 'multi-select', options: ['Instagram', 'Twitter', 'LinkedIn', 'TikTok'] },
        { name: 'Target Audience', type: 'select', options: ['B2B', 'B2C', 'Enterprise', 'SMB'] }
      ],
      tasks: [
        { title: 'Q3 Feature Announcement', status: 'Planning', priority: 'High', position: 0 },
        { title: 'Customer Testimonial Reel', status: 'Asset Creation', priority: 'Medium', position: 1 },
        { title: 'Weekly Tips Thread', status: 'Scheduled', priority: 'Low', position: 2 }
      ]
    }
  },
  {
    name: 'Design Review',
    domain: 'Marketing / Creative',
    category: 'Design',
    description: 'Workflow for design requests, iterations, and final asset delivery.',
    content: {
      statuses: [
        { name: 'Request Received', color: '#6b7280', position: 0 },
        { name: 'Wireframing', color: '#3b82f6', position: 1 },
        { name: 'First Draft', color: '#f59e0b', position: 2 },
        { name: 'Stakeholder Review', color: '#ef4444', position: 3 },
        { name: 'Revisions', color: '#8b5cf6', position: 4 },
        { name: 'Final Handoff', color: '#10b981', position: 5 }
      ],
      customFields: [
        { name: 'Asset Type', type: 'select', options: ['Web UI', 'Print', 'Social Graphics', 'Video', 'Brand Identity'] },
        { name: 'Figma Link', type: 'text', options: null }
      ],
      tasks: [
        { title: 'Landing Page Redesign', status: 'Wireframing', priority: 'High', position: 0 },
        { title: 'Q4 Ad Banners', status: 'First Draft', priority: 'Medium', position: 1 },
        { title: 'Logo Refresh', status: 'Stakeholder Review', priority: 'High', position: 2 }
      ]
    }
  },

  // --- Sales / Customer ---
  {
    name: 'Sales Pipeline',
    domain: 'Sales / Customer',
    category: 'CRM',
    description: 'Track leads and deals through the sales cycle.',
    content: {
      statuses: [
        { name: 'Lead', color: '#6b7280', position: 0 },
        { name: 'Qualified', color: '#3b82f6', position: 1 },
        { name: 'Proposal', color: '#f59e0b', position: 2 },
        { name: 'Negotiation', color: '#8b5cf6', position: 3 },
        { name: 'Won', color: '#10b981', position: 4 },
        { name: 'Lost', color: '#ef4444', position: 5 }
      ],
      customFields: [
        { name: 'Deal Value', type: 'number', options: null },
        { name: 'Company Size', type: 'select', options: ['1-10', '11-50', '51-200', '201-1000', '1000+'] }
      ],
      tasks: [
        { title: 'Acme Corp Outreach', status: 'Qualified', priority: 'High', position: 0 },
        { title: 'GlobalTech Intro Call', status: 'Lead', priority: 'Medium', position: 1 },
        { title: 'TechStart Contract', status: 'Negotiation', priority: 'High', position: 2 }
      ]
    }
  },
  {
    name: 'Customer Onboarding',
    domain: 'Sales / Customer',
    category: 'Operations',
    description: 'Ensure smooth transition from sales to active product usage.',
    content: {
      statuses: [
        { name: 'Contract Signed', color: '#6b7280', position: 0 },
        { name: 'Kickoff Call', color: '#3b82f6', position: 1 },
        { name: 'Account Setup', color: '#f59e0b', position: 2 },
        { name: 'Data Migration', color: '#8b5cf6', position: 3 },
        { name: 'Training', color: '#ec4899', position: 4 },
        { name: 'Live / Handed Off', color: '#10b981', position: 5 }
      ],
      customFields: [
        { name: 'CSM Assigned', type: 'text', options: null },
        { name: 'Target Go-Live', type: 'date', options: null }
      ],
      tasks: [
        { title: 'Acme Corp Kickoff', status: 'Kickoff Call', priority: 'High', position: 0 },
        { title: 'GlobalTech Setup', status: 'Account Setup', priority: 'High', position: 1 },
        { title: 'TechStart Training', status: 'Training', priority: 'Medium', position: 2 }
      ]
    }
  },
  {
    name: 'Customer Support',
    domain: 'Sales / Customer',
    category: 'Support',
    description: 'Track customer issues, bugs, and feature requests.',
    content: {
      statuses: [
        { name: 'New Request', color: '#ef4444', position: 0 },
        { name: 'Investigating', color: '#f59e0b', position: 1 },
        { name: 'Escalated to Eng', color: '#8b5cf6', position: 2 },
        { name: 'Awaiting Customer', color: '#3b82f6', position: 3 },
        { name: 'Resolved', color: '#10b981', position: 4 }
      ],
      customFields: [
        { name: 'Priority Level', type: 'select', options: ['P1 (Critical)', 'P2 (High)', 'P3 (Normal)', 'P4 (Low)'] },
        { name: 'Customer Tier', type: 'select', options: ['Enterprise', 'Pro', 'Basic'] }
      ],
      tasks: [
        { title: 'Cannot access dashboard', status: 'Investigating', priority: 'High', position: 0 },
        { title: 'Feature request: Dark mode', status: 'Escalated to Eng', priority: 'Low', position: 1 },
        { title: 'Billing discrepancy', status: 'Awaiting Customer', priority: 'Medium', position: 2 }
      ]
    }
  },

  // --- Business Operations ---
  {
    name: 'HR / People Operations',
    domain: 'Business Operations',
    category: 'HR',
    description: 'Recruitment, onboarding, and employee lifecycle management.',
    content: {
      statuses: [
        { name: 'Sourcing', color: '#6b7280', position: 0 },
        { name: 'Screening', color: '#3b82f6', position: 1 },
        { name: 'Interviewing', color: '#f59e0b', position: 2 },
        { name: 'Offer Extended', color: '#8b5cf6', position: 3 },
        { name: 'Offer Accepted', color: '#10b981', position: 4 },
        { name: 'Onboarding', color: '#ec4899', position: 5 }
      ],
      customFields: [
        { name: 'Department', type: 'select', options: ['Engineering', 'Sales', 'Marketing', 'Product', 'Ops'] },
        { name: 'Role Type', type: 'select', options: ['Full-time', 'Contractor', 'Intern'] }
      ],
      tasks: [
        { title: 'Senior Frontend Engineer', status: 'Interviewing', priority: 'High', position: 0 },
        { title: 'Product Marketing Manager', status: 'Sourcing', priority: 'Medium', position: 1 },
        { title: 'Customer Success Rep (Accepted)', status: 'Onboarding', priority: 'High', position: 2 }
      ]
    }
  },
  {
    name: 'Finance',
    domain: 'Business Operations',
    category: 'Finance',
    description: 'Expense tracking, budget approvals, and financial closing.',
    content: {
      statuses: [
        { name: 'Submitted', color: '#6b7280', position: 0 },
        { name: 'Under Review', color: '#3b82f6', position: 1 },
        { name: 'Requires Clarification', color: '#ef4444', position: 2 },
        { name: 'Approved', color: '#10b981', position: 3 },
        { name: 'Paid / Processed', color: '#059669', position: 4 },
        { name: 'Rejected', color: '#4b5563', position: 5 }
      ],
      customFields: [
        { name: 'Amount', type: 'number', options: null },
        { name: 'Category', type: 'select', options: ['Travel', 'Software', 'Office Supplies', 'Marketing Spend'] }
      ],
      tasks: [
        { title: 'Q3 AWS Bill', status: 'Under Review', priority: 'High', position: 0 },
        { title: 'Team Offsite Expenses', status: 'Requires Clarification', priority: 'Medium', position: 1 },
        { title: 'Figma Subscription Renewal', status: 'Approved', priority: 'Medium', position: 2 }
      ]
    }
  },
  {
    name: 'Procurement',
    domain: 'Business Operations',
    category: 'Operations',
    description: 'Vendor evaluation, contract review, and purchasing workflow.',
    content: {
      statuses: [
        { name: 'Request Need', color: '#6b7280', position: 0 },
        { name: 'Vendor Evaluation', color: '#3b82f6', position: 1 },
        { name: 'Security Review', color: '#f59e0b', position: 2 },
        { name: 'Legal Review', color: '#8b5cf6', position: 3 },
        { name: 'PO Issued', color: '#10b981', position: 4 },
        { name: 'Fulfilled', color: '#059669', position: 5 }
      ],
      customFields: [
        { name: 'Estimated Cost', type: 'number', options: null },
        { name: 'Vendor Name', type: 'text', options: null }
      ],
      tasks: [
        { title: 'New CRM Software Evaluation', status: 'Vendor Evaluation', priority: 'High', position: 0 },
        { title: 'Office Furniture Bulk Order', status: 'Legal Review', priority: 'Medium', position: 1 },
        { title: 'Cloud Infrastructure Upgrade', status: 'Security Review', priority: 'High', position: 2 }
      ]
    }
  },
  {
    name: 'General Operations',
    domain: 'Business Operations',
    category: 'Operations',
    description: 'Standard task tracking for operational initiatives and OKRs.',
    content: {
      statuses: [
        { name: 'Not Started', color: '#6b7280', position: 0 },
        { name: 'Planning', color: '#3b82f6', position: 1 },
        { name: 'Execution', color: '#f59e0b', position: 2 },
        { name: 'Blocked', color: '#ef4444', position: 3 },
        { name: 'Review', color: '#8b5cf6', position: 4 },
        { name: 'Completed', color: '#10b981', position: 5 }
      ],
      customFields: [
        { name: 'Quarter', type: 'select', options: ['Q1', 'Q2', 'Q3', 'Q4'] },
        { name: 'Impact', type: 'select', options: ['High', 'Medium', 'Low'] }
      ],
      tasks: [
        { title: 'Update Company Handbook', status: 'Execution', priority: 'Medium', position: 0 },
        { title: 'Q4 All Hands Planning', status: 'Planning', priority: 'High', position: 1 },
        { title: 'Office Relocation', status: 'Blocked', priority: 'High', position: 2 }
      ]
    }
  }
]

async function seedTemplates() {
  console.log("Seeding comprehensive templates...")
  
  // Clear existing templates
  const { error: deleteError } = await supabase.from('templates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) {
     console.log("Error clearing old templates:", deleteError.message)
  }

  for (const tpl of TEMPLATES) {
    const { error } = await supabase
      .from('templates')
      .insert(tpl)
    
    if (error) {
      console.error(`Error inserting template ${tpl.name}:`, error)
    } else {
      console.log(`Successfully seeded: ${tpl.name}`)
    }
  }
  
  console.log("Seeding complete.")
}

seedTemplates()
