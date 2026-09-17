import { create } from 'zustand'
import { Organization, Team } from '@/types'
import { createClient } from '@/lib/supabase/client'
import * as goalsApi from '@/lib/api/goals'
import * as portfoliosApi from '@/lib/api/portfolios'

export type Goal = goalsApi.Goal
export type Portfolio = portfoliosApi.Portfolio

type OrganizationState = {
  organizations: Organization[]
  teams: Team[]
  goals: Goal[]
  portfolios: Portfolio[]
  activeOrganizationId: string | null
  activeTeamId: string | null
  isLoading: boolean
  error: string | null

  setInitialData: (data: { 
    organizations?: Organization[], 
    teams?: Team[],
    activeOrganizationId?: string | null,
    activeTeamId?: string | null
  }) => void
  
  setActiveOrganizationId: (id: string | null) => void
  setActiveTeamId: (id: string | null) => void
  updateOrganization: (id: string, updates: Partial<Organization>) => void
  updateTeam: (id: string, updates: Partial<Team>) => void

  fetchGoals: () => Promise<void>
  createGoal: (payload: any) => Promise<Goal>
  updateGoal: (id: string, payload: any) => Promise<void>
  
  fetchPortfolios: () => Promise<void>
  createPortfolio: (payload: any) => Promise<Portfolio>
  updatePortfolio: (id: string, payload: any) => Promise<void>
}

export const useOrganizationStore = create<OrganizationState>()((set, get) => ({
  organizations: [],
  teams: [],
  goals: [],
  portfolios: [],
  activeOrganizationId: null,
  activeTeamId: null,
  isLoading: false,
  error: null,

  setInitialData: (data) => set((state) => ({
    ...state,
    ...data
  })),

  setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
  setActiveTeamId: (id) => set({ activeTeamId: id }),
  
  updateOrganization: (id, updates) => set((state) => ({
    organizations: state.organizations.map(org => 
      org.id === id ? { ...org, ...updates } : org
    )
  })),
  
  updateTeam: (id, updates) => set((state) => ({
    teams: state.teams.map(team => 
      team.id === id ? { ...team, ...updates } : team
    )
  })),

  fetchGoals: async () => {
    const { activeOrganizationId } = get()
    if (!activeOrganizationId) return
    try {
      const supabase = createClient()
      const goals = await goalsApi.getGoals(supabase, activeOrganizationId)
      set({ goals })
    } catch (err) {
      console.error('Failed to fetch goals:', err)
    }
  },

  createGoal: async (payload) => {
    const supabase = createClient()
    const newGoal = await goalsApi.createGoal(supabase, payload)
    set({ goals: [newGoal, ...get().goals] })
    return newGoal
  },

  updateGoal: async (id, payload) => {
    const supabase = createClient()
    const updated = await goalsApi.updateGoal(supabase, id, payload)
    set({
      goals: get().goals.map(g => g.id === id ? { ...g, ...updated } : g)
    })
  },

  fetchPortfolios: async () => {
    const { activeOrganizationId } = get()
    if (!activeOrganizationId) return
    try {
      const supabase = createClient()
      const portfolios = await portfoliosApi.getPortfolios(supabase, activeOrganizationId)
      set({ portfolios })
    } catch (err) {
      console.error('Failed to fetch portfolios:', err)
    }
  },

  createPortfolio: async (payload) => {
    const supabase = createClient()
    const newPort = await portfoliosApi.createPortfolio(supabase, payload)
    set({ portfolios: [newPort, ...get().portfolios] })
    return newPort
  },

  updatePortfolio: async (id, payload) => {
    const supabase = createClient()
    const updated = await portfoliosApi.updatePortfolio(supabase, id, payload)
    set({
      portfolios: get().portfolios.map(p => p.id === id ? { ...p, ...updated } : p)
    })
  }
}))
