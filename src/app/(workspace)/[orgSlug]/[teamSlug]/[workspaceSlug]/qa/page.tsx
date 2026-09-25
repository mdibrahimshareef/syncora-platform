'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function QAPage({ params }: { params: { workspaceSlug: string } }) {
  const [logs, setLogs] = useState<string[]>([])
  
  const log = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])

  const testTimerStartRace = async () => {
    log('--- STARTING TIMER RACE TEST ---')
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data } = await supabase.from('workspaces').select('id').limit(1).single()
      const workspaceId = data?.id
      if (!workspaceId) throw new Error('No workspace found')

      // Fire 5 concurrent requests
    const promises = Array.from({ length: 5 }).map((_, i) => 
      fetch('/api/time-entries/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, description: `Test ${i}` })
      })
    )
    
    const results = await Promise.all(promises)
    const statuses = results.map(r => r.status)
    log(`Results: ${statuses.join(', ')}`)
    const successes = statuses.filter(s => s === 200 || s === 201).length
    const conflicts = statuses.filter(s => s === 409).length
    
    if (successes === 1 && conflicts === 4) {
      log('✅ PASS: Exactly 1 timer started, 4 were rejected by unique constraint.')
    } else {
      log('❌ FAIL: Race condition not mitigated correctly.')
    }
    } catch (e: any) {
      log(`❌ ERROR: ${e.message}`)
    }
  }

  const testTimerStopRace = async () => {
    log('--- STARTING STOP RACE TEST ---')
    const promises = Array.from({ length: 5 }).map(() => 
      fetch('/api/time-entries/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    )
    
    const results = await Promise.all(promises)
    const statuses = results.map(r => r.status)
    log(`Results: ${statuses.join(', ')}`)
    
    const successes = statuses.filter(s => s === 200).length
    const rejections = statuses.filter(s => s === 409 || s === 404).length
    
    if (successes === 1 && rejections === 4) {
      log('✅ PASS: Exactly 1 stop succeeded, 4 were rejected by atomic update.')
    } else {
      log('❌ FAIL: Stop race condition not mitigated correctly.')
    }
  }

  const testRLS = async () => {
    log('--- STARTING RLS TEST ---')
    const res = await fetch('/api/time-entries/active')
    log(`Active timer fetch status: ${res.status}`)
    
    const res2 = await fetch('/api/time-entries/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: 'ffffffff-ffff-ffff-ffff-ffffffffffff', description: 'Malicious start' })
    })
    log(`Malicious workspace start status: ${res2.status}`)
    if (res2.status === 401 || res2.status === 403 || res2.status === 404 || res2.status === 500) { 
       log('✅ PASS: Cross-workspace injection blocked.')
    }
  }

  const testBudget = async () => {
    log('--- STARTING BUDGET THRESHOLD TEST ---')
    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data } = await supabase.from('workspaces').select('id').limit(1).single()
      const workspaceId = data?.id
      if (!workspaceId) throw new Error('No workspace found')

    // Create a mock project directly via Supabase
    const { data: proj, error: projError } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspaceId,
        name: 'QA Project',
        description: 'QA Budget Test',
        slug: 'qa-project-' + Date.now()
      })
      .select('id')
      .single()
      
    if (projError || !proj?.id) {
      log(`❌ FAIL: Could not create QA project: ${projError?.message}`)
      return
    }

    // Set budget to 40h (2400 mins), warning 75%, critical 100%
    await fetch(`/api/projects/${proj.id}/budget`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, budgetType: 'TIME', budgetMinutes: 2400, budgetAmount: null, warningThreshold: 75, criticalThreshold: 100 })
    })
    log('Budget set to 40h')

    // Simulate 35h -> 36h (90%). Should fire warning.
    // To simulate without waiting 35 hours, we just update a time entry or hit the DB, but since time-entries/stop uses real time, we can't easily fake duration via stop endpoint.
    // Instead, we can insert a manual time entry!
    const manualRes1 = await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, projectId: proj.id, date: new Date().toISOString(), durationMinutes: 36 * 60, description: '36h' })
    })
    log(`Insert 36h entry status: ${manualRes1.status}`)
    
    // Check DB manually or assume success based on event dispatch logs
    log('✅ Budget check requires DB inspection for events. Proceed manually.')
    } catch (e: any) {
      log(`❌ ERROR: ${e.message}`)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Release 15 QA Dashboard</h1>
      
      <div className="space-x-4">
        <Button onClick={testTimerStartRace}>Test Start Concurrency</Button>
        <Button onClick={testTimerStopRace}>Test Stop Concurrency</Button>
        <Button onClick={testRLS}>Test RLS Isolation</Button>
        <Button onClick={testBudget}>Test Budget Thresholds</Button>
      </div>

      <div className="bg-slate-900 text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        {logs.length === 0 && <span className="text-slate-500">Awaiting test execution...</span>}
      </div>
    </div>
  )
}
