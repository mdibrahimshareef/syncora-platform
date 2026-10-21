import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"

export type Portfolio = Database['public']['Tables']['portfolios']['Row'] & {
  owner?: { id: string; full_name: string | null; avatar_url: string | null } | null
  projects?: { project: Database['public']['Tables']['projects']['Row'] }[] | null
  progress?: number | null
}
export type CreatePortfolioPayload = Omit<Database['public']['Tables']['portfolios']['Insert'], 'id' | 'created_at' | 'updated_at'>
export type UpdatePortfolioPayload = Database['public']['Tables']['portfolios']['Update']

export async function getPortfolios(supabase: SupabaseClient<Database>, orgId: string) {
  const { data, error } = await supabase
    .from('portfolios')
    .select(`
      *,
      owner:owner_id(id, full_name, avatar_url),
      projects:portfolio_projects(project:project_id(*))
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createPortfolio(
  supabase: SupabaseClient<Database>,
  payload: CreatePortfolioPayload
) {
  const { data, error } = await supabase
    .from('portfolios')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePortfolio(
  supabase: SupabaseClient<Database>,
  portfolioId: string,
  payload: UpdatePortfolioPayload
) {
  const { data, error } = await supabase
    .from('portfolios')
    .update(payload)
    .eq('id', portfolioId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePortfolio(
  supabase: SupabaseClient<Database>,
  portfolioId: string
) {
  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', portfolioId)

  if (error) throw error
}

export async function linkProjectToPortfolio(
  supabase: SupabaseClient<Database>,
  portfolioId: string,
  projectId: string
) {
  const { error } = await supabase
    .from('portfolio_projects')
    .insert({ portfolio_id: portfolioId, project_id: projectId })

  if (error) throw error
}

export async function unlinkProjectFromPortfolio(
  supabase: SupabaseClient<Database>,
  portfolioId: string,
  projectId: string
) {
  const { error } = await supabase
    .from('portfolio_projects')
    .delete()
    .eq('portfolio_id', portfolioId)
    .eq('project_id', projectId)

  if (error) throw error
}
