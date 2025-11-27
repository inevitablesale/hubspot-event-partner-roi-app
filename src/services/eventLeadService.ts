import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';
import { EventLead, Campaign } from '../types';
import { cleanUTMParameters, generateCampaignNameFromUTM } from '../utils/utm';
import { generateId } from '../utils/helpers';
import { getHubSpotClient } from './hubspotAuth';

// In-memory storage for campaigns (in production, use a database)
const campaignStore: Map<string, Campaign> = new Map();

/**
 * Ingest an event lead into HubSpot
 */
export async function ingestEventLead(
  portalId: string,
  lead: EventLead
): Promise<{ contactId: string; campaignId: string; isNew: boolean }> {
  const client = await getHubSpotClient(portalId);
  
  // Clean UTM parameters if raw data is provided
  const cleanedUTM = lead.rawUtmData ? cleanUTMParameters(lead.rawUtmData) : null;
  
  // Prepare contact properties
  const properties: Record<string, string> = {
    email: lead.email,
    firstname: lead.firstName || '',
    lastname: lead.lastName || '',
    company: lead.company || '',
    phone: lead.phone || '',
    hs_lead_status: 'NEW',
    leadsource: lead.leadSource || 'Event',
    event_name: lead.eventName,
    event_date: lead.eventDate,
    event_id: lead.eventId,
  };

  // Add partner attribution
  if (lead.partnerId) {
    properties.partner_id = lead.partnerId;
    properties.partner_name = lead.partnerName || '';
  }

  // Add UTM data
  if (cleanedUTM) {
    properties.utm_source = cleanedUTM.source;
    properties.utm_medium = cleanedUTM.medium;
    properties.utm_campaign = cleanedUTM.campaign;
    properties.utm_content = cleanedUTM.content;
    properties.utm_term = cleanedUTM.term;
  } else if (lead.utmSource) {
    properties.utm_source = lead.utmSource;
    properties.utm_medium = lead.utmMedium || '';
    properties.utm_campaign = lead.utmCampaign || '';
    properties.utm_content = lead.utmContent || '';
    properties.utm_term = lead.utmTerm || '';
  }

  // Add custom properties
  if (lead.customProperties) {
    for (const [key, value] of Object.entries(lead.customProperties)) {
      properties[key] = String(value);
    }
  }

  // Check if contact exists
  let contactId: string;
  let isNew = false;
  
  try {
    const existingContact = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: FilterOperatorEnum.Eq,
          value: lead.email,
        }],
      }],
      properties: ['email'],
      limit: 1,
      after: '0',
      sorts: [],
    });

    if (existingContact.results.length > 0) {
      contactId = existingContact.results[0].id;
      // Update existing contact
      await client.crm.contacts.basicApi.update(contactId, { properties });
    } else {
      // Create new contact
      const newContact = await client.crm.contacts.basicApi.create({ properties });
      contactId = newContact.id;
      isNew = true;
    }
  } catch {
    // If search fails, try to create
    const newContact = await client.crm.contacts.basicApi.create({ properties });
    contactId = newContact.id;
    isNew = true;
  }

  // Get or create campaign
  const campaignName = cleanedUTM 
    ? generateCampaignNameFromUTM(cleanedUTM, lead.eventName)
    : `${lead.eventName}-${lead.eventId}`;
  
  let campaign = getCampaignByName(campaignName);
  if (!campaign) {
    campaign = await createCampaign({
      name: campaignName,
      eventId: lead.eventId,
      eventName: lead.eventName,
      partnerId: lead.partnerId,
      partnerName: lead.partnerName,
      startDate: lead.eventDate,
      status: 'active',
    });
  }

  return {
    contactId,
    campaignId: campaign.id!,
    isNew,
  };
}

/**
 * Batch ingest multiple event leads
 */
export async function batchIngestEventLeads(
  portalId: string,
  leads: EventLead[]
): Promise<{ 
  successful: number; 
  failed: number; 
  results: Array<{ email: string; success: boolean; contactId?: string; error?: string }>;
}> {
  const results: Array<{ email: string; success: boolean; contactId?: string; error?: string }> = [];
  let successful = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const result = await ingestEventLead(portalId, lead);
      results.push({
        email: lead.email,
        success: true,
        contactId: result.contactId,
      });
      successful++;
    } catch (error) {
      results.push({
        email: lead.email,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  return { successful, failed, results };
}

/**
 * Create a new campaign
 */
export async function createCampaign(campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
  const campaign: Campaign = {
    ...campaignData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  campaignStore.set(campaign.id!, campaign);
  return campaign;
}

/**
 * Get campaign by ID
 */
export function getCampaign(campaignId: string): Campaign | undefined {
  return campaignStore.get(campaignId);
}

/**
 * Get campaign by name
 */
export function getCampaignByName(name: string): Campaign | undefined {
  for (const campaign of campaignStore.values()) {
    if (campaign.name === name) {
      return campaign;
    }
  }
  return undefined;
}

/**
 * Get all campaigns for an event
 */
export function getCampaignsByEvent(eventId: string): Campaign[] {
  return Array.from(campaignStore.values()).filter(c => c.eventId === eventId);
}

/**
 * Get all campaigns for a partner
 */
export function getCampaignsByPartner(partnerId: string): Campaign[] {
  return Array.from(campaignStore.values()).filter(c => c.partnerId === partnerId);
}

/**
 * Update campaign
 */
export function updateCampaign(campaignId: string, updates: Partial<Campaign>): Campaign | undefined {
  const campaign = campaignStore.get(campaignId);
  if (!campaign) return undefined;

  const updatedCampaign: Campaign = {
    ...campaign,
    ...updates,
    id: campaign.id,
    createdAt: campaign.createdAt,
    updatedAt: new Date().toISOString(),
  };

  campaignStore.set(campaignId, updatedCampaign);
  return updatedCampaign;
}

/**
 * List all campaigns
 */
export function listCampaigns(): Campaign[] {
  return Array.from(campaignStore.values());
}

/**
 * Clear campaign store (for testing)
 */
export function clearCampaignStore(): void {
  campaignStore.clear();
}

/**
 * Get contact by ID from HubSpot
 */
export async function getContact(
  portalId: string, 
  contactId: string,
  properties?: string[]
): Promise<Record<string, unknown>> {
  const client = await getHubSpotClient(portalId);
  const contact = await client.crm.contacts.basicApi.getById(
    contactId,
    properties || ['email', 'firstname', 'lastname', 'company', 'event_name', 'partner_id']
  );
  return contact as unknown as Record<string, unknown>;
}

/**
 * Search contacts by event
 */
export async function searchContactsByEvent(
  portalId: string,
  eventId: string
): Promise<Array<Record<string, unknown>>> {
  const client = await getHubSpotClient(portalId);
  
  const result = await client.crm.contacts.searchApi.doSearch({
    filterGroups: [{
      filters: [{
        propertyName: 'event_id',
        operator: FilterOperatorEnum.Eq,
        value: eventId,
      }],
    }],
    properties: ['email', 'firstname', 'lastname', 'company', 'event_name', 'partner_id', 'utm_source'],
    limit: 100,
    after: '0',
    sorts: [],
  });

  return result.results as unknown as Array<Record<string, unknown>>;
}
