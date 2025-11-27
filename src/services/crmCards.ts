import { CRMCardData, CRMCardSection, CRMCardProperty } from '../types';
import { getEventROI, getPipelineAnalytics } from './roiCalculator';
import { getPartnerAttributions, getEventAttributions } from './partnerAttribution';
import { formatPercentage } from '../utils/helpers';

/**
 * Generate CRM card data for a contact's event participation
 */
export function generateContactEventCard(
  contactId: string,
  eventData: {
    eventId: string;
    eventName: string;
    eventDate: string;
    attendanceStatus: string;
    partnerId?: string;
    partnerName?: string;
    leadScore?: number;
    leadTier?: string;
  },
  appBaseUrl: string
): CRMCardData {
  const properties: CRMCardProperty[] = [
    {
      label: 'Event',
      dataType: 'STRING',
      value: eventData.eventName,
    },
    {
      label: 'Event Date',
      dataType: 'DATE',
      value: eventData.eventDate,
    },
    {
      label: 'Status',
      dataType: 'STATUS',
      value: eventData.attendanceStatus,
    },
  ];

  if (eventData.partnerId) {
    properties.push({
      label: 'Partner',
      dataType: 'STRING',
      value: eventData.partnerName || eventData.partnerId,
    });
  }

  if (eventData.leadScore !== undefined) {
    properties.push({
      label: 'Lead Score',
      dataType: 'NUMBER',
      value: eventData.leadScore,
    });
    properties.push({
      label: 'Lead Tier',
      dataType: 'STATUS',
      value: eventData.leadTier || 'Unknown',
    });
  }

  const section: CRMCardSection = {
    objectId: parseInt(contactId, 10) || 0,
    title: 'Event Participation',
    properties,
    actions: [
      {
        type: 'IFRAME',
        width: 800,
        height: 600,
        uri: `${appBaseUrl}/crm-card/contact/${contactId}/event/${eventData.eventId}`,
        label: 'View Event Details',
      },
    ],
  };

  return {
    results: [section],
    primaryAction: {
      type: 'IFRAME',
      width: 800,
      height: 600,
      uri: `${appBaseUrl}/crm-card/contact/${contactId}/events`,
      label: 'View All Events',
    },
  };
}

/**
 * Generate CRM card data for event ROI
 */
export function generateEventROICard(
  eventId: string,
  appBaseUrl: string
): CRMCardData {
  const roi = getEventROI(eventId);
  
  if (!roi) {
    return {
      results: [{
        objectId: 0,
        title: 'Event ROI',
        properties: [{
          label: 'Status',
          dataType: 'STRING',
          value: 'No ROI data available',
        }],
      }],
    };
  }

  const properties: CRMCardProperty[] = [
    {
      label: 'Event',
      dataType: 'STRING',
      value: roi.eventName,
    },
    {
      label: 'Total Cost',
      dataType: 'CURRENCY',
      value: roi.totalCost,
    },
    {
      label: 'Total Revenue',
      dataType: 'CURRENCY',
      value: roi.totalRevenue,
    },
    {
      label: 'ROI',
      dataType: 'STRING',
      value: formatPercentage(roi.roiPercentage),
    },
    {
      label: 'Total Leads',
      dataType: 'NUMBER',
      value: roi.metrics.totalLeads,
    },
    {
      label: 'Closed Deals',
      dataType: 'NUMBER',
      value: roi.metrics.closedDeals,
    },
    {
      label: 'Cost Per Lead',
      dataType: 'CURRENCY',
      value: roi.metrics.costMetrics.costPerLead,
    },
  ];

  return {
    results: [{
      objectId: 0,
      title: 'Event ROI Summary',
      properties,
      actions: [
        {
          type: 'IFRAME',
          width: 900,
          height: 700,
          uri: `${appBaseUrl}/crm-card/event/${eventId}/roi`,
          label: 'View Full ROI Report',
        },
      ],
    }],
    primaryAction: {
      type: 'IFRAME',
      width: 900,
      height: 700,
      uri: `${appBaseUrl}/crm-card/event/${eventId}/dashboard`,
      label: 'Open Event Dashboard',
    },
  };
}

/**
 * Generate CRM card data for partner performance
 */
export function generatePartnerPerformanceCard(
  partnerId: string,
  appBaseUrl: string
): CRMCardData {
  const attributions = getPartnerAttributions(partnerId);
  
  if (attributions.length === 0) {
    return {
      results: [{
        objectId: 0,
        title: 'Partner Performance',
        properties: [{
          label: 'Status',
          dataType: 'STRING',
          value: 'No attribution data available',
        }],
      }],
    };
  }

  // Calculate aggregate metrics
  const totalLeads = attributions.reduce((sum, a) => sum + a.leadsGenerated, 0);
  const totalRevenue = attributions.reduce((sum, a) => sum + a.revenueAttributed, 0);
  const avgAttribution = attributions.reduce((sum, a) => sum + a.attributionPercentage, 0) / attributions.length;

  const properties: CRMCardProperty[] = [
    {
      label: 'Partner',
      dataType: 'STRING',
      value: attributions[0]?.partnerName || partnerId,
    },
    {
      label: 'Events Participated',
      dataType: 'NUMBER',
      value: attributions.length,
    },
    {
      label: 'Total Leads Generated',
      dataType: 'NUMBER',
      value: totalLeads,
    },
    {
      label: 'Revenue Attributed',
      dataType: 'CURRENCY',
      value: totalRevenue,
    },
    {
      label: 'Avg Attribution %',
      dataType: 'STRING',
      value: formatPercentage(avgAttribution),
    },
  ];

  // Add event-specific sections
  const sections: CRMCardSection[] = [{
    objectId: 0,
    title: 'Partner Overview',
    properties,
  }];

  // Add individual event performance (limited to first 3)
  attributions.slice(0, 3).forEach((attr, index) => {
    sections.push({
      objectId: index + 1,
      title: attr.eventName,
      properties: [
        { label: 'Leads', dataType: 'NUMBER', value: attr.leadsGenerated },
        { label: 'Attendees', dataType: 'NUMBER', value: attr.attendees },
        { label: 'Revenue', dataType: 'CURRENCY', value: attr.revenueAttributed },
      ],
    });
  });

  return {
    results: sections,
    primaryAction: {
      type: 'IFRAME',
      width: 900,
      height: 700,
      uri: `${appBaseUrl}/crm-card/partner/${partnerId}/performance`,
      label: 'View Full Partner Report',
    },
  };
}

/**
 * Generate CRM card data for pipeline analytics
 */
export function generatePipelineCard(
  eventId: string,
  appBaseUrl: string
): CRMCardData {
  const pipeline = getPipelineAnalytics(eventId);
  
  if (!pipeline) {
    return {
      results: [{
        objectId: 0,
        title: 'Pipeline Analytics',
        properties: [{
          label: 'Status',
          dataType: 'STRING',
          value: 'No pipeline data available',
        }],
      }],
    };
  }

  const overviewProperties: CRMCardProperty[] = [
    {
      label: 'Total Pipeline Value',
      dataType: 'CURRENCY',
      value: pipeline.totalPipelineValue,
    },
    {
      label: 'Weighted Pipeline',
      dataType: 'CURRENCY',
      value: pipeline.weightedPipelineValue,
    },
    {
      label: 'Forecasted Revenue',
      dataType: 'CURRENCY',
      value: pipeline.forecastedRevenue,
    },
    {
      label: 'Average Deal Size',
      dataType: 'CURRENCY',
      value: pipeline.averageDealSize,
    },
    {
      label: 'Avg Sales Cycle',
      dataType: 'STRING',
      value: `${Math.round(pipeline.averageSalesCycle)} days`,
    },
  ];

  const sections: CRMCardSection[] = [{
    objectId: 0,
    title: 'Pipeline Overview',
    properties: overviewProperties,
  }];

  // Add stage breakdown
  pipeline.dealsByStage.slice(0, 5).forEach((stage, index) => {
    sections.push({
      objectId: index + 1,
      title: stage.stageName,
      properties: [
        { label: 'Deals', dataType: 'NUMBER', value: stage.dealCount },
        { label: 'Total Value', dataType: 'CURRENCY', value: stage.totalValue },
        { label: 'Probability', dataType: 'STRING', value: formatPercentage(stage.probability * 100) },
      ],
    });
  });

  return {
    results: sections,
    primaryAction: {
      type: 'IFRAME',
      width: 1000,
      height: 800,
      uri: `${appBaseUrl}/crm-card/event/${eventId}/pipeline`,
      label: 'View Pipeline Details',
    },
  };
}

/**
 * Generate CRM card for deal attribution
 */
export function generateDealAttributionCard(
  dealId: string,
  eventId: string,
  appBaseUrl: string
): CRMCardData {
  const attributions = getEventAttributions(eventId);
  const roi = getEventROI(eventId);

  const properties: CRMCardProperty[] = [
    {
      label: 'Event',
      dataType: 'STRING',
      value: roi?.eventName || 'Unknown Event',
    },
    {
      label: 'Partners Involved',
      dataType: 'NUMBER',
      value: attributions.length,
    },
  ];

  if (roi) {
    properties.push({
      label: 'Event ROI',
      dataType: 'STRING',
      value: formatPercentage(roi.roiPercentage),
    });
  }

  const sections: CRMCardSection[] = [{
    objectId: 0,
    title: 'Event Attribution',
    properties,
  }];

  // Add partner attribution details
  attributions.slice(0, 3).forEach((attr, index) => {
    sections.push({
      objectId: index + 1,
      title: attr.partnerName,
      properties: [
        { label: 'Attribution', dataType: 'STRING', value: formatPercentage(attr.attributionPercentage) },
        { label: 'Revenue Attributed', dataType: 'CURRENCY', value: attr.revenueAttributed },
      ],
    });
  });

  return {
    results: sections,
    primaryAction: {
      type: 'IFRAME',
      width: 800,
      height: 600,
      uri: `${appBaseUrl}/crm-card/deal/${dealId}/attribution`,
      label: 'View Attribution Details',
    },
  };
}
