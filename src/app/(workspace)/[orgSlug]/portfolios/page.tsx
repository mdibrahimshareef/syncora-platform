"use client"

import * as React from "react"
import { useOrganizationStore } from "@/stores/organizationStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Folder, Briefcase } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useParams } from "next/navigation"

export default function PortfoliosPage() {
  const params = useParams()
  const orgSlug = params.orgSlug as string

  const { organizations, portfolios, fetchPortfolios, createPortfolio, updatePortfolio, setActiveOrganizationId } = useOrganizationStore()
  
  const org = organizations.find(o => o.slug === orgSlug)

  React.useEffect(() => {
    if (org) {
      setActiveOrganizationId(org.id)
      fetchPortfolios()
    }
  }, [org, setActiveOrganizationId, fetchPortfolios])

  const [isOpen, setIsOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState("Active")

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return

    try {
      await createPortfolio({
        org_id: org.id,
        name,
        description,
        status,
      })
      toast.success("Portfolio created successfully")
      setIsOpen(false)
      setName("")
      setDescription("")
      setStatus("Active")
    } catch (err: any) {
      toast.error(err.message || "Failed to create portfolio")
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updatePortfolio(id, { status: newStatus })
      toast.success("Portfolio status updated")
    } catch (err: any) {
      toast.error("Failed to update status")
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Portfolios</h2>
            <p className="text-muted-foreground">
              Group related projects to view rolled-up status and progress.
            </p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button><Plus className="size-4 mr-2" /> New Portfolio</Button>} />
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Portfolio</DialogTitle>
                  <DialogDescription>Create a container to track related projects across teams.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Q4 Marketing Initiatives" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => {
            const projectCount = (portfolio as any).projects?.length || 0;
            return (
              <Card key={portfolio.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Briefcase className="size-4 text-muted-foreground" />
                      {portfolio.name}
                    </CardTitle>
                    <Select value={portfolio.status || 'Active'} onValueChange={(val) => val && handleStatusChange(portfolio.id, val)}>
                      <SelectTrigger className="h-6 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {portfolio.description && <CardDescription className="line-clamp-2 mt-2">{portfolio.description}</CardDescription>}
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="space-y-4 mt-4">
                    <div className="text-sm flex items-center gap-2">
                      <Folder className="size-4 text-muted-foreground" />
                      <span className="font-medium">{projectCount}</span> {projectCount === 1 ? 'Project' : 'Projects'} linked
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-medium">{(portfolio as any).progress || 0}%</span>
                      </div>
                      <Progress value={(portfolio as any).progress || 0} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {(portfolio as any).owner?.avatar_url && <AvatarImage src={(portfolio as any).owner.avatar_url} />}
                          <AvatarFallback className="text-[10px]">
                            {(portfolio as any).owner?.full_name?.substring(0, 2).toUpperCase() || 'UN'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{(portfolio as any).owner?.full_name || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
          {portfolios.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border border-dashed rounded-lg bg-card">
              <Briefcase className="size-10 text-muted-foreground mb-4 opacity-20" />
              <h3 className="font-semibold text-lg">No Portfolios Found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">Group related projects together to track overall progress and health.</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsOpen(true)}>Create First Portfolio</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
