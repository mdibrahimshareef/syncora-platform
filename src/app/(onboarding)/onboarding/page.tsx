"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"
import { useOrganizationStore } from "@/stores/organizationStore"
import { inviteMember } from "@/lib/api/workspaces"
import type { Tables } from "@/types/supabase"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"

const onboardingSchema = z.object({
  // Step 1: Organization
  orgName: z.string().min(2, "Organization name must be at least 2 characters."),
  orgSlug: z
    .string()
    .min(2, "Organization slug must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  orgType: z.string().min(1, "Please select an organization type."),
  orgPlan: z.string().min(1, "Please select a plan."),

  // Step 2: Workspace
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters."),
  workspaceSlug: z
    .string()
    .min(2, "Workspace slug must be at least 2 characters.")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  teamInvites: z.string().optional(),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

function setOnboardingCookies(orgId: string, workspaceId: string) {
  document.cookie = `SYNCORA_org_id=${orgId}; path=/; max-age=31536000`
  document.cookie = `SYNCORA_workspace_id=${workspaceId}; path=/; max-age=31536000`
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = React.useState<1 | 2>(1)
  const [isLoading, setIsLoading] = React.useState(false)

  const setActiveWorkspaceId = useDataStore((s) => s.setActiveWorkspaceId)
  const setActiveOrganizationId = useOrganizationStore((s) => s.setActiveOrganizationId)

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      orgName: "",
      orgSlug: "",
      orgType: "Personal",
      orgPlan: "Free - $0/month",
      workspaceName: "General",
      workspaceSlug: "general",
      teamInvites: "",
    },
  })

  const orgName = useWatch({ control: form.control, name: "orgName" })
  const orgSlug = useWatch({ control: form.control, name: "orgSlug" })
  const workspaceName = useWatch({ control: form.control, name: "workspaceName" })

  // Auto-generate orgSlug from orgName
  React.useEffect(() => {
    if (orgName) {
      const generatedSlug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
      form.setValue("orgSlug", generatedSlug, { shouldValidate: true })
    }
  }, [orgName, form])

  // Auto-generate workspaceSlug from workspaceName
  React.useEffect(() => {
    if (workspaceName) {
      const generatedSlug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
      form.setValue("workspaceSlug", generatedSlug, { shouldValidate: true })
    }
  }, [workspaceName, form])

  const handleNextStep = async () => {
    const isStep1Valid = await form.trigger(["orgName", "orgSlug", "orgType", "orgPlan"])
    if (isStep1Valid) {
      setStep(2)
    }
  }

  async function onSubmit(values: OnboardingFormValues) {
    setIsLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      toast.error("You must be logged in to create your organization.")
      router.push("/login")
      return
    }

    // 1. Create organization
    let orgData: Tables<"organizations"> | null = null
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: values.orgName,
        slug: values.orgSlug,
        owner_id: userData.user.id,
        type: values.orgType.toLowerCase(),
        plan: values.orgPlan.toLowerCase().includes("pro") ? "pro" : "free",
      })
      .select()
      .single()

    if (orgError) {
      // Graceful fallback if type/plan columns are not present in current DB migration state
      if (orgError.code === "42703" || orgError.message?.includes("column")) {
        const { data: fallbackOrg, error: fallbackError } = await supabase
          .from("organizations")
          .insert({
            name: values.orgName,
            slug: values.orgSlug,
            owner_id: userData.user.id,
          })
          .select()
          .single()

        if (fallbackError) {
          setIsLoading(false)
          toast.error("Failed to create organization: " + fallbackError.message)
          return
        }
        orgData = fallbackOrg
      } else if (orgError.code === "23505") {
        setIsLoading(false)
        toast.error("This organization URL is already taken. Please choose another one.")
        setStep(1)
        return
      } else {
        setIsLoading(false)
        toast.error("Failed to create organization: " + orgError.message)
        return
      }
    } else {
      orgData = org
    }

    if (!orgData) {
      setIsLoading(false)
      toast.error("Failed to create organization: No data returned")
      return
    }

    // 2. Insert organization member (Owner)
    const { error: orgMemberError } = await supabase
      .from("organization_members")
      .insert({
        org_id: orgData.id,
        user_id: userData.user.id,
        role: "owner",
      })

    if (orgMemberError) {
      setIsLoading(false)
      toast.error("Failed to set organization permissions: " + orgMemberError.message)
      return
    }

    // 3. Insert initial workspace linked to organization
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        name: values.workspaceName,
        slug: values.workspaceSlug,
        created_by: userData.user.id,
        organization_id: orgData.id,
      })
      .select()
      .single()

    if (workspaceError) {
      setIsLoading(false)
      toast.error("Failed to create workspace: " + workspaceError.message)
      return
    }

    // 4. Insert workspace member (Owner)
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: userData.user.id,
        role: "owner",
      })

    if (memberError) {
      setIsLoading(false)
      toast.error("Failed to set workspace permissions: " + memberError.message)
      return
    }

    // 5. Send team invitations if provided
    let invitesCount = 0
    if (values.teamInvites && values.teamInvites.trim().length > 0) {
      const emails = values.teamInvites
        .split(/[,\n]/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

      for (const email of emails) {
        try {
          await inviteMember(supabase, workspace.id, email, "member")
          invitesCount++
        } catch (invErr) {
          console.warn(`Failed to invite ${email}:`, invErr)
        }
      }
    }

    if (invitesCount > 0) {
      toast.success(`Setup complete! Sent ${invitesCount} team invitation${invitesCount > 1 ? "s" : ""}.`)
    } else {
      toast.success("Organization and workspace created successfully!")
    }

    // 6. Update state and cookies
    setActiveOrganizationId(orgData.id)
    setActiveWorkspaceId(workspace.id)
    setOnboardingCookies(orgData.id, workspace.id)

    // 7. Direct routing to team workspace
    router.push(`/${orgData.slug}/team/${workspace.slug}`)
  }

  const currentOrgSlug = orgSlug || "acme-corp"
  const currentOrgName = orgName || "Your Organization"

  return (
    <div className="w-full max-w-[620px] mx-auto">
      <Card className="border border-border/80 shadow-2xl bg-card rounded-xl overflow-hidden">
        {/* Compact Stepper Pill Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold">
              {step}
            </span>
            <span className="font-medium text-muted-foreground">
              Step {step} of 2: {step === 1 ? "Organization Setup" : "First Workspace"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className={`h-1.5 w-6 rounded-full transition-colors ${
                step >= 1 ? "bg-primary" : "bg-muted"
              }`}
            />
            <div
              className={`h-1.5 w-6 rounded-full transition-colors ${
                step >= 2 ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
        </div>

        <CardContent className="p-6 md:p-7">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* STEP 1: ORGANIZATION (Pixel-perfect match to Supabase screenshot) */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Create a new organization
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-normal">
                      Organizations are the top-level home for your workspaces, team members, and billing settings.
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {/* Organization Name */}
                    <FormField
                      control={form.control}
                      name="orgName"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">
                            Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Organization name"
                              disabled={isLoading}
                              {...field}
                              className="h-9 text-sm bg-background border-input"
                            />
                          </FormControl>
                          <div className="flex items-center justify-between">
                            <FormDescription className="text-[11px] text-muted-foreground">
                              What&apos;s the name of your company or team? You can change this later.
                            </FormDescription>
                            {field.value && (
                              <span className="text-[10px] text-muted-foreground/80 font-mono">
                                SYNCORA.app/{currentOrgSlug}
                              </span>
                            )}
                          </div>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {/* Organization Type (Matching Supabase Image 2) */}
                    <FormField
                      control={form.control}
                      name="orgType"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">
                            Type
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm bg-background border-input">
                                <SelectValue placeholder="Personal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Personal">Personal</SelectItem>
                              <SelectItem value="Educational">Educational</SelectItem>
                              <SelectItem value="Startup">Startup</SelectItem>
                              <SelectItem value="Agency">Agency</SelectItem>
                              <SelectItem value="Company">Company</SelectItem>
                              <SelectItem value="N/A">N/A</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[11px] text-muted-foreground">
                            What best describes your organization?
                          </FormDescription>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {/* Plan Selection (Matching Supabase Image 1) */}
                    <FormField
                      control={form.control}
                      name="orgPlan"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">
                            Plan
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm bg-background border-input">
                                <SelectValue placeholder="Free - $0/month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Free - $0/month">Free - $0/month</SelectItem>
                              <SelectItem value="Pro - $19/month">Pro - $19/month</SelectItem>
                              <SelectItem value="Team - $49/month">Team - $49/month</SelectItem>
                              <SelectItem value="Enterprise - Custom">Enterprise - Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[11px] text-muted-foreground">
                            Which plan fits your organization&apos;s needs best? Learn more.
                          </FormDescription>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/login")}
                      disabled={isLoading}
                      className="text-xs h-9 text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNextStep}
                      className="h-9 px-4 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-colors"
                    >
                      Create organization
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: WORKSPACE (With Unclipped URL & Team Invites) */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Create your first workspace
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-normal">
                      Workspaces let you group projects by departments, clients, or initiatives. Think of them as dedicated spaces for your teams.
                    </p>
                  </div>

                  {/* Context Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border border-border/70 rounded-md text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Creating inside: <strong className="text-foreground font-semibold">{currentOrgName}</strong>{" "}
                      <span className="font-mono text-[11px] text-muted-foreground">({currentOrgSlug})</span>
                    </span>
                  </div>

                  <div className="space-y-3 pt-0.5">
                    {/* Workspace Name */}
                    <FormField
                      control={form.control}
                      name="workspaceName"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">
                            Workspace Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Engineering, Marketing, Operations"
                              disabled={isLoading}
                              {...field}
                              className="h-9 text-sm bg-background border-input"
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {/* Workspace URL - Stacked layout to prevent truncation */}
                    <FormField
                      control={form.control}
                      name="workspaceSlug"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">
                            Workspace URL
                          </FormLabel>
                          <FormControl>
                            <div className="rounded-md border border-input bg-background px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                              <div className="text-[11px] font-mono text-muted-foreground/80 truncate select-none">
                                syncora.app/{currentOrgSlug}/team/
                              </div>
                              <input
                                className="w-full bg-transparent text-sm font-mono outline-none pt-0.5 text-foreground placeholder:text-muted-foreground/50"
                                placeholder="general"
                                disabled={isLoading}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription className="text-[11px] text-muted-foreground">
                            Auto-generated direct URL route. You can customize the ending slug.
                          </FormDescription>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {/* Team Invitations Field (Growth Loop) */}
                    <FormField
                      control={form.control}
                      name="teamInvites"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-foreground/90">
                            Invite team members{" "}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="colleague@company.com, teammate@company.com"
                              disabled={isLoading}
                              rows={2}
                              className="min-h-[54px] max-h-[80px] resize-none text-xs bg-background border-input py-1.5"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-[11px] text-muted-foreground">
                            Enter email addresses separated by commas.
                          </FormDescription>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                      disabled={isLoading}
                      className="text-xs h-9 text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                      Back
                    </Button>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      size="sm"
                      className="h-9 px-4 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-colors"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Creating Workspace...
                        </>
                      ) : (
                        "Launch Workspace"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
