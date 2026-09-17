"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, MessageCircleQuestion, Code2, MonitorSmartphone, Banknote, Headset, ClipboardList, Megaphone, UserPlus, ShieldAlert } from "lucide-react"

// Department-specific FAQ Dictionary (Expanded)
const faqData: Record<string, { q: string; a: string }[]> = {
  engineering: [
    {
      q: "How does Syncora integrate with GitHub/GitLab?",
      a: "Syncora offers deep, native integrations with major version control systems. You can view pull requests, track issue statuses, and trigger CI/CD pipelines directly from your team channels."
    },
    {
      q: "Can we use Syncora for incident management?",
      a: "Absolutely. Syncora allows you to automatically spin up dedicated war rooms for incidents, pipe in alerts from PagerDuty or Datadog, and log post-mortem action items all in one place."
    },
    {
      q: "Is there support for custom webhooks and bots?",
      a: "Yes! Our developer platform lets you build custom slash commands, interactive bots, and incoming webhooks to automate your engineering team's unique workflows."
    },
    {
      q: "How does Syncora handle code snippets?",
      a: "Syncora features rich code formatting with syntax highlighting for over 100 languages, making it easy to review code snippets right in your chat."
    },
    {
      q: "How do we run daily standups?",
      a: "Syncora has built-in asynchronous standup workflows. Team members are automatically prompted to share their updates, which are compiled into a single thread."
    },
    {
      q: "Can we track bugs directly in Syncora?",
      a: "Yes, you can create, update, and resolve tickets natively via our Jira, Linear, or GitHub Issues integrations without leaving the app."
    },
    {
      q: "Does it support code search across repositories?",
      a: "Our advanced universal search lets you find code snippets, pull request discussions, and documentation simultaneously."
    }
  ],
  it: [
    {
      q: "Does Syncora support Enterprise Key Management (EKM)?",
      a: "Yes, Syncora Enterprise offers EKM, allowing you to control your own encryption keys for maximum data security and compliance."
    },
    {
      q: "How easy is it to provision new users?",
      a: "Very easy. We integrate seamlessly with SCIM and major identity providers like Okta, Azure AD, and Google Workspace for automated onboarding and offboarding."
    },
    {
      q: "Can we enforce SSO and 2FA?",
      a: "Yes, you can mandate Single Sign-On (SSO) and Two-Factor Authentication (2FA) across your entire organization to ensure strict access control."
    },
    {
      q: "What admin controls are available?",
      a: "IT admins get granular controls over workspace settings, app integrations, file sharing policies, and guest access permissions."
    },
    {
      q: "How does Syncora help with helpdesk ticketing?",
      a: "You can route IT requests directly to a triage channel and use message actions to instantly convert them into Jira Service Desk or ServiceNow tickets."
    },
    {
      q: "Is there a centralized dashboard for app usage?",
      a: "Yes, IT admins have full visibility into which apps and integrations are being used, and can approve or block third-party applications workspace-wide."
    },
    {
      q: "Can we restrict file sharing outside the organization?",
      a: "Data Loss Prevention (DLP) tools can be configured to scan and block the sharing of sensitive documents and credit card numbers."
    }
  ],
  sales: [
    {
      q: "How does Syncora connect with our CRM (e.g., Salesforce)?",
      a: "Our native CRM integrations allow you to pull customer data, update deal stages, and receive alerts about closed-won opportunities without ever leaving Syncora."
    },
    {
      q: "Can we invite external clients to our workspace?",
      a: "Yes, Syncora Connect lets you securely invite external partners, vendors, or clients into dedicated channels to collaborate on deals and projects."
    },
    {
      q: "How does Syncora speed up the sales cycle?",
      a: "By centralizing deal desks, legal reviews, and pricing approvals into specific channels, reps spend less time hunting down information and more time selling."
    },
    {
      q: "How do we celebrate closed deals?",
      a: "You can set up automated workflows that trigger a celebration message in the #sales-wins channel whenever a deal is moved to Closed-Won in your CRM."
    },
    {
      q: "Can sales engineers collaborate easily on technical questions?",
      a: "Yes, sales reps can easily tag engineers in cross-functional deal rooms to get technical questions answered quickly to unblock deals."
    },
    {
      q: "Does Syncora integrate with Gong or Chorus?",
      a: "Yes, call recordings, transcripts, and insights can be automatically posted to account-specific channels for managers to review."
    }
  ],
  "customer-service": [
    {
      q: "Can Syncora integrate with Zendesk or Intercom?",
      a: "Yes, support agents can receive, claim, and reply to customer tickets directly within Syncora using our robust ticketing integrations."
    },
    {
      q: "How does swarming work in Syncora?",
      a: "When a complex ticket arrives, agents can easily tag engineers or product managers into a thread to 'swarm' the issue and solve it rapidly."
    },
    {
      q: "Is there a way to build a knowledge base?",
      a: "Yes, Syncora Canvas allows your team to document standard operating procedures and FAQs right inside your workspace, making onboarding new agents a breeze."
    },
    {
      q: "How do we measure customer satisfaction (CSAT)?",
      a: "CSAT scores and survey results can be piped directly into a dedicated Syncora channel for the team to review and celebrate."
    },
    {
      q: "Can we set up automated responses?",
      a: "You can use Workflow Builder to create automated responses for common inquiries during off-hours, or route requests based on urgency."
    },
    {
      q: "Does it connect with our phone system?",
      a: "Syncora integrates with Aircall, Zoom Phone, and other VOIP providers to log calls and voicemails directly in team channels."
    }
  ],
  "project-management": [
    {
      q: "Can I track task dependencies in Syncora?",
      a: "While Syncora is primarily a collaboration hub, integrations with tools like Jira, Asana, and Linear allow you to track complex dependencies directly from your chat."
    },
    {
      q: "How do status updates work?",
      a: "You can automate daily stand-ups and weekly status reports using Workflow Builder, collecting updates from your team asynchronously."
    },
    {
      q: "Can we share project timelines with stakeholders?",
      a: "Yes, you can create dedicated channels for stakeholders and use Syncora Canvas to pin project roadmaps and milestone trackers for everyone to see."
    },
    {
      q: "How do we handle resource allocation?",
      a: "Integrations with Resource Management tools allow you to view team capacity, schedule PTO, and assign tasks right within Syncora."
    },
    {
      q: "Can we automate task reminders?",
      a: "Absolutely. You can set up automated reminders for approaching deadlines or overdue tasks to keep the project on schedule."
    },
    {
      q: "Is it possible to create Gantt charts?",
      a: "While Syncora is chat-first, you can embed live Gantt charts and Kanban boards from Asana or Monday.com directly into Syncora Canvas."
    }
  ],
  marketing: [
    {
      q: "How can marketing agencies use Syncora?",
      a: "Agencies use Syncora Connect to create shared channels with their clients, allowing for real-time feedback on assets, campaigns, and approvals."
    },
    {
      q: "Does Syncora integrate with social media tools?",
      a: "Yes, you can pipe social listening alerts, campaign metrics, and content approvals directly into your marketing channels."
    },
    {
      q: "Can we collaborate on design assets?",
      a: "Absolutely. Integrations with Figma and Adobe Creative Cloud let you preview designs and leave comments directly in Syncora."
    },
    {
      q: "How do we manage editorial calendars?",
      a: "You can sync your content calendar from Notion or Trello directly into a dedicated #content channel to keep writers and editors aligned."
    },
    {
      q: "Can we track website traffic in Syncora?",
      a: "Yes, Google Analytics integrations can send daily or weekly traffic summaries directly to your team so you never miss a trend."
    },
    {
      q: "How do we handle PR approvals?",
      a: "Create a private channel for PR reviews, where legal and executive stakeholders can approve press releases before they go live."
    }
  ],
  "human-resources": [
    {
      q: "How does Syncora improve employee onboarding?",
      a: "You can automate the onboarding process using Workflow Builder to send welcome messages, collect required documents, and introduce new hires to their team."
    },
    {
      q: "Can we run employee engagement surveys?",
      a: "Yes, you can use built-in polling apps or integrate with platforms like Lattice and Culture Amp to gauge employee sentiment directly."
    },
    {
      q: "Is there a way to handle confidential HR issues?",
      a: "Private channels and direct messages ensure that sensitive conversations regarding payroll, performance, or HR disputes remain strictly confidential."
    },
    {
      q: "How do we manage time off requests?",
      a: "Employees can request PTO directly in Syncora using the Workday or BambooHR integration, and managers can approve them with one click."
    },
    {
      q: "Can we use Syncora for performance reviews?",
      a: "Yes, managers and direct reports can use private channels and Canvas to document 1-on-1s, set performance goals, and track progress."
    },
    {
      q: "How do we announce company-wide news?",
      a: "The #announcements channel can be restricted so only HR and Leadership can post, ensuring important news isn't lost in the chatter."
    }
  ],
  security: [
    {
      q: "How does Syncora help with incident response?",
      a: "Security teams use Syncora to automate incident workflows, integrating with SIEM tools to alert the team and establish command-center channels instantly."
    },
    {
      q: "What compliance standards does Syncora meet?",
      a: "Syncora Enterprise is designed to support major compliance frameworks including SOC 2, HIPAA, GDPR, and ISO 27001."
    },
    {
      q: "Can we monitor workspace activity for threats?",
      a: "Yes, the Audit Logs API allows you to monitor all workspace activity and integrate with your existing DLP and eDiscovery solutions."
    },
    {
      q: "Does Syncora provide eDiscovery capabilities?",
      a: "Yes, Syncora Enterprise provides full eDiscovery support for legal holds, data retention policies, and compliance exports."
    },
    {
      q: "How are external guests authenticated?",
      a: "Guest accounts can be subject to the exact same SSO and Multi-Factor Authentication (MFA) requirements as internal employees."
    },
    {
      q: "Can we run phishing simulations?",
      a: "Security teams can integrate phishing simulation tools to report on employee training results and alert the team of active campaigns."
    }
  ]
}

// Pre-generated scales to avoid React hydration mismatches from Math.random()
const scales = [
  0.54, 0.45, 0.47, 0.34, 0.68, 0.30, 
  0.54, 0.24, 0.69, 0.29, 0.58, 0.38, 
  0.37, 0.32, 0.27, 0.51, 0.41, 0.60, 
  0.52, 0.60, 0.64, 0.66, 0.54, 0.31, 
  0.27, 0.64, 0.20, 0.31, 0.44, 0.69, 
  0.28, 0.57, 0.62, 0.56, 0.32, 0.31
]

// Visual mappings for each department
const visualMap: Record<string, {
  Icon: any;
  color1: string;
  color2: string;
  color3: string;
}> = {
  engineering: { Icon: Code2, color1: 'bg-blue-500', color2: 'bg-purple-500', color3: 'bg-indigo-500' },
  it: { Icon: MonitorSmartphone, color1: 'bg-green-500', color2: 'bg-emerald-500', color3: 'bg-teal-500' },
  sales: { Icon: Banknote, color1: 'bg-amber-500', color2: 'bg-orange-500', color3: 'bg-red-500' },
  "customer-service": { Icon: Headset, color1: 'bg-rose-500', color2: 'bg-pink-500', color3: 'bg-fuchsia-500' },
  "project-management": { Icon: ClipboardList, color1: 'bg-indigo-500', color2: 'bg-violet-500', color3: 'bg-purple-500' },
  marketing: { Icon: Megaphone, color1: 'bg-fuchsia-500', color2: 'bg-purple-500', color3: 'bg-pink-500' },
  "human-resources": { Icon: UserPlus, color1: 'bg-teal-500', color2: 'bg-cyan-500', color3: 'bg-blue-500' },
  security: { Icon: ShieldAlert, color1: 'bg-slate-400', color2: 'bg-emerald-600', color3: 'bg-teal-600' }
}

interface DepartmentFAQProps {
  department: string
}

export function DepartmentFAQ({ department }: DepartmentFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  
  // Fallbacks
  const faqs = faqData[department] || faqData.engineering
  const visual = visualMap[department] || visualMap.engineering

  const formattedDeptName = department
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const Icon = visual.Icon

  return (
    <section className="py-24 bg-background relative overflow-hidden border-t border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          
          {/* Left Side: Sticky Title and Design */}
          <div className="lg:sticky lg:top-32 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <MessageCircleQuestion className="size-4" />
              <span>FAQ</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              Still have questions? We have answers. Explore how Syncora can specifically help your {formattedDeptName} team work better.
            </p>

            {/* Premium 3D Glassmorphism Art */}
            <div className="relative w-full max-w-sm aspect-square mt-12 hidden lg:block rounded-3xl overflow-hidden border border-white/10 bg-zinc-950/50 shadow-2xl">
              
              {/* Dynamic Mesh Background */}
              <div className="absolute inset-0 opacity-40 mix-blend-screen">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -20, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className={`absolute top-0 -left-10 w-64 h-64 ${visual.color1} rounded-full blur-3xl opacity-60`} 
                />
                <motion.div 
                  animate={{ scale: [1, 1.3, 1], x: [0, -20, 0], y: [0, 20, 0] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className={`absolute top-0 -right-10 w-64 h-64 ${visual.color2} rounded-full blur-3xl opacity-60`} 
                />
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, 30, 0] }}
                  transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  className={`absolute -bottom-10 left-20 w-64 h-64 ${visual.color3} rounded-full blur-3xl opacity-60`} 
                />
              </div>

              {/* 3D Glassmorphism Composition */}
              <div className="absolute inset-0 z-10 w-full h-full" style={{ perspective: '1000px' }}>
                
                {/* Background Decorative Rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'rotateX(60deg) rotateZ(-45deg)', transformStyle: 'preserve-3d' }}>
                   <div className="w-[120%] h-[120%] rounded-full border border-white/5 absolute" />
                   <div className="w-[90%] h-[90%] rounded-full border border-white/10 absolute" />
                   <div className="w-[60%] h-[60%] rounded-full border border-white/5 absolute" />
                </div>
                
                {/* Main Floating Card */}
                <motion.div 
                  animate={{ y: [-10, 10, -10] }} 
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-48 h-56 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center justify-center p-6"
                >
                   <div className="size-20 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center shadow-inner mb-6 text-white">
                      <Icon className="size-10 drop-shadow-md" />
                   </div>
                   <div className="w-full space-y-3">
                     <div className="h-3 w-3/4 bg-white/20 rounded-full mx-auto" />
                     <div className="h-3 w-1/2 bg-white/10 rounded-full mx-auto" />
                     <div className="h-3 w-2/3 bg-white/10 rounded-full mx-auto" />
                   </div>
                </motion.div>

                {/* Floating Chat Bubble 1 (Question) */}
                <motion.div 
                  animate={{ y: [-15, 5, -15], x: [0, 5, 0] }} 
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute top-[15%] right-[10%] z-30 w-16 h-16 rounded-2xl rounded-tr-none bg-indigo-500/80 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center"
                >
                  <MessageCircleQuestion className="size-8 text-white" />
                </motion.div>

                {/* Floating Chat Bubble 2 (Answer) */}
                <motion.div 
                  animate={{ y: [10, -10, 10], x: [0, -5, 0] }} 
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                  className="absolute bottom-[20%] left-[10%] z-30 w-20 h-14 rounded-2xl rounded-bl-none bg-emerald-500/80 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center"
                >
                   <div className="flex gap-1.5">
                     <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-2 h-2 rounded-full bg-white" />
                     <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 rounded-full bg-white" />
                     <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 rounded-full bg-white" />
                   </div>
                </motion.div>
                
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index
              return (
                <div 
                  key={index}
                  className={`rounded-2xl border transition-colors duration-300 overflow-hidden ${
                    isOpen ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:border-border bg-transparent'
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  >
                    <h3 className={`text-lg font-semibold pr-8 transition-colors ${isOpen ? 'text-primary' : 'text-foreground'}`}>
                      {faq.q}
                    </h3>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center border transition-colors ${
                        isOpen ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border'
                      }`}
                    >
                      <ChevronDown className="size-4" />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-6 pb-6 pt-0 text-muted-foreground leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
