import { NextResponse } from 'next/server'
import { verifyWorkspaceAccess } from '@/lib/ai/auth'
import { getWorkspaceContext } from '@/lib/ai/context'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export async function POST(req: Request) {
  try {
    const { request, workspaceId } = await req.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    // 1. Authenticate & Authorize
    try {
      await verifyWorkspaceAccess(workspaceId)
    } catch (authError: any) {
      return NextResponse.json({ error: authError.message }, { status: 403 })
    }

    // 2. Retrieve Workspace Context
    const contextData = await getWorkspaceContext(workspaceId, request.title)
    const contextStr = JSON.stringify(contextData, null, 2)
    
    // 3. System Prompt
    const systemPrompt = `You are an AI Triage assistant for a workspace. Your job is to analyze incoming requests and suggest how to triage them based on the active projects and members in the workspace.
    
    WORKSPACE CONTEXT:
    ${contextStr}
    
    INCOMING REQUEST:
    Title: ${request.title}
    Data: ${JSON.stringify(request.data)}
    `
    
    const provider = process.env.AI_PROVIDER || 'mock'
    
    if (provider === 'mock' || !process.env.AI_API_KEY) {
       return NextResponse.json({
         suggestion: {
           priority: 'High',
           projectId: contextData.projects[0]?.id || null,
           assigneeId: contextData.members[0]?.id || null,
           reason: '[MOCK MODE] No AI API Key. Simulating triage based on first available project/member.'
         }
       })
    }

    // 4. Generate structured response
    const { object } = await generateObject({
      model: openai(process.env.AI_MODEL || 'gpt-4o-mini'),
      system: systemPrompt,
      schema: z.object({
        priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).describe('Suggested priority'),
        projectId: z.string().nullable().describe('Suggested Project ID based on the workspace context. Null if no match.'),
        assigneeId: z.string().nullable().describe('Suggested Assignee ID (User ID) based on the workspace context. Null if unclear.'),
        reason: z.string().describe('Explanation of why this triage is recommended.')
      }),
      prompt: 'Suggest a triage for the incoming request based on the workspace context.',
    })

    return NextResponse.json({ suggestion: object })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
