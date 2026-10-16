'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ThumbsUp, ThumbsDown, AlertTriangle, ArrowRight, ShieldCheck, Scale } from 'lucide-react';
import { toast } from 'sonner';

export interface DecisionOptionUI {
  id: string;
  title: string;
  description: string;
  expectedBenefits: string[];
  risksAndTradeOffs: string[];
  requiredHumanApprovals: string[];
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

export interface DecisionComparisonProps {
  decisionId?: string;
  situationSummary: string;
  mainConstraints: string[];
  options: DecisionOptionUI[];
  recommendedOptionId: string;
  recommendationRationale: string;
  uncertaintyNotes?: string;
  workspaceId?: string;
  onAccept?: (optionId: string) => void;
  onReject?: () => void;
}

export function DecisionComparisonCard({
  decisionId,
  situationSummary,
  mainConstraints,
  options,
  recommendedOptionId,
  recommendationRationale,
  uncertaintyNotes,
  workspaceId,
  onAccept,
  onReject
}: DecisionComparisonProps) {
  const [selectedOption, setSelectedOption] = useState<string>(recommendedOptionId);
  const [outcomeStatus, setOutcomeStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [feedbackGiven, setFeedbackGiven] = useState<number | null>(null);

  const handleAction = async (action: 'accepted' | 'rejected') => {
    setOutcomeStatus(action);
    if (action === 'accepted' && onAccept) {
      onAccept(selectedOption);
    } else if (action === 'rejected' && onReject) {
      onReject();
    }

    if (workspaceId && decisionId) {
      try {
        await fetch('/api/ai/outcomes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            recommendationId: decisionId,
            recommendationType: 'strategic_decision',
            decisionContext: {
              situation: situationSummary,
              constraints: mainConstraints,
              options: options.map(o => ({ id: o.id, title: o.title, tradeOffs: o.risksAndTradeOffs.join('; ') })),
              recommendedOptionId
            },
            userAction: action,
            rejectionReason: action === 'rejected' ? 'User rejected AI comparison recommendation' : undefined
          })
        });
        toast.success(action === 'accepted' ? 'Recommendation accepted' : 'Feedback recorded');
      } catch (e) {
        console.error('Failed to record outcome', e);
      }
    }
  };

  const handleFeedback = async (score: number) => {
    setFeedbackGiven(score);
    toast.success('Thank you for rating this recommendation.');
  };

  return (
    <Card className="border border-border/80 shadow-md bg-card/60 backdrop-blur-sm overflow-hidden my-3">
      <CardHeader className="bg-muted/40 pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-500" />
            <CardTitle className="text-sm font-semibold tracking-tight">Explainable Decision Support</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {options.length} Options Evaluated
          </Badge>
        </div>
        <CardDescription className="text-xs mt-1 text-foreground/80 font-medium">
          {situationSummary}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {mainConstraints && mainConstraints.length > 0 && (
          <div className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-2.5 rounded-md flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Key Constraints: </span>
              {mainConstraints.join(' • ')}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {options.map((option) => {
            const isRecommended = option.id === recommendedOptionId;
            const isSelected = option.id === selectedOption;

            return (
              <div
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-500/80 bg-indigo-500/5 ring-1 ring-indigo-500/30'
                    : 'border-border/60 hover:border-border hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{option.title}</span>
                    {isRecommended && (
                      <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] py-0 px-1.5 h-4">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {option.confidenceLevel} Confidence
                  </Badge>
                </div>

                <p className="text-muted-foreground mb-2.5">{option.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40">
                  <div>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Expected Benefits:</span>
                    <ul className="list-disc pl-3 text-muted-foreground mt-0.5 space-y-0.5">
                      {option.expectedBenefits.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-amber-600 dark:text-amber-400">Trade-offs & Risks:</span>
                    <ul className="list-disc pl-3 text-muted-foreground mt-0.5 space-y-0.5">
                      {option.risksAndTradeOffs.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {option.requiredHumanApprovals && option.requiredHumanApprovals.length > 0 && (
                  <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    <span>Requires approval from: {option.requiredHumanApprovals.join(', ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {recommendationRationale && (
          <div className="p-3 bg-muted/30 border border-border/50 rounded-md text-xs">
            <span className="font-semibold text-foreground">Recommendation Rationale: </span>
            <span className="text-muted-foreground">{recommendationRationale}</span>
          </div>
        )}

        {uncertaintyNotes && (
          <p className="text-[11px] text-muted-foreground italic">
            * Note on uncertainty: {uncertaintyNotes}
          </p>
        )}
      </CardContent>

      <CardFooter className="bg-muted/20 border-t border-border/40 p-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Was this helpful?</span>
          <Button
            size="icon"
            variant="ghost"
            className={`h-6 w-6 ${feedbackGiven === 1 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
            onClick={() => handleFeedback(1)}
          >
            <ThumbsUp className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className={`h-6 w-6 ${feedbackGiven === -1 ? 'text-red-600 bg-red-50 dark:bg-red-950/30' : ''}`}
            onClick={() => handleFeedback(-1)}
          >
            <ThumbsDown className="w-3 h-3" />
          </Button>
        </div>

        {outcomeStatus === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAction('rejected')}>
              <X className="w-3 h-3 mr-1" /> Dismiss
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7" onClick={() => handleAction('accepted')}>
              <Check className="w-3 h-3 mr-1" /> Choose Option
            </Button>
          </div>
        ) : (
          <Badge variant={outcomeStatus === 'accepted' ? 'default' : 'secondary'} className="text-xs capitalize">
            {outcomeStatus}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
