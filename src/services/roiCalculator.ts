import { 
  EventROI,
  ConversionRates, 
  CostMetrics, 
  PartnerROI,
  PipelineAnalytics,
  DealsByStage,
  VelocityMetrics
} from '../types';
import { calculatePercentage } from '../utils/helpers';
import { getEventAttributions } from './partnerAttribution';
import { config } from '../config';

// In-memory storage for ROI calculations
const roiStore: Map<string, EventROI> = new Map();
const pipelineStore: Map<string, PipelineAnalytics> = new Map();

interface EventROIInput {
  eventId: string;
  eventName: string;
  totalCost: number;
  metrics: {
    totalLeads: number;
    qualifiedLeads: number;
    attendees: number;
    opportunities: number;
    closedDeals: number;
    totalRevenue: number;
    partnerContributions?: Array<{
      partnerId: string;
      partnerName: string;
      leadsContributed: number;
      revenueContributed: number;
    }>;
  };
}

/**
 * Calculate event ROI
 */
export function calculateEventROI(input: EventROIInput): EventROI {
  const { eventId, eventName, totalCost, metrics } = input;
  
  // Calculate basic ROI metrics
  const totalRevenue = metrics.totalRevenue;
  const netRevenue = totalRevenue - totalCost;
  const roi = totalCost > 0 ? netRevenue / totalCost : 0;
  const roiPercentage = roi * 100;

  // Calculate conversion rates
  const conversionRates: ConversionRates = {
    leadToAttendee: calculatePercentage(metrics.attendees, metrics.totalLeads),
    attendeeToOpportunity: calculatePercentage(metrics.opportunities, metrics.attendees),
    opportunityToClose: calculatePercentage(metrics.closedDeals, metrics.opportunities),
    overallConversion: calculatePercentage(metrics.closedDeals, metrics.totalLeads),
  };

  // Calculate cost metrics
  const costMetrics: CostMetrics = {
    costPerLead: metrics.totalLeads > 0 ? totalCost / metrics.totalLeads : 0,
    costPerAttendee: metrics.attendees > 0 ? totalCost / metrics.attendees : 0,
    costPerOpportunity: metrics.opportunities > 0 ? totalCost / metrics.opportunities : 0,
    costPerClosedDeal: metrics.closedDeals > 0 ? totalCost / metrics.closedDeals : 0,
  };

  // Calculate partner breakdown
  const partnerBreakdown: PartnerROI[] = (metrics.partnerContributions || []).map(partner => ({
    partnerId: partner.partnerId,
    partnerName: partner.partnerName,
    leadsContributed: partner.leadsContributed,
    revenueContributed: partner.revenueContributed,
    roi: totalCost > 0 && partner.leadsContributed > 0
      ? ((partner.revenueContributed - (totalCost * (partner.leadsContributed / metrics.totalLeads))) / 
         (totalCost * (partner.leadsContributed / metrics.totalLeads))) 
      : 0,
    attributionWeight: calculatePercentage(partner.leadsContributed, metrics.totalLeads) / 100,
  }));

  const eventROI: EventROI = {
    eventId,
    eventName,
    totalCost,
    totalRevenue,
    netRevenue,
    roi,
    roiPercentage,
    metrics: {
      totalLeads: metrics.totalLeads,
      qualifiedLeads: metrics.qualifiedLeads,
      attendees: metrics.attendees,
      opportunities: metrics.opportunities,
      closedDeals: metrics.closedDeals,
      conversionRates,
      costMetrics,
    },
    partnerBreakdown,
    calculatedAt: new Date().toISOString(),
  };

  roiStore.set(eventId, eventROI);
  return eventROI;
}

/**
 * Get event ROI
 */
export function getEventROI(eventId: string): EventROI | undefined {
  return roiStore.get(eventId);
}

/**
 * List all event ROIs
 */
export function listEventROIs(): EventROI[] {
  return Array.from(roiStore.values());
}

/**
 * Compare multiple event ROIs
 */
export function compareEventROIs(eventIds: string[]): {
  events: EventROI[];
  bestROI: EventROI | null;
  worstROI: EventROI | null;
  averageROI: number;
  totalRevenue: number;
  totalCost: number;
} {
  const events = eventIds.map(id => roiStore.get(id)).filter((e): e is EventROI => e !== undefined);
  
  if (events.length === 0) {
    return {
      events: [],
      bestROI: null,
      worstROI: null,
      averageROI: 0,
      totalRevenue: 0,
      totalCost: 0,
    };
  }

  const sorted = [...events].sort((a, b) => b.roiPercentage - a.roiPercentage);
  const totalRevenue = events.reduce((sum, e) => sum + e.totalRevenue, 0);
  const totalCost = events.reduce((sum, e) => sum + e.totalCost, 0);
  const averageROI = events.reduce((sum, e) => sum + e.roiPercentage, 0) / events.length;

  return {
    events,
    bestROI: sorted[0],
    worstROI: sorted[sorted.length - 1],
    averageROI,
    totalRevenue,
    totalCost,
  };
}

interface PipelineInput {
  eventId: string;
  deals: Array<{
    dealId: string;
    stageName: string;
    stageId: string;
    amount: number;
    probability: number;
    createdAt: string;
    closedAt?: string;
  }>;
  startDate: string;
}

/**
 * Calculate pipeline analytics for an event
 */
export function calculatePipelineAnalytics(input: PipelineInput): PipelineAnalytics {
  const { eventId, deals, startDate } = input;
  
  // Group deals by stage
  const stageMap = new Map<string, { stageName: string; stageId: string; deals: typeof deals }>();
  
  for (const deal of deals) {
    const key = deal.stageId;
    if (!stageMap.has(key)) {
      stageMap.set(key, {
        stageName: deal.stageName,
        stageId: deal.stageId,
        deals: [],
      });
    }
    stageMap.get(key)!.deals.push(deal);
  }

  // Calculate deals by stage
  const dealsByStage: DealsByStage[] = Array.from(stageMap.values()).map(stage => ({
    stageName: stage.stageName,
    stageId: stage.stageId,
    dealCount: stage.deals.length,
    totalValue: stage.deals.reduce((sum, d) => sum + d.amount, 0),
    probability: stage.deals.length > 0 
      ? stage.deals.reduce((sum, d) => sum + d.probability, 0) / stage.deals.length 
      : 0,
  }));

  // Calculate totals
  const totalPipelineValue = deals.reduce((sum, d) => sum + d.amount, 0);
  const weightedPipelineValue = deals.reduce((sum, d) => sum + (d.amount * d.probability), 0);
  const averageDealSize = deals.length > 0 ? totalPipelineValue / deals.length : 0;

  // Calculate velocity metrics
  const now = new Date();
  const start = new Date(startDate);
  const daysSinceStart = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  
  const closedDeals = deals.filter(d => d.closedAt);
  const salesCycles = closedDeals
    .filter(d => d.closedAt)
    .map(d => Math.ceil((new Date(d.closedAt!).getTime() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  
  const velocityMetrics: VelocityMetrics = {
    leadsPerDay: deals.length / daysSinceStart,
    opportunitiesPerDay: deals.length / daysSinceStart,
    averageTimeToOpportunity: config.pipeline.defaultTimeToOpportunityDays,
    averageTimeToClose: salesCycles.length > 0 
      ? salesCycles.reduce((sum, c) => sum + c, 0) / salesCycles.length 
      : config.pipeline.defaultSalesCycleDays,
  };

  // Forecast revenue (simple linear projection)
  const closedRevenue = closedDeals.reduce((sum, d) => sum + d.amount, 0);
  const openDeals = deals.filter(d => !d.closedAt);
  const forecastedRevenue = closedRevenue + (openDeals.reduce((sum, d) => sum + (d.amount * d.probability), 0));

  const pipelineAnalytics: PipelineAnalytics = {
    eventId,
    totalPipelineValue,
    weightedPipelineValue,
    dealsByStage,
    averageDealSize,
    averageSalesCycle: velocityMetrics.averageTimeToClose,
    velocityMetrics,
    forecastedRevenue,
    calculatedAt: new Date().toISOString(),
  };

  pipelineStore.set(eventId, pipelineAnalytics);
  return pipelineAnalytics;
}

/**
 * Get pipeline analytics
 */
export function getPipelineAnalytics(eventId: string): PipelineAnalytics | undefined {
  return pipelineStore.get(eventId);
}

/**
 * List all pipeline analytics
 */
export function listPipelineAnalytics(): PipelineAnalytics[] {
  return Array.from(pipelineStore.values());
}

/**
 * Calculate combined ROI and pipeline summary
 */
export function getEventSummary(eventId: string): {
  roi: EventROI | undefined;
  pipeline: PipelineAnalytics | undefined;
  partnerAttributions: ReturnType<typeof getEventAttributions>;
} {
  return {
    roi: getEventROI(eventId),
    pipeline: getPipelineAnalytics(eventId),
    partnerAttributions: getEventAttributions(eventId),
  };
}

/**
 * Clear ROI store (for testing)
 */
export function clearROIStore(): void {
  roiStore.clear();
}

/**
 * Clear pipeline store (for testing)
 */
export function clearPipelineStore(): void {
  pipelineStore.clear();
}
