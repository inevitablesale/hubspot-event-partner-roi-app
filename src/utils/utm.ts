import { CleanedUTM } from '../types';
import { config } from '../config';

/**
 * Clean and normalize UTM parameters
 */
export function cleanUTMParameters(rawUTM: Record<string, string>): CleanedUTM {
  const issues: string[] = [];
  
  // Normalize keys to lowercase
  const normalizedUTM: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawUTM)) {
    normalizedUTM[key.toLowerCase().trim()] = value?.trim() || '';
  }

  // Extract UTM values with fallbacks
  let source = normalizedUTM.utm_source || normalizedUTM.utmsource || normalizedUTM.source || '';
  let medium = normalizedUTM.utm_medium || normalizedUTM.utmmedium || normalizedUTM.medium || '';
  let campaign = normalizedUTM.utm_campaign || normalizedUTM.utmcampaign || normalizedUTM.campaign || '';
  let content = normalizedUTM.utm_content || normalizedUTM.utmcontent || normalizedUTM.content || '';
  let term = normalizedUTM.utm_term || normalizedUTM.utmterm || normalizedUTM.term || '';

  // Clean and normalize values
  source = normalizeValue(source);
  medium = normalizeValue(medium);
  campaign = normalizeValue(campaign);
  content = normalizeValue(content);
  term = normalizeValue(term);

  // Validate source
  if (source && !config.utm.validSources.includes(source)) {
    issues.push(`Unknown source: ${source}`);
  }

  // Validate medium
  if (medium && !config.utm.validMediums.includes(medium)) {
    issues.push(`Unknown medium: ${medium}`);
  }

  // Check for missing required fields
  if (!source) {
    issues.push('Missing utm_source');
  }
  if (!medium) {
    issues.push('Missing utm_medium');
  }
  if (!campaign) {
    issues.push('Missing utm_campaign');
  }

  return {
    source,
    medium,
    campaign,
    content,
    term,
    original: rawUTM,
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Normalize a UTM value
 */
function normalizeValue(value: string): string {
  if (!value) return '';
  
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .substring(0, 100);
}

/**
 * Parse UTM parameters from a URL
 */
export function parseUTMFromURL(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    for (const [key, value] of params.entries()) {
      if (key.toLowerCase().startsWith('utm') || ['source', 'medium', 'campaign', 'content', 'term'].includes(key.toLowerCase())) {
        result[key] = value;
      }
    }
  } catch {
    // Invalid URL, return empty object
  }
  
  return result;
}

/**
 * Generate a standardized campaign name from UTM parameters
 */
export function generateCampaignNameFromUTM(cleanedUTM: CleanedUTM, eventName: string): string {
  const parts: string[] = [];
  
  if (eventName) {
    parts.push(eventName.replace(/\s+/g, '-').toLowerCase());
  }
  
  if (cleanedUTM.source) {
    parts.push(cleanedUTM.source);
  }
  
  if (cleanedUTM.medium) {
    parts.push(cleanedUTM.medium);
  }
  
  if (cleanedUTM.campaign) {
    parts.push(cleanedUTM.campaign);
  }
  
  return parts.join('_') || 'unknown-campaign';
}

/**
 * Build UTM query string from cleaned UTM data
 */
export function buildUTMQueryString(cleanedUTM: CleanedUTM): string {
  const params = new URLSearchParams();
  
  if (cleanedUTM.source) params.set('utm_source', cleanedUTM.source);
  if (cleanedUTM.medium) params.set('utm_medium', cleanedUTM.medium);
  if (cleanedUTM.campaign) params.set('utm_campaign', cleanedUTM.campaign);
  if (cleanedUTM.content) params.set('utm_content', cleanedUTM.content);
  if (cleanedUTM.term) params.set('utm_term', cleanedUTM.term);
  
  return params.toString();
}
