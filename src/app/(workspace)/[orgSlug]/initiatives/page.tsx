import { createClient } from "@/lib/supabase/server"
import { getInitiatives } from "@/lib/api/initiatives"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "lucide-react"

export default async function InitiativesPage({ params }: { params: { orgSlug: string } }) {
  const supabase = await createClient()
  
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', params.orgSlug)
    .single()

  if (!org) {
    notFound()
  }

  const initiatives = await getInitiatives(supabase, org.id)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Initiatives</h2>
        </div>
        <p className="text-muted-foreground">
          Track large, cross-functional efforts and epics.
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initiatives.map((initiative) => (
            <Card key={initiative.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{initiative.name}</CardTitle>
                  <Badge variant={initiative.status === 'Completed' ? 'default' : 'secondary'}>
                    {initiative.status}
                  </Badge>
                </div>
                {initiative.description && <CardDescription>{initiative.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-4">
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4" />
                      <span>
                        {initiative.start_date ? new Date(initiative.start_date).toLocaleDateString() : 'TBD'} 
                        {' - '} 
                        {initiative.target_date ? new Date(initiative.target_date).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium">{(initiative as any).progress || 0}%</span>
                    </div>
                    <Progress value={(initiative as any).progress || 0} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {(initiative as any).owner?.avatar_url && <AvatarImage src={(initiative as any).owner.avatar_url} />}
                        <AvatarFallback className="text-[10px]">
                          {(initiative as any).owner?.full_name?.substring(0, 2).toUpperCase() || 'UN'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{(initiative as any).owner?.full_name || 'Unassigned'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {initiatives.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              No initiatives defined yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
