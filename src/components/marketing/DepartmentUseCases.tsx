import { CheckCircle2 } from "lucide-react"

type UseCase = {
  title: string
  description: string
  benefits: string[]
}

type DepartmentUseCasesData = {
  heading: string
  subheading: string
  cases: UseCase[]
}

const useCasesData: Record<string, DepartmentUseCasesData> = {
  engineering: {
    heading: "How engineering teams use SYNCORA",
    subheading: "From sprint planning to post-mortems, keep your entire development lifecycle connected.",
    cases: [
      {
        title: "Incident Response",
        description: "When systems go down, every second counts. SYNCORA automatically creates war rooms, pulls in the right on-call engineers via PagerDuty, and logs all communication for the post-mortem.",
        benefits: ["Reduce MTTR by 40%", "Automate stakeholder updates", "Centralize incident logs"]
      },
      {
        title: "Code Reviews & QA",
        description: "Speed up your CI/CD pipeline by bringing GitHub pull requests directly into team channels. Discuss changes, approve code, and trigger deployments without ever leaving the app.",
        benefits: ["Faster PR turnaround", "Better cross-team visibility", "Fewer deployment bottlenecks"]
      },
      {
        title: "Sprint Management",
        description: "Connect Jira or Linear to sync tickets seamlessly. Host daily standups asynchronously and keep product managers aligned with development progress.",
        benefits: ["Eliminate status meetings", "Keep roadmaps updated", "Spot blockers instantly"]
      }
    ]
  },
  it: {
    heading: "How IT teams use SYNCORA",
    subheading: "Streamline operations, maintain security, and deliver incredible internal support.",
    cases: [
      {
        title: "Automated Onboarding",
        description: "When a new hire joins, SYNCORA automatically provisions their accounts, adds them to the right channels, and sends them a tailored welcome packet with IT guidelines.",
        benefits: ["Zero-touch provisioning", "Perfect compliance tracking", "Better new hire experience"]
      },
      {
        title: "IT Helpdesk Ticketing",
        description: "Employees can submit tickets directly via chat. IT agents can triage, categorize, and resolve issues from a centralized dashboard that syncs with ServiceNow or Jira Service Desk.",
        benefits: ["Faster ticket resolution", "Higher employee CSAT", "No lost email requests"]
      },
      {
        title: "Infrastructure Monitoring",
        description: "Channel alerts from Datadog and AWS directly to your NOC team. Set up priority routing so critical alerts bypass notifications filters and wake up the right people.",
        benefits: ["Instant anomaly detection", "Reduced alert fatigue", "Unified monitoring dashboards"]
      }
    ]
  },
  "customer-service": {
    heading: "How support teams use SYNCORA",
    subheading: "Resolve customer issues faster by connecting agents with the right experts.",
    cases: [
      {
        title: "Tiered Escalations",
        description: "When a frontline agent hits a complex issue, they can instantly loop in a product expert or engineer into a private side-channel without losing the customer context.",
        benefits: ["Higher first-contact resolution", "No context switching", "Faster expert answers"]
      },
      {
        title: "Knowledge Base Management",
        description: "Automatically surface relevant wiki articles and past resolved tickets directly in the chat when agents are typing out responses to common customer questions.",
        benefits: ["Reduced training time", "Consistent answers", "Lower handling time"]
      },
      {
        title: "VIP Account Support",
        description: "Create dedicated, shared channels with your largest enterprise clients using SYNCORA Connect. Provide white-glove, real-time support that builds immense loyalty.",
        benefits: ["Premium customer experience", "Higher retention rates", "Direct line of communication"]
      }
    ]
  },
  sales: {
    heading: "How sales teams use SYNCORA",
    subheading: "Accelerate deal cycles by bringing the whole company behind your sales reps.",
    cases: [
      {
        title: "Deal Collaboration",
        description: "Complex enterprise deals require input from Legal, Security, and Product. Create a dedicated deal room to coordinate RFPs, finalize contracts, and get approvals instantly.",
        benefits: ["Shorter sales cycles", "Faster legal approvals", "Unified account strategy"]
      },
      {
        title: "CRM Synchronization",
        description: "Never force reps to log into Salesforce just to update a stage. Let them update pipeline data, log notes, and view account history directly from their chat interface.",
        benefits: ["100% CRM hygiene", "More selling time", "Better pipeline visibility"]
      },
      {
        title: "Automated Handoffs",
        description: "When a deal is marked 'Closed Won', automatically trigger the Customer Success handoff process. Create an onboarding channel and transition the relationship seamlessly.",
        benefits: ["Zero drop-off post-sale", "Instant team celebrations", "Better customer retention"]
      }
    ]
  },
  "project-management": {
    heading: "How project managers use SYNCORA",
    subheading: "Keep every project on track, under budget, and perfectly aligned with company goals.",
    cases: [
      {
        title: "Cross-Functional Syncs",
        description: "Instead of weekly status meetings, use automated check-ins to gather updates from engineering, design, and marketing simultaneously in one channel.",
        benefits: ["Save hours of meeting time", "Maintain a written record", "Spot dependencies early"]
      },
      {
        title: "Vendor Management",
        description: "Use SYNCORA Connect to bring external agencies and contractors into restricted channels. Share briefs and review deliverables securely.",
        benefits: ["Seamless external collaboration", "Secure document sharing", "Faster feedback loops"]
      },
      {
        title: "Launch Coordination",
        description: "Create a dedicated war room for product launches. Use pinned messages for key assets and integrate with your deployment tools for real-time tracking.",
        benefits: ["Flawless execution", "Instant team alignment", "Centralized assets"]
      }
    ]
  },
  marketing: {
    heading: "How marketing teams use SYNCORA",
    subheading: "From creative brainstorming to campaign execution, get your message out faster.",
    cases: [
      {
        title: "Creative Reviews",
        description: "Post design assets directly in channels. Use threaded conversations to gather feedback from copywriters, designers, and stakeholders in one place.",
        benefits: ["End endless email chains", "Faster creative approvals", "Clear feedback history"]
      },
      {
        title: "Campaign Monitoring",
        description: "Pipe real-time alerts from Google Ads and HubSpot into a dedicated performance channel to monitor CPC, conversions, and ROI.",
        benefits: ["React to trends instantly", "Optimize spend in real-time", "Democratize data access"]
      },
      {
        title: "Social Media Triage",
        description: "Integrate with social listening tools to pipe brand mentions into a triage channel. Assign responses to team members instantly.",
        benefits: ["Faster response times", "Never miss a mention", "Coordinated PR responses"]
      }
    ]
  },
  "human-resources": {
    heading: "How HR teams use SYNCORA",
    subheading: "Create a thriving culture and manage the employee lifecycle from day one.",
    cases: [
      {
        title: "New Hire Onboarding",
        description: "Automate the onboarding journey. Trigger workflows that add new hires to the right channels, send them the handbook, and introduce them to their buddy.",
        benefits: ["Consistent day-one experience", "Less administrative overhead", "Faster time to productivity"]
      },
      {
        title: "Employee Support Desk",
        description: "Create a #ask-hr channel where employees can securely ask questions about benefits, payroll, or policies, with automated FAQ responses for common queries.",
        benefits: ["Reduced repetitive questions", "Private issue resolution", "Higher employee satisfaction"]
      },
      {
        title: "Culture & Engagement",
        description: "Run automated pulse surveys, celebrate birthdays with integrations, and randomly pair employees for virtual coffee chats to build team cohesion.",
        benefits: ["Stronger remote culture", "Higher retention rates", "Continuous feedback"]
      }
    ]
  },
  security: {
    heading: "How security teams use SYNCORA",
    subheading: "Protect your organization with faster threat detection and coordinated incident response.",
    cases: [
      {
        title: "Automated Threat Alerts",
        description: "Connect your SIEM and IDS tools to pipe high-priority security alerts into a dedicated triage channel that pages the on-call analyst.",
        benefits: ["Instant threat visibility", "Reduced alert fatigue", "Faster mean time to acknowledge"]
      },
      {
        title: "Incident Response",
        description: "When a breach is suspected, instantly spin up a secure, restricted war room. Pull in legal, PR, and executive stakeholders to coordinate the response.",
        benefits: ["Secure out-of-band communication", "Coordinated crisis management", "Comprehensive audit trails"]
      },
      {
        title: "Access Reviews",
        description: "Automate quarterly access reviews by sending interactive messages to managers, asking them to approve or revoke access for their direct reports.",
        benefits: ["Simplified compliance", "Reduced insider risk", "Less manual spreadsheet work"]
      }
    ]
  }
}

interface DepartmentUseCasesProps {
  department: string
}

export function DepartmentUseCases({ department }: DepartmentUseCasesProps) {
  const data = useCasesData[department]
  
  if (!data) return null

  return (
    <div className="bg-muted/30 py-24 sm:py-32 border-y border-border/50">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {data.heading}
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {data.subheading}
          </p>
        </div>
        
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {data.cases.map((useCase, index) => (
              <div 
                key={useCase.title} 
                className="flex flex-col bg-background rounded-2xl p-8 shadow-sm border border-border/50 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{useCase.title}</h3>
                </div>
                
                <p className="text-muted-foreground leading-relaxed flex-1 mb-8">
                  {useCase.description}
                </p>
                
                <ul className="space-y-3 mt-auto">
                  {useCase.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-3 text-sm font-medium text-foreground">
                      <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
