"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, MessageSquare, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function CustomersPage() {
  const customers = useDataStore(s => s.customers);
  const customerRequests = useDataStore(s => s.customerRequests);
  const createCustomer = useDataStore(s => s.createCustomer);
  const createCustomerRequest = useDataStore(s => s.createCustomerRequest);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);
  
  // Dialog states
  const searchParams = useSearchParams();
  const [isCustomerOpen, setIsCustomerOpen] = React.useState(searchParams.get("new") === "true")
  const [isRequestOpen, setIsRequestOpen] = React.useState(false)

  // New Customer State
  const [cName, setCName] = React.useState("")
  const [cOrganization, setCOrganization] = React.useState("")
  const [cEmail, setCEmail] = React.useState("")
  const [cTier, setCTier] = React.useState("Standard")

  // New Request State
  const [rTitle, setRTitle] = React.useState("")
  const [rDescription, setRDescription] = React.useState("")
  const [rCustomerId, setRCustomerId] = React.useState("")
  const [rType, setRType] = React.useState("Support")

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId) return
    
    try {
      await createCustomer({
        workspace_id: activeWorkspaceId,
        name: cName,
        organization: cOrganization,
        contact_email: cEmail,
        tier: cTier
      })
      toast.success("Customer added successfully")
      setIsCustomerOpen(false)
      setCName("")
      setCOrganization("")
      setCEmail("")
      setCTier("Standard")
    } catch (err: any) {
      toast.error(err.message || "Failed to add customer")
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceId || !rCustomerId) return

    try {
      await createCustomerRequest({
        workspace_id: activeWorkspaceId,
        customer_id: rCustomerId,
        title: rTitle,
        description: rDescription,
        type: rType,
        status: "Open"
      })
      toast.success("Request logged successfully")
      setIsRequestOpen(false)
      setRTitle("")
      setRDescription("")
      setRCustomerId("")
      setRType("Support")
    } catch (err: any) {
      toast.error(err.message || "Failed to log request")
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Customer Requests</h2>
            <p className="text-muted-foreground">
              Manage your external customers and their active requests.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
              <DialogTrigger render={<Button variant="outline"><Plus className="size-4 mr-2" /> Add Customer</Button>} />
              <DialogContent>
                <form onSubmit={handleCreateCustomer}>
                  <DialogHeader>
                    <DialogTitle>Add Customer</DialogTitle>
                    <DialogDescription>Add a new external organization or contact.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={cName} onChange={(e) => setCName(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="org">Organization</Label>
                      <Input id="org" value={cOrganization} onChange={(e) => setCOrganization(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Contact Email</Label>
                      <Input id="email" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tier">Tier</Label>
                      <Select value={cTier} onValueChange={(v) => setCTier(v as string)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Enterprise">Enterprise</SelectItem>
                          <SelectItem value="Strategic">Strategic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Add Customer</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
              <DialogTrigger render={<Button><Plus className="size-4 mr-2" /> New Request</Button>} />
              <DialogContent>
                <form onSubmit={handleCreateRequest}>
                  <DialogHeader>
                    <DialogTitle>Log Request</DialogTitle>
                    <DialogDescription>Record a new support or feature request.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customer">Customer</Label>
                      <Select value={rCustomerId} onValueChange={(v) => setRCustomerId(v as string)} required>
                        <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
                        <SelectContent>
                          {customers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.organization})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" value={rTitle} onChange={(e) => setRTitle(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={rDescription} onChange={(e) => setRDescription(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Type</Label>
                      <Select value={rType} onValueChange={(v) => setRType(v as string)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Support">Support</SelectItem>
                          <SelectItem value="Feature">Feature Request</SelectItem>
                          <SelectItem value="Bug">Bug Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Submit Request</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Active Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Managed Customers
              </CardTitle>
              <CardDescription>External organizations and contacts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.map(customer => (
                  <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.organization || customer.contact_email}</div>
                    </div>
                    <Badge variant={customer.tier === 'Enterprise' ? 'default' : 'secondary'}>
                      {customer.tier}
                    </Badge>
                  </div>
                ))}
                {customers.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                    No customers added yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Incoming Customer Requests */}
          <Card className="col-span-1 md:col-span-1 lg:col-span-1 row-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                Active Requests
              </CardTitle>
              <CardDescription>Support or feature requests from customers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerRequests.map(request => (
                  <div key={request.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="font-medium">{request.title}</div>
                      <Badge variant={
                        request.status === 'Open' ? 'default' : 
                        request.status === 'Resolved' ? 'secondary' : 'outline'
                      }>
                        {request.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {request.description}
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {(request as any).customer?.name || customers.find(c => c.id === request.customer_id)?.name || "Unknown"}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {customerRequests.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                    No active requests.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
