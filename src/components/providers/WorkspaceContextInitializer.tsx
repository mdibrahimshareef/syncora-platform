"use client"

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDataStore } from '@/stores/data-store'
import { useOrganizationStore } from '@/stores/organizationStore'

export function WorkspaceContextInitializer() {
  const params = useParams()
  const router = useRouter()
  const workspaces = useDataStore(s => s.workspaces);
  const { organizations, teams } = useOrganizationStore()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!params) return

    const orgSlug = params.orgSlug as string
    const teamSlug = params.teamSlug as string
    const workspaceSlug = params.workspaceSlug as string

    if (!orgSlug || !teamSlug || !workspaceSlug) return

    const currentOrg = organizations.find(o => o.slug === orgSlug)
    const currentTeam = teams.find(t => t.slug === teamSlug)
    const currentWorkspace = workspaces.find(w => w.slug === workspaceSlug)

    if (currentOrg) {
      useOrganizationStore.getState().setActiveOrganizationId(currentOrg.id)
    }
    
    if (currentTeam) {
      useOrganizationStore.getState().setActiveTeamId(currentTeam.id)
    }

    if (currentWorkspace) {
      const isNewWorkspace = useDataStore.getState().activeWorkspaceId !== currentWorkspace.id
      useDataStore.getState().setActiveWorkspaceId(currentWorkspace.id)
      
      // Update cookie silently so next reload uses this workspace by default
      document.cookie = `SYNCORA_workspace_id=${currentWorkspace.id}; path=/; max-age=31536000`

      if (isNewWorkspace || !initializedRef.current) {
        useDataStore.getState().fetchWorkspaceMembers()
        useDataStore.getState().fetchProjects()
        useDataStore.getState().fetchWorkspaceTasks()
        useDataStore.getState().fetchNotifications()
        useDataStore.getState().fetchCustomers()
        useDataStore.getState().fetchCustomerRequests()
        useDataStore.getState().fetchRequests()
        useDataStore.getState().fetchRequestForms()
        useDataStore.getState().fetchApprovals()
        initializedRef.current = true
      }
    } else if (workspaces.length > 0) {
      // User does not have access to this workspace, redirect to their first available workspace
      const defaultWorkspace = workspaces[0]
      router.replace(`/${defaultWorkspace.orgSlug || 'org'}/${defaultWorkspace.teamSlug || 'team'}/${defaultWorkspace.slug}/home`)
    }
    // If workspaces.length === 0, we are just waiting for Zustand hydration (layout.tsx ensures they have > 0)
  }, [params, workspaces, organizations, teams, router])

  return null
}
