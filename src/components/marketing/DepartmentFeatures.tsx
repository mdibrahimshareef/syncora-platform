import { 
  GitPullRequest, 
  Terminal, 
  Activity, 
  Bug, 
  Rocket, 
  ShieldAlert,
  Server,
  Lock,
  Wifi,
  Database,
  Headset,
  HeartHandshake,
  MessageSquare,
  BookOpen,
  LineChart,
  Target,
  Users,
  Briefcase,
  PieChart,
  Banknote,
  ListTodo,
  CheckSquare,
  ClipboardList,
  Megaphone,
  TrendingUp,
  Search,
  UserPlus,
  Heart,
  Key,
  AlertTriangle,
  LucideIcon
} from "lucide-react"

type Feature = {
  name: string
  description: string
  icon: LucideIcon
}

type DepartmentFeaturesData = {
  title: string
  description: string
  features: Feature[]
}

const departmentData: Record<string, DepartmentFeaturesData> = {
  engineering: {
    title: "Ship better code, faster",
    description: "SYNCORA gives engineering teams the context they need to resolve incidents quickly, review code collaboratively, and deploy with confidence.",
    features: [
      {
        name: "Git & CI/CD Integration",
        description: "Pull requests, code reviews, and deployment statuses flow directly into your channels. Never miss a build failure again.",
        icon: GitPullRequest,
      },
      {
        name: "Incident Management",
        description: "Automate incident response with PagerDuty and Jira integrations. Swarm bugs instantly with auto-created war rooms.",
        icon: ShieldAlert,
      },
      {
        name: "Agile Workflows",
        description: "Track sprints and manage backlogs seamlessly. Connect your daily standups directly to your codebase.",
        icon: Activity,
      },
      {
        name: "Bug Tracking",
        description: "Capture bugs with rich context, assign them directly from chat, and track resolution without switching apps.",
        icon: Bug,
      },
      {
        name: "Developer Tools",
        description: "Run scripts, trigger webhooks, and execute slash commands to interact with your infrastructure right from SYNCORA.",
        icon: Terminal,
      },
      {
        name: "Accelerated Delivery",
        description: "Reduce context switching and keep your developers in the flow state, improving overall velocity.",
        icon: Rocket,
      },
    ]
  },
  it: {
    title: "Secure, scalable IT operations",
    description: "Modernize your IT service desk, automate provisioning, and maintain ironclad security across your entire organization.",
    features: [
      {
        name: "Helpdesk Ticketing",
        description: "Allow employees to submit IT requests directly in chat. Triage, assign, and resolve tickets at lightning speed.",
        icon: Headset,
      },
      {
        name: "Security & Compliance",
        description: "Enforce SSO, SAML, and multi-factor authentication. Maintain compliance with enterprise-grade data retention.",
        icon: Lock,
      },
      {
        name: "Asset Management",
        description: "Track hardware assignments, software licenses, and access requests in one centralized, searchable database.",
        icon: Server,
      },
      {
        name: "Network Monitoring",
        description: "Receive instant alerts from Datadog, New Relic, and AWS when infrastructure anomalies are detected.",
        icon: Wifi,
      },
      {
        name: "Automated Provisioning",
        description: "Automatically grant or revoke access to tools and channels when employees join or leave the company.",
        icon: Database,
      },
      {
        name: "Incident Resolution",
        description: "Coordinate cross-functional IT responses to major outages with dedicated channels and stakeholder updates.",
        icon: ShieldAlert,
      },
    ]
  },
  "customer-service": {
    title: "Deliver world-class support",
    description: "Empower your agents to solve problems faster by connecting them directly to the experts, tools, and context they need.",
    features: [
      {
        name: "Omnichannel Inbox",
        description: "Unite customer emails, live chats, and social media mentions into a single, collaborative workspace.",
        icon: MessageSquare,
      },
      {
        name: "Instant Escalations",
        description: "Route complex tickets to tier-2 support or engineering seamlessly, preserving the entire customer context.",
        icon: HeartHandshake,
      },
      {
        name: "Knowledge Base Access",
        description: "Search your internal wiki and support documentation directly from the chat interface to find answers instantly.",
        icon: BookOpen,
      },
      {
        name: "CSAT Analytics",
        description: "Track response times, resolution rates, and customer satisfaction scores with real-time reporting dashboards.",
        icon: LineChart,
      },
      {
        name: "VIP Routing",
        description: "Automatically prioritize and route messages from high-value enterprise customers to specialized success teams.",
        icon: Target,
      },
      {
        name: "CRM Synchronization",
        description: "View live customer data from Salesforce or Zendesk right next to your conversations.",
        icon: Users,
      },
    ]
  },
  sales: {
    title: "Accelerate your revenue engine",
    description: "Close deals faster by bringing your account executives, SDRs, and sales engineers together to collaborate on winning strategies.",
    features: [
      {
        name: "CRM Integration",
        description: "Update Salesforce records, log activities, and transition deal stages without ever leaving your workspace.",
        icon: Briefcase,
      },
      {
        name: "Deal Rooms",
        description: "Create dedicated, secure channels for enterprise accounts to collaborate with legal, security, and executives.",
        icon: Target,
      },
      {
        name: "Revenue Analytics",
        description: "Visualize your pipeline, track quota attainment, and forecast revenue with interactive, real-time charts.",
        icon: PieChart,
      },
      {
        name: "Automated Follow-ups",
        description: "Set reminders and automate outreach cadences to ensure no prospect ever falls through the cracks.",
        icon: Activity,
      },
      {
        name: "Proposal Collaboration",
        description: "Work on pitch decks, RFPs, and contracts simultaneously with seamless Google Drive and internal integrations.",
        icon: Users,
      },
      {
        name: "Win Notifications",
        description: "Celebrate closed-won deals instantly with automated alerts that broadcast team successes company-wide.",
        icon: Banknote,
      },
    ]
  },
  "project-management": {
    title: "Master your projects from start to finish",
    description: "Keep teams aligned, track milestones, and deliver on time by bringing all your project management into SYNCORA.",
    features: [
      {
        name: "Task Tracking",
        description: "Create, assign, and track tasks natively within chat. Never lose track of what needs to be done next.",
        icon: ListTodo,
      },
      {
        name: "Sprint Boards",
        description: "Visualize your team's workload with Kanban boards that update automatically when tasks are moved.",
        icon: CheckSquare,
      },
      {
        name: "Goal Alignment",
        description: "Set OKRs and track progress towards company goals directly in your project channels.",
        icon: Target,
      },
      {
        name: "Automated Check-ins",
        description: "Replace daily standup meetings with asynchronous check-ins that compile automatically.",
        icon: Activity,
      },
      {
        name: "Document Collaboration",
        description: "Draft project specs, share updates, and finalize deliverables without leaving your workspace.",
        icon: BookOpen,
      },
      {
        name: "Resource Allocation",
        description: "See who is overloaded and who has bandwidth across all active projects.",
        icon: Users,
      },
    ]
  },
  marketing: {
    title: "Campaign execution, supercharged",
    description: "Coordinate product launches, manage content calendars, and align your marketing team in one centralized hub.",
    features: [
      {
        name: "Campaign Channels",
        description: "Spin up dedicated spaces for each campaign. Keep agencies, contractors, and internal teams on the same page.",
        icon: Megaphone,
      },
      {
        name: "Performance Dashboards",
        description: "Pull in real-time metrics from Google Analytics, HubSpot, and social platforms directly into your team channel.",
        icon: TrendingUp,
      },
      {
        name: "Asset Approvals",
        description: "Review and approve creative assets faster with in-line commenting and automated workflow routing.",
        icon: CheckSquare,
      },
      {
        name: "Content Calendars",
        description: "Plan your blog posts, social media updates, and newsletters with an interactive calendar view.",
        icon: BookOpen,
      },
      {
        name: "Competitor Tracking",
        description: "Set up automated alerts for competitor news, social mentions, and pricing changes.",
        icon: Search,
      },
      {
        name: "Event Coordination",
        description: "Manage logistics for trade shows, webinars, and conferences with dedicated planning templates.",
        icon: Users,
      },
    ]
  },
  "human-resources": {
    title: "Build a better workplace",
    description: "Streamline recruitment, automate onboarding, and foster an inclusive company culture from anywhere.",
    features: [
      {
        name: "Automated Onboarding",
        description: "Deliver a flawless day-one experience with automated introduction schedules, training plans, and buddy assignments.",
        icon: UserPlus,
      },
      {
        name: "Employee Engagement",
        description: "Run pulse surveys, collect anonymous feedback, and gauge team sentiment directly in chat.",
        icon: Heart,
      },
      {
        name: "Interview Coordination",
        description: "Schedule interviews, collect feedback from hiring managers, and track candidates seamlessly.",
        icon: Users,
      },
      {
        name: "Benefit Administration",
        description: "Provide a centralized hub where employees can access health insurance info and request time off.",
        icon: BookOpen,
      },
      {
        name: "Culture Building",
        description: "Automate 'donut' introductions, celebrate work anniversaries, and manage employee recognition programs.",
        icon: Target,
      },
      {
        name: "Policy Management",
        description: "Ensure everyone has read the latest company policies with acknowledgment tracking.",
        icon: ShieldAlert,
      },
    ]
  },
  security: {
    title: "Enterprise-grade protection",
    description: "Detect threats faster, manage access securely, and coordinate incident response with precision.",
    features: [
      {
        name: "Threat Alerts",
        description: "Channel real-time alerts from your SIEM tools (Splunk, CrowdStrike) directly to your SOC team.",
        icon: AlertTriangle,
      },
      {
        name: "Access Management",
        description: "Manage Okta or Azure AD permissions and provision temporary access via chat commands.",
        icon: Key,
      },
      {
        name: "Security War Rooms",
        description: "Automatically spin up secure, restricted channels for handling active security incidents.",
        icon: ShieldAlert,
      },
      {
        name: "Audit Logging",
        description: "Maintain a comprehensive, tamper-proof log of all administrative actions and access requests.",
        icon: BookOpen,
      },
      {
        name: "Vulnerability Tracking",
        description: "Integrate with vulnerability scanners to assign and track patching efforts across engineering teams.",
        icon: Bug,
      },
      {
        name: "Compliance Reporting",
        description: "Generate SOC2, HIPAA, or GDPR compliance reports automatically based on system activities.",
        icon: Target,
      },
    ]
  }
}

interface DepartmentFeaturesProps {
  department: string
}

export function DepartmentFeatures({ department }: DepartmentFeaturesProps) {
  const data = departmentData[department]
  
  if (!data) return null

  return (
    <div className="bg-background py-24 sm:py-32">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary uppercase tracking-wider">Everything you need</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {data.title}
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {data.description}
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {data.features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
