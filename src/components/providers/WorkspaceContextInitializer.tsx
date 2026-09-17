"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useDataStore } from '@/stores/data-store'
import { useOrganizationStore } from '@/stores/organizationStore'

export function WorkspaceContextInitializer() {
  const params = useParams()
  const workspaces = useDataStore(s => s.workspaces);
  const { organizations, teams } = useOrganizationStore()
  const [initialized, setInitialized] = useState(false)

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

      // If we just navigated to a new workspace, or this is the first load
      if (isNewWorkspace || !initialized) {
        useDataStore.getState().fetchWorkspaceMembers()
        useDataStore.getState().fetchProjects()
        useDataStore.getState().fetchWorkspaceTasks()
        useDataStore.getState().fetchNotifications()
        useDataStore.getState().fetchCustomers()
        useDataStore.getState().fetchCustomerRequests()
        useDataStore.getState().fetchRequests()
        useDataStore.getState().fetchRequestForms()
        useDataStore.getState().fetchApprovals()
        setInitialized(true)
      }
    }
  }, [params, workspaces, organizations, teams, initialized])

  return null
}
