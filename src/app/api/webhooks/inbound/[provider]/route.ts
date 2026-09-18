import { NextResponse } from 'next/server';
import { slackProvider } from '@/lib/integrations/slack';
import { githubProvider } from '@/lib/integrations/github';
import { googleCalendarProvider } from '@/lib/integrations/google-calendar';

const providers: Record<string, any> = {
  slack: slackProvider,
  github: githubProvider,
  google_calendar: googleCalendarProvider,
};

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await context.params;
  const provider = providers[providerName];
  if (!provider) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  try {
    const rawBody = await request.text();
    
    // 1. Verify signature if the provider supports it
    if (provider.verifyWebhookSignature) {
      const isValid = await provider.verifyWebhookSignature(request, rawBody);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // 2. Parse payload
    const payload = JSON.parse(rawBody);

    // 3. Provider-specific event routing
    // In a full implementation, the provider would parse the payload and 
    // emit internal SyncoraEvents or update records directly.
    console.log(`[Inbound Webhook] Received from ${providerName}`, payload);
    
    // Standard response for webhooks to acknowledge receipt quickly
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`[Inbound Webhook Error] ${providerName}:`, err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
