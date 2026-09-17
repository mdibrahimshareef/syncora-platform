"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { acceptInvitation } from "@/lib/api/workspaces"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

import { acceptOrganizationInvitation } from "@/lib/api/organizations"
import { acceptTeamInvitation } from "@/lib/api/teams"

function JoinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const type = searchParams.get('type') || 'workspace'
  const supabase = createClient()
  
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = React.useState("")
  const hasProcessed = React.useRef(false)

  React.useEffect(() => {
    async function processInvite() {
      if (hasProcessed.current) return
      hasProcessed.current = true
      
      if (!token) {
        setStatus('error')
        setErrorMessage("Invalid or missing invitation token.")
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push(`/login?next=${encodeURIComponent(`/join?token=${token}&type=${type}`)}`)
        return
      }

      try {
        if (type === 'org') {
          const orgId = await acceptOrganizationInvitation(supabase, token)
          document.cookie = `SYNCORA_organization_id=${orgId}; path=/; max-age=31536000`
        } else if (type === 'team') {
          const teamId = await acceptTeamInvitation(supabase, token)
          document.cookie = `SYNCORA_team_id=${teamId}; path=/; max-age=31536000`
        } else {
          const workspaceId = await acceptInvitation(supabase, token)
          document.cookie = `SYNCORA_workspace_id=${workspaceId}; path=/; max-age=31536000`
        }
        setStatus('success')
        toast.success(`Successfully joined the ${type === 'org' ? 'organization' : type}!`)
      } catch (error: any) {
        console.error("Accept invitation error:", error instanceof Error ? error.message : JSON.stringify(error, null, 2))
        setStatus('error')
        
        let msg = error?.message || "Failed to accept invitation. It may have expired."
        if (msg.includes('different email address')) {
          msg = "This invitation was sent to a different email address. Please ensure you are logged in with the correct account."
        }
        
        setErrorMessage(msg)
      }
    }

    processInvite()
  }, [token, type, supabase, router])

  const handleContinue = () => {
    // Hard reload is required here to clear the Next.js client-side router cache 
    // and force the server layout to fetch the newly created membership.
    window.location.assign('/app')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Joining Workspace</CardTitle>
          <CardDescription>
            {status === 'loading' && "Processing your invitation..."}
            {status === 'success' && "Invitation accepted"}
            {status === 'error' && "Invitation failed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6 min-h-[150px]">
          {status === 'loading' && (
            <Loader2 className="size-10 animate-spin text-primary" />
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center text-center">
              <CheckCircle className="size-12 text-green-500 mb-4" />
              <p className="text-sm text-muted-foreground">
                You are now a member of the workspace.
              </p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center text-center">
              <XCircle className="size-12 text-destructive mb-4" />
              <p className="text-sm text-muted-foreground text-destructive">
                {errorMessage}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {status !== 'loading' && (
            <Button onClick={handleContinue} className="w-full">
              {status === 'success' ? "Go to Workspace" : "Go to Dashboard"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default function JoinPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="size-10 animate-spin text-primary" /></div>}>
      <JoinContent />
    </React.Suspense>
  )
}
