"use client"

import * as React from "react"
import { Check, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { toast } from "sonner"

export function UpgradePlanDialog() {
  const [open, setOpen] = React.useState(false)

  const handleSelectPlan = (planName: string) => {
    setOpen(false)
    toast.info(`Billing portal integration required for ${planName} plan.`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="h-9 px-3 hidden sm:flex text-sm font-medium bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary">See plans</Button>} />
      <DialogContent className="sm:max-w-4xl p-0 overflow-y-auto max-h-[90vh] bg-background">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-6 bg-primary rounded-md flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              SYNCORA
            </span>
          </div>
          <DialogTitle className="text-2xl font-bold">Choose the right plan for your team</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Congrats - we've given you Premium access with all our best features to get started. Your trial ends on 5 October 2026. Choose a plan by then, or you'll be auto-downgraded to Free. <a href="#" className="text-primary hover:underline">Learn more about your features</a>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="flex flex-col rounded-xl border border-border p-6 relative">
            <h3 className="text-2xl font-bold">Free</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6 h-10">
              For individuals or teams learning the SYNCORA basics
            </p>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-sm text-muted-foreground">per user / month</span>
            </div>
            <Button variant="outline" className="w-full mb-8" onClick={() => handleSelectPlan('Free')}>Select Free</Button>
            
            <div className="space-y-3 flex-1">
              <p className="text-sm font-bold">Free includes:</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Limited to 10 users</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>100 automations / month</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Standard Plan */}
          <div className="flex flex-col rounded-xl border-2 border-primary p-6 relative shadow-sm">
            <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider text-center py-1 rounded-t-lg -mt-[2px] -mx-[2px]">
              Recommended
            </div>
            <h3 className="text-2xl font-bold mt-4">Standard</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6 h-10">
              For small & growing teams needing better control and automation
            </p>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-3xl font-bold">$6.70</span>
              <span className="text-sm text-muted-foreground">per user / month</span>
            </div>
            <Button variant="default" className="w-full mb-8 bg-blue-600 hover:bg-blue-700 text-white">Buy Standard</Button>
            
            <div className="space-y-3 flex-1">
              <p className="text-sm font-bold">Get everything in Free, plus:</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Unlimited users</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Page permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Page insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Advanced workflows</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>1,000 automations / month</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="flex flex-col rounded-xl border border-border p-6 relative">
            <h3 className="text-2xl font-bold">Premium</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6 h-10">
              For alignment & planning across teams and AI-powered productivity
            </p>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-3xl font-bold">$13.20</span>
              <span className="text-sm text-muted-foreground">per user / month</span>
            </div>
            <Button className="w-full mb-8" onClick={() => handleSelectPlan('Premium')}>Upgrade to Premium</Button>
            
            <div className="space-y-3 flex-1">
              <p className="text-sm font-bold">Get everything in Standard, plus:</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Analytics & Mission control</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Team calendars</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>AI-powered productivity</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Unlimited automations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>24/7 Enterprise support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>Single Sign-On (SSO)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
