"use client"

import { useEffect, useState } from 'react'
import { useDataStore } from '@/stores/data-store'
import { useOrganizationStore } from '@/stores/organizationStore'
import { User, Organization, Team, Workspace } from '@/types'

export function StoreInitializer({ 
  currentUser, 
  activeWorkspaceId,
  workspaces = [],
  organizations = [],
  teams = []
}: { 
  currentUser: User | null
  activeWorkspaceId: string | null
  workspaces?: Workspace[] | any[]
  organizations?: Organization[]
  teams?: Team[]
}) {
  useState(() => {
    if (typeof window === 'undefined') {
      useDataStore.setState((state) => ({
        ...state,
        currentUser,
        activeWorkspaceId,
        workspaces
      }))
      
      useOrganizationStore.setState((state) => ({
        ...state,
        organizations,
        teams
      }))
    }
    return true
  })

  // On the client, we use useEffect to avoid updating other components during render
  useEffect(() => {
    useDataStore.setState((state) => ({
      ...state,
      currentUser,
      activeWorkspaceId,
      workspaces
    }))
    
    useOrganizationStore.setState((state) => ({
      ...state,
      organizations,
      teams
    }))
    
    if (activeWorkspaceId) {
      useDataStore.getState().fetchWorkspaceMembers()
    }
  }, [currentUser, activeWorkspaceId, workspaces, organizations, teams])

  return null
}
