import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Plus, Trash2, Zap, Save, RefreshCw, Layers } from 'lucide-react';
import { TriggerDefinitions, ActionDefinitions, ConditionFieldDefinitions, ConditionOperatorSchema, TriggerType, ActionType } from '@/lib/automations/registry';
import { Automation } from '@/lib/api/automations';

interface AutomationBuilderProps {
  initialData?: Partial<Automation>;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function AutomationBuilder({ initialData, onSave, onCancel }: AutomationBuilderProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  // Trigger State
  const [triggerType, setTriggerType] = useState<TriggerType | ''>((initialData?.trigger_type as TriggerType) || '');
  const [triggerConfig, setTriggerConfig] = useState<any>(initialData?.trigger_config || {});

  // Condition State (simplified for Phase 14)
  const [conditions, setConditions] = useState<any[]>(
    initialData?.conditions?.rules || []
  );

  // Actions State
  const [actions, setActions] = useState<any[]>(
    initialData?.actions || []
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (status: 'PUBLISHED' | 'DISABLED') => {
    if (!name || !triggerType || actions.length === 0) return;
    setIsSaving(true);
    try {
      await onSave({
        name,
        description,
        is_active: status === 'PUBLISHED', // New automations will use is_active boolean (from Phase 14B)
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        conditions: conditions.length > 0 ? { operator: 'AND', rules: conditions } : undefined,
        actions
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addAction = (type: ActionType) => {
    setActions([...actions, { id: `action-${Date.now()}`, type, config: {} }]);
  };

  const updateActionConfig = (index: number, key: string, value: any) => {
    const newActions = [...actions];
    newActions[index].config = { ...newActions[index].config, [key]: value };
    setActions(newActions);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10">
        <div className="space-y-1">
          <Input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Automation Name" 
            className="text-lg font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0"
          />
          <Input 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="Add a description (optional)" 
            className="text-sm text-muted-foreground border-none shadow-none px-0 h-auto focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button variant="secondary" onClick={() => handleSave('DISABLED')} disabled={isSaving || !name || !triggerType || actions.length === 0}>
            {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSave('PUBLISHED')} disabled={isSaving || !name || !triggerType || actions.length === 0}>
            {isSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </div>
      </div>

      {/* WHEN - Trigger Section */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-wider">
            <Zap className="h-4 w-4" /> WHEN (Trigger)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Select Trigger</Label>
              <Select value={triggerType} onValueChange={(val: any) => setTriggerType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TriggerDefinitions).map(def => (
                    <SelectItem key={def.id} value={def.id}>
                      <div className="flex flex-col">
                        <span>{def.label}</span>
                        <span className="text-xs text-muted-foreground">{def.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {triggerType === 'task.status_changed' && (
              <div className="grid gap-2 p-4 bg-muted/50 rounded-md border mt-2">
                <Label>Target Status (Optional)</Label>
                <Input 
                  placeholder="e.g. In Progress" 
                  value={triggerConfig.targetStatus || ''}
                  onChange={e => setTriggerConfig({ ...triggerConfig, targetStatus: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Only trigger when task moves to this specific status. Leave blank for any status change.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center -my-2 relative z-0">
        <div className="bg-background p-2"><ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" /></div>
      </div>

      {/* IF - Conditions Section */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="bg-amber-500/5 pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 uppercase tracking-wider">
            <Layers className="h-4 w-4" /> IF (Conditions)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {conditions.length === 0 ? (
             <div className="text-center py-6 bg-muted/30 border border-dashed rounded-md">
               <p className="text-sm text-muted-foreground mb-4">No conditions set. This automation will always run when triggered.</p>
               <Button variant="outline" size="sm" onClick={() => setConditions([{ field: 'task.priority', operator: 'equals', value: '' }])}>
                 <Plus className="h-4 w-4 mr-2" /> Add Condition
               </Button>
             </div>
          ) : (
            <div className="space-y-4">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-md border">
                  <Select value={cond.field} onValueChange={(val) => { const c = [...conditions]; c[idx].field = val; setConditions(c); }}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.values(ConditionFieldDefinitions).map(def => (
                        <SelectItem key={def.id} value={def.id}>{def.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={cond.operator} onValueChange={(val) => { const c = [...conditions]; c[idx].operator = val; setConditions(c); }}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ConditionOperatorSchema.options.map(op => (
                        <SelectItem key={op} value={op}>{op.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input 
                    className="flex-1"
                    placeholder="Value..."
                    value={cond.value}
                    onChange={(e) => { const c = [...conditions]; c[idx].value = e.target.value; setConditions(c); }}
                  />

                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                    const c = [...conditions]; c.splice(idx, 1); setConditions(c);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setConditions([...conditions, { field: 'task.priority', operator: 'equals', value: '' }])}>
                 <Plus className="h-4 w-4 mr-2" /> Add Condition
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center -my-2 relative z-0">
        <div className="bg-background p-2"><ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" /></div>
      </div>

      {/* THEN - Actions Section */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="bg-emerald-500/5 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 uppercase tracking-wider">
            <Zap className="h-4 w-4" /> THEN (Actions)
          </CardTitle>
          <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">Executes sequentially</div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {actions.length === 0 && (
            <div className="text-center py-8 bg-muted/30 border border-dashed rounded-md text-muted-foreground">
              Add at least one action to execute.
            </div>
          )}
          
          {actions.map((action, idx) => {
            const def = ActionDefinitions[action.type as ActionType];
            return (
              <div key={action.id} className="relative p-4 border rounded-lg bg-card shadow-sm group">
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border border-emerald-200">
                  {idx + 1}
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex-1 ml-4">
                    <h4 className="font-semibold text-sm">{def?.label || action.type}</h4>
                    <p className="text-xs text-muted-foreground mb-4">{def?.description}</p>
                    
                    {/* Action Config Form */}
                    <div className="grid gap-3 max-w-lg">
                      {def?.requiredConfigFields.map(field => (
                        <div key={field} className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right text-xs capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
                          <Input 
                            className="col-span-3 h-8 text-sm"
                            value={action.config[field] || ''}
                            onChange={(e) => updateActionConfig(idx, field, e.target.value)}
                            placeholder={`Enter ${field}...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                    const a = [...actions]; a.splice(idx, 1); setActions(a);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-dashed">
            <Select onValueChange={(val: any) => addAction(val)}>
              <SelectTrigger className="w-full bg-muted/50 hover:bg-muted border-dashed h-12">
                <div className="flex items-center text-muted-foreground">
                  <Plus className="h-4 w-4 mr-2" /> Add Action
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.values(ActionDefinitions).map(def => (
                  <SelectItem key={def.id} value={def.id}>
                    <div className="flex flex-col">
                      <span>{def.label}</span>
                      <span className="text-xs text-muted-foreground">{def.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
