import { SolutionHero } from "@/components/marketing/SolutionHero"
import { FinalCTA } from "@/components/marketing/FinalCTA"
import { ValueProposition } from "@/components/marketing/ValueProposition"
import { SocialProof } from "@/components/marketing/SocialProof"
import { DepartmentFeatures } from "@/components/marketing/DepartmentFeatures"
import { DepartmentUseCases } from "@/components/marketing/DepartmentUseCases"
import { DepartmentFAQ } from "@/components/marketing/DepartmentFAQ"
import { notFound } from "next/navigation"
import { 
  Code2, MessageSquare, Rocket, CheckSquare, 
  Users, Lightbulb, Banknote, FileText, 
  PhoneCall, Headset, HeartHandshake, Smile,
  MonitorSmartphone, Shield, Settings, Cloud,
  ClipboardList, Calendar, Megaphone, TrendingUp, PenTool, UserPlus, Heart, ShieldAlert, Lock, Key, CheckCircle
} from "lucide-react"

// Define the static paths
export function generateStaticParams() {
  return [
    { department: 'engineering' },
    { department: 'it' },
    { department: 'customer-service' },
    { department: 'sales' },
    { department: 'project-management' },
    { department: 'marketing' },
    { department: 'human-resources' },
    { department: 'security' },
  ]
}

const departmentData = {
  engineering: {
    preHeading: "ENGINEERING",
    heading: "Engineering moves faster in Syncora",
    subtitle: "Deliver better code in less time by bringing your tools, teammates and code changes together in Syncora.",
    themeColor: "purple" as const,
    illustration: (
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        {/* Abstract UI representation */}
        <div className="w-[85%] h-[80%] bg-primary/90 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden flex shadow-primary/20">
          <div className="w-16 md:w-24 bg-primary h-full border-r border-white/10 p-4 flex flex-col gap-4">
            <div className="w-8 h-4 bg-white/20 rounded-full" />
            <div className="w-full h-3 bg-white/10 rounded-full mt-4" />
            <div className="w-3/4 h-3 bg-white/10 rounded-full" />
          </div>
          <div className="flex-1 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4">
            <div className="w-1/3 h-6 bg-muted rounded-md" />
            <div className="flex-1 rounded-md border border-border/50 bg-muted/20 relative overflow-hidden">
               {/* Dummy code block */}
               <div className="p-4 space-y-2 opacity-50">
                 <div className="h-3 w-1/2 bg-blue-500/20 rounded" />
                 <div className="h-3 w-3/4 bg-purple-500/20 rounded" />
                 <div className="h-3 w-1/3 bg-green-500/20 rounded" />
               </div>
            </div>
          </div>
        </div>
        {/* Floating Icons */}
        <div className="absolute top-[10%] left-[5%] size-12 md:size-16 rounded-full bg-blue-500 shadow-xl flex items-center justify-center text-white rotate-[-10deg]">
          <Code2 className="size-6 md:size-8" />
        </div>
        <div className="absolute top-[20%] right-[10%] size-12 md:size-16 rounded-full bg-emerald-500 shadow-xl flex items-center justify-center text-white rotate-[15deg]">
          <MessageSquare className="size-6 md:size-8" />
        </div>
        <div className="absolute bottom-[25%] left-[2%] size-12 md:size-16 rounded-full bg-pink-500 shadow-xl flex items-center justify-center text-white rotate-[5deg]">
          <Rocket className="size-6 md:size-8" />
        </div>
        <div className="absolute bottom-[10%] right-[15%] size-12 md:size-16 rounded-full bg-amber-500 shadow-xl flex items-center justify-center text-white rotate-[-5deg]">
          <CheckSquare className="size-6 md:size-8" />
        </div>
      </div>
    )
  },
  sales: {
    preHeading: "SYNCORA FOR SALES TEAMS",
    heading: "Big wins, faster than ever",
    subtitle: "Grow revenue more efficiently. Syncora unites your people with their customers, tools and data so that they can accelerate deals in a major way.",
    themeColor: "purple" as const,
    illustration: (
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        <div className="w-[85%] h-[80%] bg-primary/90 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden flex shadow-primary/20">
          <div className="w-16 md:w-24 bg-primary h-full border-r border-white/10 p-4 flex flex-col items-center gap-6 pt-8">
            <Settings className="size-6 text-white/70" />
            <div className="w-8 h-4 bg-white/20 rounded-full" />
            <div className="w-full h-3 bg-white/10 rounded-full mt-4" />
          </div>
          <div className="flex-1 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4">
             <div className="flex gap-4">
               <div className="w-1/2 h-20 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800 p-3">
                  <div className="h-4 w-12 bg-green-500/30 rounded mb-2" />
                  <div className="h-6 w-24 bg-green-600/40 rounded" />
               </div>
               <div className="w-1/2 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
                  <div className="h-4 w-12 bg-blue-500/30 rounded mb-2" />
                  <div className="h-6 w-24 bg-blue-600/40 rounded" />
               </div>
             </div>
             <div className="flex-1 rounded-md border border-border/50 bg-muted/20 mt-2" />
          </div>
        </div>
        {/* Floating Icons */}
        <div className="absolute top-[15%] left-[8%] size-12 md:size-16 rounded-full bg-rose-500 shadow-xl flex items-center justify-center text-white rotate-[-8deg]">
          <Users className="size-6 md:size-8" />
        </div>
        <div className="absolute top-[25%] right-[5%] size-12 md:size-16 rounded-full bg-cyan-500 shadow-xl flex items-center justify-center text-white rotate-[12deg]">
          <Lightbulb className="size-6 md:size-8" />
        </div>
        <div className="absolute bottom-[20%] left-[5%] size-12 md:size-16 rounded-full bg-amber-500 shadow-xl flex items-center justify-center text-white rotate-[6deg]">
          <Banknote className="size-6 md:size-8" />
        </div>
        <div className="absolute bottom-[12%] right-[12%] size-12 md:size-16 rounded-full bg-emerald-500 shadow-xl flex items-center justify-center text-white rotate-[-10deg]">
          <FileText className="size-6 md:size-8" />
        </div>
      </div>
    )
  },
  "customer-service": {
    preHeading: "SYNCORA FOR CUSTOMER SERVICE",
    heading: "Make customer service simple and productive",
    subtitle: "Deliver standout customer service by putting the experts, tools and information that your agents need at their fingertips.",
    themeColor: "purple" as const,
    illustration: (
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        {/* Laptop illustration */}
        <div className="relative w-[85%] h-[75%] mt-8 bg-zinc-800 dark:bg-black rounded-t-xl shadow-2xl border-4 border-zinc-700 dark:border-zinc-800 flex flex-col overflow-visible">
          <div className="flex-1 bg-white dark:bg-zinc-900 flex overflow-hidden">
             {/* App sidebar */}
             <div className="w-16 bg-primary h-full flex flex-col items-center gap-6 pt-8">
               <Headset className="size-6 text-white/70" />
             </div>
             <div className="flex-1 p-4 relative">
                {/* Chat bubbles */}
                <div className="w-2/3 h-8 bg-muted rounded-r-xl rounded-tl-xl mb-4" />
                <div className="w-1/2 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-l-xl rounded-tr-xl ml-auto" />
                
                {/* High five hands coming out */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 flex justify-center items-end opacity-90 drop-shadow-2xl">
                   <HeartHandshake className="size-32 text-orange-500 rotate-[-15deg] absolute -ml-10" />
                   <Smile className="size-24 text-yellow-500 rotate-[15deg] absolute ml-10 mb-4" fill="currentColor" />
                </div>
             </div>
          </div>
          {/* Laptop base */}
          <div className="h-4 w-[110%] -ml-[5%] bg-zinc-300 dark:bg-zinc-700 rounded-b-xl shadow-md absolute -bottom-4" />
        </div>
        
        <div className="absolute top-[10%] left-[10%] size-10 rounded-full bg-blue-500 flex items-center justify-center text-white rotate-[-10deg]">
          <PhoneCall className="size-5" />
        </div>
        <div className="absolute top-[30%] right-[10%] size-12 rounded-full bg-purple-500 flex items-center justify-center text-white rotate-[15deg]">
          <Headset className="size-6" />
        </div>
      </div>
    )
  },
  it: {
    preHeading: "INFORMATION TECHNOLOGY",
    heading: "Uncover the full potential of your IT teams and tools",
    subtitle: "Syncora puts your people and your tech stack into a single place, so they all work better together across the organisation.",
    themeColor: "purple" as const,
    illustration: (
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        {/* Isometric/Floating tech elements */}
        <div className="relative w-[80%] h-[70%]">
          {/* Main laptop/screen */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border-2 border-green-600 flex items-center justify-center z-10">
            <MonitorSmartphone className="size-16 text-green-600" />
          </div>
          
          {/* Connecting nodes */}
          <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" style={{strokeDasharray: "4 4"}}>
             <path d="M 50 100 Q 150 50 200 150" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300 dark:text-zinc-700" />
             <path d="M 300 80 Q 250 150 200 150" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300 dark:text-zinc-700" />
             <path d="M 80 250 Q 150 250 200 150" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300 dark:text-zinc-700" />
             <path d="M 320 220 Q 250 250 200 150" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300 dark:text-zinc-700" />
          </svg>
          
          {/* Floating icons */}
          <div className="absolute top-0 left-0 size-16 bg-amber-400 rounded-lg shadow-lg flex items-center justify-center rotate-12 z-20">
            <Users className="size-8 text-white" />
          </div>
          
          <div className="absolute top-[10%] right-0 size-14 bg-green-500 rounded-lg shadow-lg flex items-center justify-center -rotate-6 z-20">
            <Shield className="size-7 text-white" />
          </div>
          
          <div className="absolute bottom-[10%] left-[10%] size-12 bg-blue-500 rounded-lg shadow-lg flex items-center justify-center rotate-[-15deg] z-20">
            <Settings className="size-6 text-white" />
          </div>
          
          <div className="absolute bottom-0 right-[15%] size-16 bg-amber-500 rounded-lg shadow-lg flex items-center justify-center rotate-12 z-20">
            <Cloud className="size-8 text-white" />
          </div>
        </div>
      </div>
    )
  },
  "project-management": {
    preHeading: "PROJECT MANAGEMENT",
    heading: "Project management, directly in Syncora",
    subtitle: "Project management in Syncora means that you can manage your entire team's work from start to finish, directly where you're already working.",
    themeColor: "purple" as const,
    illustration: (
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        <div className="w-[85%] h-[80%] bg-primary/90 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden flex shadow-primary/20">
          <div className="w-16 md:w-24 bg-primary h-full border-r border-white/10 p-4 flex flex-col items-center gap-4 pt-8">
            <ClipboardList className="size-6 text-white/70" />
            <div className="w-8 h-4 bg-white/20 rounded-full" />
            <div className="w-full h-3 bg-white/10 rounded-full" />
          </div>
          <div className="flex-1 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4">
             <div className="w-2/3 h-6 bg-muted rounded-md" />
             <div className="w-full h-12 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-800 flex items-center px-4 gap-3">
               <div className="size-4 rounded-full bg-amber-500" />
               <div className="h-3 w-1/2 bg-amber-600/40 rounded" />
             </div>
             <div className="w-full h-12 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 flex items-center px-4 gap-3">
               <div className="size-4 rounded-full bg-blue-500" />
               <div className="h-3 w-3/4 bg-blue-600/40 rounded" />
             </div>
          </div>
        </div>
        <div className="absolute top-[10%] left-[5%] size-12 rounded-full bg-indigo-500 flex items-center justify-center text-white rotate-[-10deg]">
          <CheckCircle className="size-6" />
        </div>
        <div className="absolute bottom-[20%] right-[10%] size-14 rounded-full bg-rose-500 flex items-center justify-center text-white rotate-[15deg]">
          <Calendar className="size-7" />
        </div>
      </div>
    )
  },
  "marketing": {
    preHeading: "SYNCORA FOR MARKETING",
    heading: "Work smarter, get to market faster",
    subtitle: "Bring everyone together with the people, partners and tools that they need in Syncora.",
    themeColor: "purple" as const,
    illustration: (
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        <div className="w-[85%] h-[80%] bg-primary/90 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden flex shadow-primary/20">
          <div className="w-16 md:w-24 bg-primary h-full border-r border-white/10 p-4 flex flex-col items-center gap-4 pt-8">
            <Megaphone className="size-6 text-white/70" />
            <div className="w-8 h-4 bg-white/20 rounded-full" />
            <div className="w-full h-3 bg-white/10 rounded-full" />
          </div>
          <div className="flex-1 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4">
             <div className="w-1/2 h-40 bg-muted/50 rounded-lg border border-border/50 relative overflow-hidden">
               <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-fuchsia-500/20 to-transparent" />
               <TrendingUp className="absolute bottom-4 right-4 size-12 text-fuchsia-500/50" />
             </div>
          </div>
        </div>
        <div className="absolute top-[15%] right-[15%] size-14 rounded-full bg-fuchsia-500 flex items-center justify-center text-white rotate-[10deg]">
          <PenTool className="size-7" />
        </div>
        <div className="absolute bottom-[15%] left-[10%] size-12 rounded-full bg-violet-500 flex items-center justify-center text-white rotate-[-15deg]">
          <Megaphone className="size-6" />
        </div>
      </div>
    )
  },
  "human-resources": {
    preHeading: "HUMAN RESOURCES",
    heading: "Bring your HR tools and team together",
    subtitle: "From remarkable recruiting to collaborative company culture, great human resourcing happens in Syncora.",
    themeColor: "purple" as const,
    illustration: (
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        <div className="w-[85%] h-[80%] bg-primary/90 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden flex shadow-primary/20">
          <div className="w-16 md:w-24 bg-primary h-full border-r border-white/10 p-4 flex flex-col items-center gap-4 pt-8">
            <UserPlus className="size-6 text-white/70" />
            <div className="w-8 h-4 bg-white/20 rounded-full" />
            <div className="w-full h-3 bg-white/10 rounded-full" />
          </div>
          <div className="flex-1 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4">
             <div className="w-full h-16 bg-rose-100 dark:bg-rose-900/30 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center px-4 gap-4">
               <div className="size-10 rounded-full bg-rose-500 flex items-center justify-center">
                 <Heart className="size-5 text-white" />
               </div>
               <div className="flex-1">
                 <div className="h-3 w-1/3 bg-rose-600/40 rounded mb-2" />
                 <div className="h-2 w-1/4 bg-rose-600/20 rounded" />
               </div>
             </div>
          </div>
        </div>
        <div className="absolute top-[20%] left-[8%] size-14 rounded-full bg-rose-500 flex items-center justify-center text-white rotate-[-8deg]">
          <Smile className="size-7" fill="currentColor" />
        </div>
        <div className="absolute bottom-[25%] right-[8%] size-12 rounded-full bg-pink-500 flex items-center justify-center text-white rotate-[12deg]">
          <UserPlus className="size-6" />
        </div>
      </div>
    )
  },
  "security": {
    preHeading: "SECURITY",
    heading: "Coordinate your security in Syncora",
    subtitle: "Syncora is the central place where your team can collaborate securely, safeguard data and resolve incidents quickly.",
    themeColor: "purple" as const,
    illustration: (
      <div className="relative w-full h-full p-8 flex items-center justify-center">
        <div className="w-[85%] h-[80%] bg-primary/90 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden flex shadow-primary/20">
          <div className="w-16 md:w-24 bg-primary h-full border-r border-white/10 p-4 flex flex-col items-center gap-4 pt-8">
            <ShieldAlert className="size-6 text-white/70" />
            <div className="w-8 h-4 bg-white/20 rounded-full" />
            <div className="w-full h-3 bg-white/10 rounded-full" />
          </div>
          <div className="flex-1 bg-zinc-900 p-6 flex flex-col gap-4 justify-center items-center relative overflow-hidden">
             <div className="size-24 rounded-full border-4 border-emerald-500/30 flex items-center justify-center relative">
               <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse" />
               <Lock className="size-10 text-emerald-400" />
             </div>
             <div className="h-3 w-1/3 bg-emerald-500/40 rounded mt-2" />
          </div>
        </div>
        <div className="absolute top-[12%] right-[10%] size-14 rounded-full bg-slate-700 flex items-center justify-center text-white rotate-[15deg] border-2 border-emerald-500/50">
          <Key className="size-7 text-emerald-400" />
        </div>
        <div className="absolute bottom-[15%] left-[5%] size-12 rounded-full bg-slate-700 flex items-center justify-center text-white rotate-[-15deg] border-2 border-emerald-500/50">
          <ShieldAlert className="size-6 text-emerald-400" />
        </div>
      </div>
    )
  }
}

export default async function DepartmentSolutionPage({ params }: { params: Promise<{ department: string }> }) {
  const resolvedParams = await params
  const data = departmentData[resolvedParams.department as keyof typeof departmentData]
  
  if (!data) {
    notFound()
  }

  return (
    <main className="flex-1">
      <SolutionHero
        preHeading={data.preHeading}
        heading={data.heading}
        subtitle={data.subtitle}
        themeColor={data.themeColor}
        illustration={data.illustration}
      />
      
      <div className="bg-background">
        <SocialProof />
      </div>
      
      <DepartmentFeatures department={resolvedParams.department} />
      
      <DepartmentUseCases department={resolvedParams.department} />
      
      <ValueProposition />
      
      <DepartmentFAQ department={resolvedParams.department} />
      
      <FinalCTA />
    </main>
  )
}
