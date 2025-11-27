import { TimelineEvent } from '../types';
import { getHubSpotClient } from './hubspotAuth';

// Timeline event template IDs (would be set up in HubSpot app configuration)
export const TIMELINE_EVENT_TEMPLATES = {
  EVENT_REGISTRATION: 'event-registration',
  EVENT_ATTENDANCE: 'event-attendance',
  PARTNER_ATTRIBUTION: 'partner-attribution',
  LEAD_SCORED: 'lead-scored',
  CAMPAIGN_CREATED: 'campaign-created',
};

/**
 * Create a timeline event in HubSpot
 */
export async function createTimelineEvent(
  portalId: string,
  event: TimelineEvent
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const client = await getHubSpotClient(portalId);
    
    // Note: Timeline events require an app ID and event template ID
    // This is a simplified implementation
    const response = await client.crm.timeline.eventsApi.create({
      eventTemplateId: event.eventTemplateId,
      objectId: event.objectId,
      tokens: event.tokens,
      extraData: event.extraData,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    });

    return {
      success: true,
      eventId: response.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating timeline event',
    };
  }
}

/**
 * Log event registration on contact timeline
 */
export async function logEventRegistration(
  portalId: string,
  contactId: string,
  eventName: string,
  eventDate: string,
  partnerId?: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  return createTimelineEvent(portalId, {
    eventTemplateId: TIMELINE_EVENT_TEMPLATES.EVENT_REGISTRATION,
    objectId: contactId,
    tokens: {
      eventName,
      eventDate,
      registrationDate: new Date().toISOString(),
      partnerId: partnerId || '',
    },
  });
}

/**
 * Log event attendance on contact timeline
 */
export async function logEventAttendance(
  portalId: string,
  contactId: string,
  eventName: string,
  eventDate: string,
  attendanceStatus: 'attended' | 'no-show'
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  return createTimelineEvent(portalId, {
    eventTemplateId: TIMELINE_EVENT_TEMPLATES.EVENT_ATTENDANCE,
    objectId: contactId,
    tokens: {
      eventName,
      eventDate,
      attendanceStatus,
      loggedAt: new Date().toISOString(),
    },
  });
}

/**
 * Log partner attribution on contact timeline
 */
export async function logPartnerAttribution(
  portalId: string,
  contactId: string,
  partnerId: string,
  partnerName: string,
  eventName: string,
  attributionPercentage: number
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  return createTimelineEvent(portalId, {
    eventTemplateId: TIMELINE_EVENT_TEMPLATES.PARTNER_ATTRIBUTION,
    objectId: contactId,
    tokens: {
      partnerId,
      partnerName,
      eventName,
      attributionPercentage: String(attributionPercentage),
      attributedAt: new Date().toISOString(),
    },
  });
}

/**
 * Log lead scoring on contact timeline
 */
export async function logLeadScoring(
  portalId: string,
  contactId: string,
  score: number,
  tier: 'hot' | 'warm' | 'cold',
  eventName: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  return createTimelineEvent(portalId, {
    eventTemplateId: TIMELINE_EVENT_TEMPLATES.LEAD_SCORED,
    objectId: contactId,
    tokens: {
      score: String(score),
      tier,
      eventName,
      scoredAt: new Date().toISOString(),
    },
  });
}

/**
 * Batch create timeline events
 */
export async function batchCreateTimelineEvents(
  portalId: string,
  events: TimelineEvent[]
): Promise<{ successful: number; failed: number; results: Array<{ success: boolean; eventId?: string; error?: string }> }> {
  const results: Array<{ success: boolean; eventId?: string; error?: string }> = [];
  let successful = 0;
  let failed = 0;

  for (const event of events) {
    const result = await createTimelineEvent(portalId, event);
    results.push(result);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  return { successful, failed, results };
}

/**
 * Get timeline events for a contact
 * Note: HubSpot API requires specific scopes to read timeline events
 */
export async function getContactTimelineEvents(
  portalId: string,
  contactId: string,
  _limit = 50
): Promise<{ events: Array<Record<string, unknown>>; error?: string }> {
  try {
    const client = await getHubSpotClient(portalId);
    
    // Note: This is a simplified example - actual implementation would use the timeline API
    // The timeline API requires app-level configuration
    const response = await client.crm.contacts.basicApi.getById(
      contactId,
      undefined,
      undefined,
      ['emails', 'meetings', 'notes', 'calls']
    );

    return {
      events: [response as unknown as Record<string, unknown>],
    };
  } catch (error) {
    return {
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
