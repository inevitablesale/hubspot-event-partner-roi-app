import { LeadScore, ScoreBreakdown, EventLead } from '../types';
import { config } from '../config';

/**
 * Calculate lead score based on various factors
 */
export function calculateLeadScore(
  contactId: string,
  lead: EventLead,
  additionalData?: {
    companySize?: number;
    industry?: string;
    jobTitle?: string;
    websiteVisits?: number;
    emailOpens?: number;
    contentDownloads?: number;
  }
): LeadScore {
  const breakdown: ScoreBreakdown = {
    eventEngagement: calculateEventEngagementScore(lead),
    companyFit: calculateCompanyFitScore(lead, additionalData),
    behaviorSignals: calculateBehaviorScore(additionalData),
    demographicFit: calculateDemographicScore(lead, additionalData),
    partnerSource: calculatePartnerSourceScore(lead),
  };

  // Calculate weighted total score
  const weights = config.scoring.weights;
  const totalScore = Math.min(100, Math.round(
    (breakdown.eventEngagement * weights.eventEngagement / 100) +
    (breakdown.companyFit * weights.companyFit / 100) +
    (breakdown.behaviorSignals * weights.behaviorSignals / 100) +
    (breakdown.demographicFit * weights.demographicFit / 100) +
    (breakdown.partnerSource * weights.partnerSource / 100)
  ));

  // Determine tier
  const tiers = config.scoring.tiers;
  let tier: 'hot' | 'warm' | 'cold';
  if (totalScore >= tiers.hot) {
    tier = 'hot';
  } else if (totalScore >= tiers.warm) {
    tier = 'warm';
  } else {
    tier = 'cold';
  }

  return {
    contactId,
    totalScore,
    breakdown,
    tier,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate event engagement score
 */
function calculateEventEngagementScore(lead: EventLead): number {
  let score = 0;

  // Base score for registration
  score += 30;

  // Attendance status
  if (lead.attendanceStatus === 'attended') {
    score += 50;
  } else if (lead.attendanceStatus === 'registered') {
    score += 20;
  }
  // No additional points for no-show

  // Early registration bonus
  if (lead.registrationDate && lead.eventDate) {
    const registrationDate = new Date(lead.registrationDate);
    const eventDate = new Date(lead.eventDate);
    const daysBeforeEvent = Math.floor(
      (eventDate.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysBeforeEvent > 14) {
      score += 20;
    } else if (daysBeforeEvent > 7) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate company fit score
 */
function calculateCompanyFitScore(
  lead: EventLead,
  additionalData?: { companySize?: number; industry?: string }
): number {
  let score = 50; // Base score

  // Company name presence
  if (lead.company) {
    score += 20;
  }

  // Company size scoring
  if (additionalData?.companySize) {
    if (additionalData.companySize >= 1000) {
      score += 30;
    } else if (additionalData.companySize >= 100) {
      score += 20;
    } else if (additionalData.companySize >= 10) {
      score += 10;
    }
  }

  // Industry fit (example: prioritize tech industries)
  if (additionalData?.industry) {
    const highValueIndustries = ['technology', 'software', 'saas', 'fintech', 'healthcare'];
    if (highValueIndustries.some(i => additionalData.industry!.toLowerCase().includes(i))) {
      score += 20;
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate behavior signals score
 */
function calculateBehaviorScore(
  additionalData?: { websiteVisits?: number; emailOpens?: number; contentDownloads?: number }
): number {
  let score = 30; // Base score

  if (!additionalData) return score;

  // Website visits
  if (additionalData.websiteVisits) {
    if (additionalData.websiteVisits >= 10) {
      score += 30;
    } else if (additionalData.websiteVisits >= 5) {
      score += 20;
    } else if (additionalData.websiteVisits >= 1) {
      score += 10;
    }
  }

  // Email engagement
  if (additionalData.emailOpens) {
    if (additionalData.emailOpens >= 5) {
      score += 20;
    } else if (additionalData.emailOpens >= 2) {
      score += 10;
    }
  }

  // Content downloads
  if (additionalData.contentDownloads) {
    if (additionalData.contentDownloads >= 3) {
      score += 20;
    } else if (additionalData.contentDownloads >= 1) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate demographic fit score
 */
function calculateDemographicScore(
  lead: EventLead,
  additionalData?: { jobTitle?: string }
): number {
  let score = 40; // Base score

  // Contact info completeness
  if (lead.firstName && lead.lastName) {
    score += 10;
  }
  if (lead.phone) {
    score += 10;
  }
  if (lead.email) {
    score += 10;
  }

  // Job title scoring
  if (additionalData?.jobTitle) {
    const executiveTitles = ['ceo', 'cto', 'cfo', 'coo', 'vp', 'director', 'head of', 'chief'];
    const managerTitles = ['manager', 'lead', 'senior'];
    
    const titleLower = additionalData.jobTitle.toLowerCase();
    
    if (executiveTitles.some(t => titleLower.includes(t))) {
      score += 30;
    } else if (managerTitles.some(t => titleLower.includes(t))) {
      score += 20;
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate partner source score
 */
function calculatePartnerSourceScore(lead: EventLead): number {
  let score = 50; // Base score

  // Partner attribution bonus
  if (lead.partnerId) {
    score += 30;
  }

  // UTM tracking presence
  if (lead.utmSource || lead.rawUtmData) {
    score += 20;
  }

  return Math.min(100, score);
}

/**
 * Batch score multiple leads
 */
export function batchScoreLeads(
  leads: Array<{ contactId: string; lead: EventLead; additionalData?: Record<string, unknown> }>
): LeadScore[] {
  return leads.map(({ contactId, lead, additionalData }) => 
    calculateLeadScore(contactId, lead, additionalData as Parameters<typeof calculateLeadScore>[2])
  );
}

/**
 * Get score tier thresholds
 */
export function getScoreTierThresholds(): { hot: number; warm: number; cold: number } {
  return { ...config.scoring.tiers };
}

/**
 * Get scoring weights
 */
export function getScoringWeights(): typeof config.scoring.weights {
  return { ...config.scoring.weights };
}
