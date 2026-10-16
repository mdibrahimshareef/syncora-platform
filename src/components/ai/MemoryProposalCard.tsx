'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookmarkPlus, Check, X, Lock, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export interface MemoryProposalProps {
  workspaceId: string;
  scope: 'workspace' | 'user';
  category: string;
  content: string;
  reason?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function MemoryProposalCard({
  workspaceId,
  scope,
  category,
  content,
  reason,
  onConfirm,
  onCancel
}: MemoryProposalProps) {
  const [status, setStatus] = useState<'pending' | 'persisted' | 'dismissed'>('pending');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/ai/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          scope,
          category,
          content,
          sourceType: 'conversation_extraction',
          provenance: { reason }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save memory');
      }

      setStatus('persisted');
      toast.success(
        scope === 'user'
          ? 'Personal preference saved to your private memory.'
          : 'Working agreement saved to workspace memory.'
      );
      if (onConfirm) onConfirm();
    } catch (e: any) {
      toast.error(e.message || 'Error saving memory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setStatus('dismissed');
    if (onCancel) onCancel();
  };

  if (status === 'dismissed') {
    return (
      <div className="p-2 border rounded-md text-xs text-muted-foreground bg-muted/20 my-2 flex items-center justify-between">
        <span>Memory proposal dismissed.</span>
      </div>
    );
  }

  if (status === 'persisted') {
    return (
      <div className="p-3 border border-emerald-500/30 rounded-md text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 my-2 flex items-center gap-2">
        <Check className="w-4 h-4 shrink-0" />
        <span>Memory successfully recorded: <strong>{content}</strong></span>
      </div>
    );
  }

  return (
    <Card className="border border-border/80 shadow-sm bg-card/70 my-2 text-xs">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <BookmarkPlus className="w-4 h-4 text-indigo-500" />
          <CardTitle className="text-xs font-semibold">Proposed Organizational Memory</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] uppercase font-mono">
            {category.replace('_', ' ')}
          </Badge>
          <Badge
            variant={scope === 'user' ? 'secondary' : 'default'}
            className="text-[10px] flex items-center gap-1"
          >
            {scope === 'user' ? <Lock className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
            {scope === 'user' ? 'Private' : 'Shared Workspace'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-1 space-y-1.5">
        <p className="text-foreground font-medium bg-muted/40 p-2 rounded-md border border-border/40">
          "{content}"
        </p>
        {reason && (
          <p className="text-muted-foreground text-[11px] italic">
            Rationale: {reason}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-3 pt-0 flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDismiss} disabled={submitting}>
          <X className="w-3 h-3 mr-1" /> Don't Remember
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={handleConfirm}
          disabled={submitting}
        >
          <Check className="w-3 h-3 mr-1" /> Save to Memory
        </Button>
      </CardFooter>
    </Card>
  );
}
