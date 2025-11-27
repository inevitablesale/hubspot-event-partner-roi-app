import { PartnerAttribution } from '../types';
import { calculatePercentage } from '../utils/helpers';

// In-memory storage for partner attributions
const attributionStore: Map<string, PartnerAttribution> = new Map();

interface PartnerEventData {
  partnerId: string;
  partnerName: string;
  eventId: string;
  eventName: string;
  leadsGenerated: number;
  attendees: number;
  opportunitiesCreated: number;
  dealsClosed: number;
  revenueInfluenced: number;
}

/**
 * Calculate and store partner attribution for an event
 */
export function calculatePartnerAttribution(data: PartnerEventData): PartnerAttribution {
  const totalRevenueInfluenced = data.revenueInfluenced;
  
  // Calculate attributed revenue based on partner contribution
  // Partners with leads get full attribution (100%), while partners with
  // only event presence (e.g., booth/sponsor) get partial attribution (50%)
  // This follows a "first touch" vs "influence" attribution model
  const LEAD_CONTRIBUTION_FACTOR = 1.0;
  const PRESENCE_ONLY_CONTRIBUTION_FACTOR = 0.5;
  const contributionFactor = data.leadsGenerated > 0 
    ? LEAD_CONTRIBUTION_FACTOR 
    : PRESENCE_ONLY_CONTRIBUTION_FACTOR;
  const revenueAttributed = totalRevenueInfluenced * contributionFactor;
  
  // Calculate attribution percentage (simplified model)
  const attributionPercentage = calculatePartnerAttributionPercentage(data);

  const attribution: PartnerAttribution = {
    partnerId: data.partnerId,
    partnerName: data.partnerName,
    eventId: data.eventId,
    eventName: data.eventName,
    leadsGenerated: data.leadsGenerated,
    attendees: data.attendees,
    opportunitiesCreated: data.opportunitiesCreated,
    dealsClosed: data.dealsClosed,
    revenueInfluenced: totalRevenueInfluenced,
    revenueAttributed,
    attributionPercentage,
    calculatedAt: new Date().toISOString(),
  };

  const key = `${data.partnerId}-${data.eventId}`;
  attributionStore.set(key, attribution);

  return attribution;
}

/**
 * Calculate partner attribution percentage
 */
function calculatePartnerAttributionPercentage(data: PartnerEventData): number {
  // Multi-touch attribution model weights
  const weights = {
    leadGeneration: 0.3,    // 30% weight for lead generation
    attendance: 0.2,        // 20% weight for attendance
    opportunity: 0.25,      // 25% weight for opportunity creation
    deal: 0.25,             // 25% weight for deals closed
  };

  // Calculate weighted score (normalized 0-100)
  let score = 0;
  
  if (data.leadsGenerated > 0) {
    score += weights.leadGeneration * Math.min(100, data.leadsGenerated * 5);
  }
  
  if (data.attendees > 0) {
    const attendanceRate = calculatePercentage(data.attendees, data.leadsGenerated);
    score += weights.attendance * attendanceRate;
  }
  
  if (data.opportunitiesCreated > 0) {
    const oppRate = calculatePercentage(data.opportunitiesCreated, data.attendees || data.leadsGenerated);
    score += weights.opportunity * oppRate;
  }
  
  if (data.dealsClosed > 0) {
    const closeRate = calculatePercentage(data.dealsClosed, data.opportunitiesCreated || 1);
    score += weights.deal * closeRate;
  }

  return Math.round(score * 100) / 100;
}

/**
 * Get partner attribution by partner and event
 */
export function getPartnerAttribution(partnerId: string, eventId: string): PartnerAttribution | undefined {
  return attributionStore.get(`${partnerId}-${eventId}`);
}

/**
 * Get all attributions for a partner
 */
export function getPartnerAttributions(partnerId: string): PartnerAttribution[] {
  return Array.from(attributionStore.values()).filter(a => a.partnerId === partnerId);
}

/**
 * Get all attributions for an event
 */
export function getEventAttributions(eventId: string): PartnerAttribution[] {
  return Array.from(attributionStore.values()).filter(a => a.eventId === eventId);
}

/**
 * Calculate aggregate partner performance
 */
export function calculateAggregatePartnerPerformance(partnerId: string): {
  totalLeads: number;
  totalAttendees: number;
  totalOpportunities: number;
  totalDeals: number;
  totalRevenueInfluenced: number;
  totalRevenueAttributed: number;
  averageAttributionPercentage: number;
  eventsParticipated: number;
} {
  const attributions = getPartnerAttributions(partnerId);
  
  if (attributions.length === 0) {
    return {
      totalLeads: 0,
      totalAttendees: 0,
      totalOpportunities: 0,
      totalDeals: 0,
      totalRevenueInfluenced: 0,
      totalRevenueAttributed: 0,
      averageAttributionPercentage: 0,
      eventsParticipated: 0,
    };
  }

  const totals = attributions.reduce(
    (acc, attr) => ({
      totalLeads: acc.totalLeads + attr.leadsGenerated,
      totalAttendees: acc.totalAttendees + attr.attendees,
      totalOpportunities: acc.totalOpportunities + attr.opportunitiesCreated,
      totalDeals: acc.totalDeals + attr.dealsClosed,
      totalRevenueInfluenced: acc.totalRevenueInfluenced + attr.revenueInfluenced,
      totalRevenueAttributed: acc.totalRevenueAttributed + attr.revenueAttributed,
      totalAttributionPercentage: acc.totalAttributionPercentage + attr.attributionPercentage,
    }),
    {
      totalLeads: 0,
      totalAttendees: 0,
      totalOpportunities: 0,
      totalDeals: 0,
      totalRevenueInfluenced: 0,
      totalRevenueAttributed: 0,
      totalAttributionPercentage: 0,
    }
  );

  return {
    ...totals,
    averageAttributionPercentage: Math.round((totals.totalAttributionPercentage / attributions.length) * 100) / 100,
    eventsParticipated: attributions.length,
  };
}

/**
 * Update partner attribution
 */
export function updatePartnerAttribution(
  partnerId: string,
  eventId: string,
  updates: Partial<Omit<PartnerAttribution, 'partnerId' | 'eventId' | 'calculatedAt'>>
): PartnerAttribution | undefined {
  const key = `${partnerId}-${eventId}`;
  const existing = attributionStore.get(key);
  
  if (!existing) return undefined;

  const updated: PartnerAttribution = {
    ...existing,
    ...updates,
    partnerId,
    eventId,
    calculatedAt: new Date().toISOString(),
  };

  attributionStore.set(key, updated);
  return updated;
}

/**
 * Delete partner attribution
 */
export function deletePartnerAttribution(partnerId: string, eventId: string): boolean {
  return attributionStore.delete(`${partnerId}-${eventId}`);
}

/**
 * Clear attribution store (for testing)
 */
export function clearAttributionStore(): void {
  attributionStore.clear();
}

/**
 * List all partner attributions
 */
export function listAllAttributions(): PartnerAttribution[] {
  return Array.from(attributionStore.values());
}
