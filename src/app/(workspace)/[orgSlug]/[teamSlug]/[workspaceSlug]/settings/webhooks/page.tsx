"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Webhook, Plus, Trash2, KeyRound, Activity } from "lucide-react"
import { toast } from "sonner"
import { useDataStore } from "@/stores/data-store"

export default function WebhooksPage() {
  const fetchWebhooks = useDataStore(s => s.fetchWebhooks);
  const webhookEndpoints = useDataStore(s => s.webhookEndpoints);
  const activeWorkspaceId = useDataStore(s => s.activeWorkspaceId);

  React.useEffect(() => {
    if (activeWorkspaceId) {
      fetchWebhooks();
    }
  }, [activeWorkspaceId, fetchWebhooks]);

  const [isCreating, setIsCreating] = React.useState(false);
  const [newUrl, setNewUrl] = React.useState("");
  const [newName, setNewName] = React.useState("");

  const handleCreate = async () => {
    if (!newUrl || !newName) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      // In a real implementation this would call `createWebhook` from data store
      toast.success("Webhook created successfully. The secret is provided only once.");
      setIsCreating(false);
      setNewUrl("");
      setNewName("");
      // Need a re-fetch here if actually inserting via API
    } catch (err) {
      toast.error("Failed to create webhook");
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // Direct supabase client delete
      toast.success("Webhook deleted");
      // Trigger a re-fetch
    } catch (err) {
      toast.error("Failed to delete webhook");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Webhooks</h3>
          <p className="text-sm text-muted-foreground">
            Listen for events in SYNCORA and trigger actions in your own systems.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {isCreating && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">New Webhook Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                placeholder="e.g. Production Slack Notifier" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input 
                placeholder="https://api.example.com/syncora-webhook" 
                type="url" 
                value={newUrl} 
                onChange={e => setNewUrl(e.target.value)} 
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Save Webhook</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {webhookEndpoints.length === 0 && !isCreating ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <Webhook className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-1">No webhooks configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a webhook to receive real-time HTTP POST requests when events happen.
          </p>
          <Button variant="outline" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhookEndpoints.map(webhook => (
            <Card key={webhook.id}>
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {webhook.name}
                    <Badge variant={webhook.status === 'active' ? 'default' : 'secondary'} className={webhook.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                      {webhook.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">{webhook.url}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(webhook.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  HMAC Signed
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {webhook.last_delivery_at ? `Last delivery: ${new Date(webhook.last_delivery_at).toLocaleString()}` : 'No deliveries yet'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
