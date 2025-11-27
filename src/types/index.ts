/**
 * Event lead data structure
 */
export interface EventLead {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  eventName: string;
  eventDate: string;
  eventId: string;
  partnerId?: string;
  partnerName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  rawUtmData?: Record<string, string>;
  leadSource?: string;
  registrationDate?: string;
  attendanceStatus?: 'registered' | 'attended' | 'no-show';
  customProperties?: Record<string, string | number | boolean>;
}

/**
 * Cleaned UTM data structure
 */
export interface CleanedUTM {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  original: Record<string, string>;
  isValid: boolean;
  issues: string[];
}

/**
 * Campaign data structure
 */
export interface Campaign {
  id?: string;
  name: string;
  eventId: string;
  eventName: string;
  partnerId?: string;
  partnerName?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  goals?: CampaignGoals;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export interface CampaignGoals {
  leadTarget?: number;
  attendeeTarget?: number;
  opportunityTarget?: number;
  revenueTarget?: number;
}

/**
 * Partner attribution data
 */
export interface PartnerAttribution {
  partnerId: string;
  partnerName: string;
  eventId: string;
  eventName: string;
  leadsGenerated: number;
  attendees: number;
  opportunitiesCreated: number;
  dealsClosed: number;
  revenueInfluenced: number;
  revenueAttributed: number;
  attributionPercentage: number;
  calculatedAt: string;
}

/**
 * Lead score result
 */
export interface LeadScore {
  contactId: string;
  totalScore: number;
  breakdown: ScoreBreakdown;
  tier: 'hot' | 'warm' | 'cold';
  calculatedAt: string;
}

export interface ScoreBreakdown {
  eventEngagement: number;
  companyFit: number;
  behaviorSignals: number;
  demographicFit: number;
  partnerSource: number;
}

/**
 * Event ROI calculation
 */
export interface EventROI {
  eventId: string;
  eventName: string;
  totalCost: number;
  totalRevenue: number;
  netRevenue: number;
  roi: number;
  roiPercentage: number;
  metrics: EventMetrics;
  partnerBreakdown: PartnerROI[];
  calculatedAt: string;
}

export interface EventMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  attendees: number;
  opportunities: number;
  closedDeals: number;
  conversionRates: ConversionRates;
  costMetrics: CostMetrics;
}

export interface ConversionRates {
  leadToAttendee: number;
  attendeeToOpportunity: number;
  opportunityToClose: number;
  overallConversion: number;
}

export interface CostMetrics {
  costPerLead: number;
  costPerAttendee: number;
  costPerOpportunity: number;
  costPerClosedDeal: number;
}

export interface PartnerROI {
  partnerId: string;
  partnerName: string;
  leadsContributed: number;
  revenueContributed: number;
  roi: number;
  attributionWeight: number;
}

/**
 * Pipeline analytics
 */
export interface PipelineAnalytics {
  eventId: string;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  dealsByStage: DealsByStage[];
  averageDealSize: number;
  averageSalesCycle: number;
  velocityMetrics: VelocityMetrics;
  forecastedRevenue: number;
  calculatedAt: string;
}

export interface DealsByStage {
  stageName: string;
  stageId: string;
  dealCount: number;
  totalValue: number;
  probability: number;
}

export interface VelocityMetrics {
  leadsPerDay: number;
  opportunitiesPerDay: number;
  averageTimeToOpportunity: number;
  averageTimeToClose: number;
}

/**
 * Timeline event for HubSpot
 */
export interface TimelineEvent {
  eventTemplateId: string;
  objectId: string;
  tokens: Record<string, string>;
  extraData?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * CRM Card data structure
 */
export interface CRMCardData {
  results: CRMCardSection[];
  primaryAction?: CRMCardAction;
  secondaryActions?: CRMCardAction[];
}

export interface CRMCardSection {
  objectId: number;
  title: string;
  properties: CRMCardProperty[];
  actions?: CRMCardAction[];
}

export interface CRMCardProperty {
  label: string;
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'LINK' | 'STATUS';
  value: string | number;
}

export interface CRMCardAction {
  type: 'IFRAME' | 'ACTION_HOOK' | 'CONFIRMATION_ACTION_HOOK';
  width: number;
  height: number;
  uri: string;
  label: string;
  associatedObjectProperties?: string[];
}

/**
 * OAuth tokens
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

/**
 * API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: PaginationMeta;
}
