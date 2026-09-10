import { getSetting, setSetting } from '@/app/lib/googlesheets';
import { runDb, queryDb } from '@/app/lib/db';

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
}

interface MetaInsights {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

async function callMetaGraphAPI(endpoint: string, accessToken: string) {
  const url = `https://graph.instagram.com/v18.0${endpoint}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meta API error: ${response.status} ${error}`);
  }

  return response.json();
}

export async function POST() {
  try {
    // Get Meta credentials
    const accessToken = await getSetting('meta_access_token');
    const adAccountId = await getSetting('meta_ad_account_id');

    if (!accessToken || !adAccountId) {
      return Response.json(
        { error: 'Meta credentials not configured' },
        { status: 400 }
      );
    }

    // Get yesterday's date for daily sync
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const syncDate = yesterday.toISOString().split('T')[0];

    // Fetch campaigns
    const campaignsResponse = await callMetaGraphAPI(
      `/${adAccountId}/campaigns?fields=id,name,status`,
      accessToken
    );

    const campaigns: MetaCampaign[] = campaignsResponse.data || [];

    if (!campaigns.length) {
      return Response.json({
        error: 'No campaigns found',
        synced: 0
      }, { status: 400 });
    }

    let totalSpend = 0;
    let totalLeads = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let synced = 0;

    // Sync each campaign
    for (const campaign of campaigns) {
      try {
        const insightsResponse = await callMetaGraphAPI(
          `/${campaign.id}/insights?fields=campaign_id,campaign_name,spend,impressions,clicks,actions,action_values&date_preset=yesterday`,
          accessToken
        );

        const insights = insightsResponse.data?.[0] as MetaInsights | undefined;

        if (!insights) continue;

        const spend = parseFloat(insights.spend || '0');
        const impressions = parseInt(insights.impressions || '0', 10);
        const clicks = parseInt(insights.clicks || '0', 10);

        // Count lead actions
        const leadActions = insights.actions?.filter((a) => a.action_type === 'lead') || [];
        const leads = leadActions.length > 0 ? parseInt(leadActions[0].value || '0', 10) : 0;

        // Count purchase/booking actions
        const purchaseActions = insights.action_values?.filter((a) =>
          ['purchase', 'booking'].includes(a.action_type)
        ) || [];
        const conversions = purchaseActions.length > 0 ? parseInt(purchaseActions[0].value || '0', 10) : 0;

        const cpl = leads > 0 ? spend / leads : 0;

        // Upsert campaign data
        const campaignExists = await queryDb(
          'SELECT id FROM "MetaCampaign" WHERE id = $1',
          [campaign.id]
        );

        if (campaignExists.length === 0) {
          await runDb(
            'INSERT INTO "MetaCampaign" (id, name, status) VALUES ($1, $2, $3)',
            [campaign.id, campaign.name, campaign.status]
          );
        }

        // Insert daily metrics
        await runDb(
          `INSERT INTO "MetaDailyMetrics" (campaign_id, date, spend, leads, impressions, clicks, conversions, cpl)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (campaign_id, date) DO UPDATE SET
           spend = $3, leads = $4, impressions = $5, clicks = $6, conversions = $7, cpl = $8, updated_at = CURRENT_TIMESTAMP`,
          [campaign.id, new Date(syncDate), spend, leads, impressions, clicks, conversions, cpl]
        );

        totalSpend += spend;
        totalLeads += leads;
        totalImpressions += impressions;
        totalClicks += clicks;
        totalConversions += conversions;
        synced++;

      } catch (error) {
        console.error(`Failed to sync campaign ${campaign.id}:`, error);
      }
    }

    // Calculate aggregated CPL and ROAS (ROAS requires dollars booked from user input)
    const totalCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

    // Upsert aggregated metrics for different periods
    const today = new Date().toISOString().split('T')[0];

    // Store daily snapshot
    await runDb(
      `INSERT INTO "MetaMetricsSnapshot" (period, spend, leads, impressions, clicks, conversions, cpl)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (period) DO UPDATE SET
       spend = $2, leads = $3, impressions = $4, clicks = $5, conversions = $6, cpl = $7, updated_at = CURRENT_TIMESTAMP`,
      [`daily_${today}`, totalSpend, totalLeads, totalImpressions, totalClicks, totalConversions, totalCpl]
    );

    // Update last sync time
    await setSetting('meta_last_sync', new Date().toISOString());

    return Response.json({
      success: true,
      message: `Synced ${synced} campaigns for ${syncDate}`,
      metrics: {
        spend: totalSpend.toFixed(2),
        leads: totalLeads,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        cpl: totalCpl.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Meta sync error:', error);
    return Response.json(
      { error: `Sync failed: ${String(error)}` },
      { status: 500 }
    );
  }
}
