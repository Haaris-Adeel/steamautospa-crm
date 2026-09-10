import crypto from 'crypto';
import { getSetting } from '@/app/lib/googlesheets';
import { queryDb, runDb } from '@/app/lib/db';

interface MetaWebhookEvent {
  event: string;
  data: {
    event_name: string;
    event_time: number;
    user_data?: {
      em?: string;
      ph?: string;
      fn?: string;
      ln?: string;
    };
    custom_data?: {
      value?: number;
      currency?: string;
    };
  };
}

async function verifyWebhookSignature(
  body: string,
  signature: string,
  appSecret: string
): Promise<boolean> {
  const hash = crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || '';

    // Get app secret from settings
    const appSecret = await getSetting('meta_app_secret');
    if (!appSecret) {
      console.warn('Meta app secret not configured');
    } else {
      // Verify webhook signature
      const isValid = await verifyWebhookSignature(body, signature, appSecret);
      if (!isValid) {
        return Response.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const data = JSON.parse(body);

    // Handle subscription confirmation
    if (data.object === 'page') {
      const entries = data.entry || [];

      for (const entry of entries) {
        const messaging = entry.messaging || [];

        for (const event of messaging) {
          if (event.message?.quick_reply?.payload === 'CONFIRMED') {
            console.log('Webhook verified');
            return Response.json({ success: true });
          }
        }
      }

      // Store lead events
      const metaEvents = data.entry?.[0]?.data || [];

      for (const event of metaEvents) {
        try {
          // Store raw event data for processing
          await runDb(
            `INSERT INTO "MetaLeadEvent" (event_name, event_time, user_data, custom_data, raw_data, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [
              event.event_name || 'unknown',
              new Date(event.event_time * 1000).toISOString(),
              JSON.stringify(event.user_data || {}),
              JSON.stringify(event.custom_data || {}),
              JSON.stringify(event)
            ]
          );
        } catch (error) {
          console.error('Failed to store lead event:', error);
        }
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

// Handle GET for webhook verification
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Get verify token from settings
    const verifyToken = await getSetting('meta_verify_token');

    if (mode === 'subscribe' && token === verifyToken) {
      return new Response(challenge);
    }

    return Response.json({ error: 'Invalid request' }, { status: 403 });
  } catch (error) {
    console.error('Webhook verification error:', error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
