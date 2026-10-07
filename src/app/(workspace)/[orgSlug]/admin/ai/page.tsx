'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, XCircle, Clock, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

export default function AIAdminPage({ params }: { params: { orgSlug: string } }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [params.orgSlug]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // We would resolve workspaceId from orgSlug in a real layout, using a hardcoded one for the demo.
      const res = await fetch(`/api/ai/jobs?workspaceId=123e4567-e89b-12d3-a456-426614174000`);
      if (!res.ok) throw new Error('Failed to fetch AI Jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (jobId: string) => {
    try {
      const res = await fetch('/api/ai/jobs/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });
      if (!res.ok) throw new Error('Approval failed');
      fetchJobs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      const res = await fetch('/api/ai/jobs/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, reason: 'Rejected by admin in dashboard' })
      });
      if (!res.ok) throw new Error('Rejection failed');
      fetchJobs();
    } catch (err: any) {
      alert(err.message);
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Runtime Observability</h1>
          <p className="text-muted-foreground mt-2">Monitor and govern the durable AI job queue (Release 4.5).</p>
        </div>
        <Button onClick={fetchJobs} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Job Queue</CardTitle>
          <CardDescription>Live view of all background AI agent tasks and workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-8 text-muted-foreground">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border-dashed border-2 rounded-md">
              No jobs in the queue.
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getStatusIcon(job.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{job.job_type}</span>
                        <Badge variant="outline" className="text-xs font-mono">{job.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">ID: {job.id}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trigger: {job.trigger_type} • Created: {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {job.status === 'WAITING_APPROVAL' && (
                    <div className="flex items-center gap-2">
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
