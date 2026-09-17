const fs = require('fs');

const uuid = "gen_random_uuid()";

function t(name, desc, domain, category, statuses, tasks, taskTypes) {
    const content = JSON.stringify({
        statuses: statuses.map((s, i) => ({ name: s.name, color: s.color, position: i + 1 })),
        tasks: tasks.map((t, i) => ({ title: t.title, status: t.status, priority: t.priority, position: i + 1 })),
        taskTypes: taskTypes || ['Task']
    });
    return `(${uuid}, '${name}', '${desc.replace(/'/g, "''")}', '${domain}', '${category}', true, '${content}')`;
}

const templates = [
    // Engineering & IT
    t('Software Engineering Sprint', 'Agile sprint tracking with backlog, in progress, review, and QA.', 'Engineering & IT', 'Agile',
        [{name: 'Backlog', color: 'slate'}, {name: 'In Progress', color: 'blue'}, {name: 'In Review', color: 'purple'}, {name: 'QA', color: 'orange'}, {name: 'Done', color: 'emerald'}],
        [{title: 'Setup repository', status: 'Backlog', priority: 'High'}, {title: 'Design DB schema', status: 'Backlog', priority: 'Urgent'}, {title: 'Define API endpoints', status: 'Backlog', priority: 'Normal'}],
        ['Epic', 'Story', 'Bug', 'Task']
    ),
    t('IT Helpdesk', 'Ticket tracking and resolution flow.', 'Engineering & IT', 'Support',
        [{name: 'New', color: 'red'}, {name: 'Investigating', color: 'orange'}, {name: 'Waiting on Customer', color: 'yellow'}, {name: 'Resolved', color: 'emerald'}],
        [{title: 'Password reset request', status: 'New', priority: 'Normal'}, {title: 'VPN access issue', status: 'New', priority: 'High'}],
        ['Incident', 'Service Request', 'Problem', 'Change']
    ),
    t('Bug Tracker', 'Issue tracking and resolution.', 'Engineering & IT', 'QA',
        [{name: 'Triage', color: 'slate'}, {name: 'To Do', color: 'blue'}, {name: 'Fixing', color: 'purple'}, {name: 'Testing', color: 'orange'}, {name: 'Resolved', color: 'emerald'}],
        [{title: 'Fix login screen overflow on mobile', status: 'Triage', priority: 'High'}, {title: 'Memory leak in data table', status: 'Triage', priority: 'Urgent'}],
        ['Bug', 'Regression', 'Enhancement']
    ),
    t('Security Audit', 'Compliance checks and security reviews.', 'Engineering & IT', 'Security',
        [{name: 'Pending', color: 'slate'}, {name: 'Auditing', color: 'blue'}, {name: 'Remediation', color: 'orange'}, {name: 'Compliant', color: 'emerald'}],
        [{title: 'Review IAM roles', status: 'Pending', priority: 'High'}, {title: 'Rotate production database keys', status: 'Pending', priority: 'Urgent'}],
        ['Vulnerability', 'Risk', 'Task']
    ),
    t('Website Redesign', 'Page updates, design, and deployment.', 'Engineering & IT', 'Web',
        [{name: 'Wireframes', color: 'slate'}, {name: 'Design', color: 'blue'}, {name: 'Development', color: 'purple'}, {name: 'QA', color: 'orange'}, {name: 'Live', color: 'emerald'}],
        [{title: 'Homepage wireframes', status: 'Wireframes', priority: 'High'}, {title: 'Update global font stack', status: 'Wireframes', priority: 'Normal'}],
        ['Page', 'Component', 'Task', 'Bug']
    ),

    // Product & Design
    t('Product Roadmap', 'High-level product feature tracking.', 'Product & Design', 'Planning',
        [{name: 'Idea', color: 'slate'}, {name: 'Up Next', color: 'blue'}, {name: 'In Development', color: 'orange'}, {name: 'Released', color: 'emerald'}],
        [{title: 'Implement Dark Mode', status: 'Idea', priority: 'Normal'}, {title: 'SSO Integration', status: 'Idea', priority: 'High'}],
        ['Initiative', 'Feature', 'Milestone']
    ),
    t('Design System Updates', 'Managing UI components and design tokens.', 'Product & Design', 'UI/UX',
        [{name: 'Backlog', color: 'slate'}, {name: 'Designing', color: 'blue'}, {name: 'Review', color: 'purple'}, {name: 'Approved', color: 'emerald'}],
        [{title: 'Create new Button variants', status: 'Backlog', priority: 'Normal'}, {title: 'Audit color contrast for accessibility', status: 'Backlog', priority: 'High'}],
        ['Component', 'Token', 'Audit']
    ),
    t('User Research', 'Interviews, surveys, and usability testing.', 'Product & Design', 'Research',
        [{name: 'Recruiting', color: 'slate'}, {name: 'Interviewing', color: 'blue'}, {name: 'Synthesizing', color: 'purple'}, {name: 'Done', color: 'emerald'}],
        [{title: 'Draft survey questions for V2', status: 'Recruiting', priority: 'Normal'}, {title: 'Schedule 5 user interviews', status: 'Recruiting', priority: 'High'}],
        ['Interview', 'Survey', 'Analysis']
    ),

    // Marketing & Sales
    t('Marketing Campaign', 'Track campaigns from concept to launch.', 'Marketing & Sales', 'Campaigns',
        [{name: 'Planning', color: 'slate'}, {name: 'Drafting', color: 'blue'}, {name: 'Review', color: 'purple'}, {name: 'Published', color: 'emerald'}],
        [{title: 'Define Q3 campaign goals', status: 'Planning', priority: 'High'}, {title: 'Draft landing page copy', status: 'Planning', priority: 'Normal'}],
        ['Campaign', 'Asset', 'Task']
    ),
    t('Sales Pipeline', 'Lead generation and deal tracking.', 'Marketing & Sales', 'CRM',
        [{name: 'Lead', color: 'slate'}, {name: 'Contacted', color: 'blue'}, {name: 'Proposal', color: 'purple'}, {name: 'Closed Won', color: 'emerald'}, {name: 'Closed Lost', color: 'red'}],
        [{title: 'Acme Corp - Initial Outreach', status: 'Lead', priority: 'Normal'}, {title: 'Stark Industries - Follow up', status: 'Lead', priority: 'High'}],
        ['Lead', 'Deal', 'Account']
    ),
    t('Content Calendar', 'Blog and social media content planning.', 'Marketing & Sales', 'Content',
        [{name: 'Idea', color: 'slate'}, {name: 'Writing', color: 'blue'}, {name: 'Editing', color: 'purple'}, {name: 'Scheduled', color: 'orange'}, {name: 'Published', color: 'emerald'}],
        [{title: 'Top 10 tips for remote work blog post', status: 'Idea', priority: 'Normal'}, {title: 'Product update newsletter', status: 'Idea', priority: 'High'}],
        ['Blog Post', 'Social Media', 'Video', 'Newsletter']
    ),
    t('Social Media Strategy', 'Campaigns, posts, and analytics.', 'Marketing & Sales', 'Social',
        [{name: 'Idea', color: 'slate'}, {name: 'Creating', color: 'blue'}, {name: 'Review', color: 'purple'}, {name: 'Scheduled', color: 'orange'}, {name: 'Posted', color: 'emerald'}],
        [{title: 'Draft launch tweets', status: 'Idea', priority: 'High'}, {title: 'Create instagram reel for new feature', status: 'Idea', priority: 'Normal'}],
        ['Post', 'Reel', 'Story']
    ),
    t('Brand Launch', 'Assets, PR, and launch logistics.', 'Marketing & Sales', 'Brand',
        [{name: 'Strategy', color: 'slate'}, {name: 'Creative', color: 'blue'}, {name: 'Approvals', color: 'orange'}, {name: 'Launched', color: 'emerald'}],
        [{title: 'Finalize brand guidelines', status: 'Strategy', priority: 'Urgent'}, {title: 'Order new swag inventory', status: 'Strategy', priority: 'Normal'}],
        ['Asset', 'Press Release', 'Event']
    ),

    // Operations & Finance
    t('Budget Planning', 'Financial forecasting and budgeting.', 'Operations & Finance', 'Planning',
        [{name: 'Drafting', color: 'slate'}, {name: 'Under Review', color: 'orange'}, {name: 'Approved', color: 'emerald'}],
        [{title: 'Draft Q4 marketing budget', status: 'Drafting', priority: 'High'}, {title: 'Review software subscriptions', status: 'Drafting', priority: 'Normal'}],
        ['Budget', 'Forecast', 'Expense']
    ),
    t('Event Planning', 'Logistics for virtual and in-person events.', 'Operations & Finance', 'Events',
        [{name: 'Planning', color: 'slate'}, {name: 'Preparation', color: 'blue'}, {name: 'Execution', color: 'purple'}, {name: 'Wrap-up', color: 'emerald'}],
        [{title: 'Book venue for annual retreat', status: 'Planning', priority: 'Urgent'}, {title: 'Send save-the-date emails', status: 'Planning', priority: 'Normal'}],
        ['Logistics', 'Vendor', 'Attendee']
    ),
    t('Facilities Maintenance', 'Office repairs and requests.', 'Operations & Finance', 'Facilities',
        [{name: 'Reported', color: 'red'}, {name: 'Assigned', color: 'blue'}, {name: 'In Progress', color: 'orange'}, {name: 'Completed', color: 'emerald'}],
        [{title: 'Fix broken AC in conference room', status: 'Reported', priority: 'Urgent'}, {title: 'Order more coffee pods', status: 'Reported', priority: 'Low'}],
        ['Repair', 'Supply Request', 'Inspection']
    ),
    t('Procurement', 'Purchasing and vendor management.', 'Operations & Finance', 'Procurement',
        [{name: 'Request', color: 'slate'}, {name: 'Quoting', color: 'blue'}, {name: 'Approval', color: 'orange'}, {name: 'Purchased', color: 'emerald'}, {name: 'Received', color: 'purple'}],
        [{title: 'Request 10 new developer laptops', status: 'Request', priority: 'High'}, {title: 'Renew Slack enterprise license', status: 'Request', priority: 'Urgent'}],
        ['Purchase Order', 'Vendor Evaluation', 'Invoice']
    ),
    t('Board Meeting Prep', 'Agenda, slides, and financials.', 'Operations & Finance', 'Meetings',
        [{name: 'Drafting', color: 'slate'}, {name: 'Review', color: 'orange'}, {name: 'Finalized', color: 'emerald'}],
        [{title: 'Compile Q2 financial reports', status: 'Drafting', priority: 'Urgent'}, {title: 'Draft CEO presentation', status: 'Drafting', priority: 'High'}],
        ['Report', 'Presentation', 'Agenda Item']
    ),

    // HR & Legal
    t('Employee Onboarding', 'Structured onboarding process for new hires.', 'HR & Legal', 'Onboarding',
        [{name: 'Pre-boarding', color: 'slate'}, {name: 'Day 1', color: 'blue'}, {name: 'Week 1', color: 'purple'}, {name: 'Completed', color: 'emerald'}],
        [{title: 'Send welcome email and laptop', status: 'Pre-boarding', priority: 'High'}, {title: 'Schedule HR intro meeting', status: 'Pre-boarding', priority: 'Normal'}],
        ['Checklist Item', 'Meeting', 'Document']
    ),
    t('Legal Contract Review', 'Contract generation, review, and signing.', 'HR & Legal', 'Contracts',
        [{name: 'Draft', color: 'slate'}, {name: 'Review', color: 'orange'}, {name: 'Pending Signature', color: 'blue'}, {name: 'Signed', color: 'emerald'}],
        [{title: 'Draft NDA for Acme Corp', status: 'Draft', priority: 'High'}, {title: 'Review vendor agreement for AWS', status: 'Review', priority: 'Urgent'}],
        ['Contract', 'NDA', 'Compliance Check']
    )
];

const sql = `-- Migration: Insert initial templates
INSERT INTO public.templates (id, name, description, domain, category, is_global, content) VALUES
${templates.join(',\n')};
`;

console.log(sql);
