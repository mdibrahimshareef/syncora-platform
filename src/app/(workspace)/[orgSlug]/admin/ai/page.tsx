'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useDataStore } from '@/stores/data-store';
import { AIJob } from '@/types/ai-jobs';

export default function AIAdminPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) || '';

  const { organizations } = useOrganizationStore();
  const { workspaces, activeWorkspaceId } = useDataStore();

  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authoritative organization resolution
  const currentOrg = useMemo(() => {
    return organizations.find(o => o.slug === orgSlug) || null;
  }, [organizations, orgSlug]);

  // Determine if caller has admin/owner role in this organization
  const isOrgAdmin = useMemo(() => {
    return currentOrg?.role === 'admin' || currentOrg?.role === 'owner';
  }, [currentOrg]);

  // Resolve active workspace dynamically from organization context
  const resolvedWorkspace = useMemo(() => {
    if (!orgSlug && !currentOrg) return null;
    
    // 1. If currently active workspace belongs to this organization, use it
    if (activeWorkspaceId) {
      const activeMatch = workspaces.find(
        w => w.id === activeWorkspaceId && 
        (w.orgSlug === orgSlug || (currentOrg && w.organizationId === currentOrg.id))
      );
      if (activeMatch) return activeMatch;
    }

    // 2. Otherwise find the first workspace matching this organization
    const orgMatch = workspaces.find(
      w => w.orgSlug === orgSlug || (currentOrg && w.organizationId === currentOrg.id)
    );
    if (orgMatch) return orgMatch;

    // 3. Fallback to active workspace if available
    return workspaces.find(w => w.id === activeWorkspaceId) || null;
  }, [workspaces, activeWorkspaceId, orgSlug, currentOrg]);

  const resolvedWorkspaceId = resolvedWorkspace?.id || null;

  const fetchJobs = useCallback(async () => {
    if (!resolvedWorkspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/ai/jobs?workspaceId=${encodeURIComponent(resolvedWorkspaceId)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch AI Jobs (${res.status})`);
      }
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error fetching AI jobs';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [resolvedWorkspaceId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleApprove = async (jobId: string) => {
    try {
      const res = await fetch('/api/ai/jobs/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Approval failed');
      }
      await fetchJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approval failed';
      alert(msg);
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      const res = await fetch('/api/ai/jobs/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, reason: 'Rejected by admin in dashboard' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Rejection failed');
      }
      await fetchJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rejection failed';
      alert(msg);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'WAITING_APPROVAL': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'RUNNING': return <PlayCircle className="w-4 h-4 text-indigo-500" />;
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'RECOVERY_PENDING': return <RotateCcw className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  // RBAC Access Guard: If organization loaded and caller is not admin/owner
  if (currentOrg && !isOrgAdmin) {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-card border rounded-lg shadow-sm">
          <ShieldAlert className="size-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You do not have administrative privileges for {currentOrg.name}. AI Governance and Runtime Observability are restricted to workspace administrators and owners.
          </p>
          <Button onClick={() => router.push(`/${orgSlug}`)}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">AI Runtime Observability</h1>
            <Badge variant="outline" className="flex items-center gap-1 font-normal text-xs">
              <Sparkles className="w-3 h-3 text-primary" />
              {currentOrg ? currentOrg.name : orgSlug}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Monitor and govern the durable AI job queue and workflow execution across {resolvedWorkspace ? `"${resolvedWorkspace.name}"` : 'the active workspace'}.
          </p>
        </div>
        <Button onClick={fetchJobs} variant="outline" size="sm" disabled={loading}>
          <RotateCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {!resolvedWorkspaceId && !loading && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md text-sm">
          No active workspace found for organization &quot;{orgSlug}&quot;. Please select or create a workspace to view AI runtime telemetry.
        </div>
      )}

      {/* Operational Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Execution</span>
            <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-50 border-blue-200">Live</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {jobs.filter(j => j.status === 'RUNNING' || j.status === 'CLAIMED' || j.status === 'QUEUED').length}
            </span>
            <span className="text-xs text-muted-foreground">queued or running</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Awaiting Approval</span>
            <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 border-amber-200">Actionable</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {jobs.filter(j => j.status === 'WAITING_APPROVAL').length}
            </span>
            <span className="text-xs text-muted-foreground">high-risk gates</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Incidents & Recovery</span>
            <Badge variant="outline" className="text-[10px] text-red-600 bg-red-50 border-red-200">Faults</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {jobs.filter(j => j.status === 'FAILED' || j.status === 'RECOVERY_PENDING').length}
            </span>
            <span className="text-xs text-muted-foreground">failed / retrying</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</span>
            <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">Historical</Badge>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {jobs.filter(j => j.status === 'COMPLETED').length}
            </span>
            <span className="text-xs text-muted-foreground">successful jobs</span>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Queue & Diagnostics</CardTitle>
          <CardDescription>
            Live view of all background AI agent tasks, scheduled jobs, and governed workflows.
            {resolvedWorkspace && (
              <span className="block mt-1 text-xs text-muted-foreground font-mono">
                Workspace ID: {resolvedWorkspaceId}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-8 text-muted-foreground">Loading queue records...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border-dashed border-2 rounded-md">
              No jobs in the queue for this workspace.
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getStatusIcon(job.status)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{job.job_type}</span>
                        <Badge variant="outline" className="text-xs font-mono">{job.status}</Badge>
                        {job.workflow_id && (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            Workflow: {job.workflow_id.slice(0, 8)}...
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">ID: {job.id}</p>
                      <p className="text-xs text-muted-foreground">
                        Trigger: <span className="font-medium">{job.trigger_type}</span> • Created: {new Date(job.created_at).toLocaleString()}
                        {job.attempt_count > 0 && ` • Attempts: ${job.attempt_count}/${job.max_attempts}`}
                      </p>
                      {job.status === 'FAILED' && job.failed_at && (
                        <p className="text-xs text-destructive font-medium">
                          Failed: {new Date(job.failed_at).toLocaleString()}
                          {job.payload?.error && ` • Reason: ${String(job.payload.error)}`}
                        </p>
                      )}
                      {job.status === 'RECOVERY_PENDING' && job.next_attempt_at && (
                        <p className="text-xs text-amber-600 font-medium">
                          Next attempt scheduled for: {new Date(job.next_attempt_at).toLocaleTimeString()}
                        </p>
                      )}
                      {job.status === 'RUNNING' && job.lease_expires_at && (
                        <p className="text-xs text-indigo-600">
                          Worker Lease expires: {new Date(job.lease_expires_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {job.status === 'WAITING_APPROVAL' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReject(job.id)}>
                        Reject
                      </Button>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(job.id)}>
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
