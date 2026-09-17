"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Activity, Lightbulb, Link as LinkIcon, Settings, ShieldAlert, Key, Clock, FileText, BarChart, ShieldCheck } from "lucide-react"

export default function AdminPage() {
  const adminFeatures = [
    { title: "Mission control", description: "High-level overview of system health and metrics.", icon: Activity },
    { title: "Suggestions", description: "AI-driven suggestions to optimize workspace usage.", icon: Lightbulb },
    { title: "External access features", description: "Manage guest access and external sharing permissions.", icon: LinkIcon },
    { title: "Syncora admin", description: "Core platform settings and configurations.", icon: Settings },
    { title: "Admin features", description: "Toggle experimental or premium admin capabilities.", icon: ShieldAlert },
    { title: "Admin access", description: "Manage which users have global administrative rights.", icon: Key },
    { title: "Activity", description: "View a detailed log of all workspace and admin events.", icon: Clock },
    { title: "Content management", description: "Manage global content policies and retention rules.", icon: FileText },
    { title: "Feature usage", description: "Track how often features are used across the organization.", icon: BarChart },
    { title: "Security", description: "Configure SSO, 2FA enforcement, and security policies.", icon: ShieldCheck },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-muted/10">
      <header className="flex shrink-0 h-14 items-center gap-4 border-b bg-background px-6">
        <h1 className="text-lg font-semibold">Global Administration</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="text-muted-foreground mt-2">
              Manage your Syncora platform settings, security, and usage metrics.
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {adminFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="hover:border-primary/50 cursor-pointer transition-colors bg-card">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
