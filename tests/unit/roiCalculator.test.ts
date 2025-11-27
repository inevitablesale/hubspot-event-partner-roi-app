import {
  calculateEventROI,
  getEventROI,
  listEventROIs,
  compareEventROIs,
  calculatePipelineAnalytics,
  getPipelineAnalytics,
  clearROIStore,
  clearPipelineStore,
} from '../../src/services/roiCalculator';

describe('ROI Calculator', () => {
  beforeEach(() => {
    clearROIStore();
    clearPipelineStore();
  });

  describe('calculateEventROI', () => {
    const baseInput = {
      eventId: 'event-123',
      eventName: 'Tech Summit 2024',
      totalCost: 10000,
      metrics: {
        totalLeads: 200,
        qualifiedLeads: 100,
        attendees: 150,
        opportunities: 50,
        closedDeals: 10,
        totalRevenue: 50000,
      },
    };

    it('should calculate event ROI correctly', () => {
      const roi = calculateEventROI(baseInput);

      expect(roi.eventId).toBe('event-123');
      expect(roi.eventName).toBe('Tech Summit 2024');
      expect(roi.totalCost).toBe(10000);
      expect(roi.totalRevenue).toBe(50000);
      expect(roi.netRevenue).toBe(40000);
      expect(roi.roi).toBe(4);
      expect(roi.roiPercentage).toBe(400);
    });

    it('should calculate conversion rates', () => {
      const roi = calculateEventROI(baseInput);

      expect(roi.metrics.conversionRates.leadToAttendee).toBe(75);
      expect(roi.metrics.conversionRates.attendeeToOpportunity).toBeCloseTo(33.33, 1);
      expect(roi.metrics.conversionRates.opportunityToClose).toBe(20);
      expect(roi.metrics.conversionRates.overallConversion).toBe(5);
    });

    it('should calculate cost metrics', () => {
      const roi = calculateEventROI(baseInput);

      expect(roi.metrics.costMetrics.costPerLead).toBe(50);
      expect(roi.metrics.costMetrics.costPerAttendee).toBeCloseTo(66.67, 1);
      expect(roi.metrics.costMetrics.costPerOpportunity).toBe(200);
      expect(roi.metrics.costMetrics.costPerClosedDeal).toBe(1000);
    });

    it('should handle zero cost', () => {
      const zeroCostInput = { ...baseInput, totalCost: 0 };
      const roi = calculateEventROI(zeroCostInput);

      expect(roi.roi).toBe(0);
      expect(roi.metrics.costMetrics.costPerLead).toBe(0);
    });

    it('should store the ROI calculation', () => {
      calculateEventROI(baseInput);
      const stored = getEventROI('event-123');

      expect(stored).toBeDefined();
      expect(stored?.eventId).toBe('event-123');
    });

    it('should include partner breakdown', () => {
      const inputWithPartners = {
        ...baseInput,
        metrics: {
          ...baseInput.metrics,
          partnerContributions: [
            { partnerId: 'partner-1', partnerName: 'Partner 1', leadsContributed: 80, revenueContributed: 20000 },
            { partnerId: 'partner-2', partnerName: 'Partner 2', leadsContributed: 40, revenueContributed: 10000 },
          ],
        },
      };

      const roi = calculateEventROI(inputWithPartners);

      expect(roi.partnerBreakdown).toHaveLength(2);
      expect(roi.partnerBreakdown[0].partnerId).toBe('partner-1');
      expect(roi.partnerBreakdown[0].leadsContributed).toBe(80);
    });
  });

  describe('listEventROIs', () => {
    it('should list all event ROIs', () => {
      calculateEventROI({
        eventId: 'event-1',
        eventName: 'Event 1',
        totalCost: 5000,
        metrics: { totalLeads: 100, qualifiedLeads: 50, attendees: 80, opportunities: 20, closedDeals: 5, totalRevenue: 25000 },
      });

      calculateEventROI({
        eventId: 'event-2',
        eventName: 'Event 2',
        totalCost: 8000,
        metrics: { totalLeads: 150, qualifiedLeads: 75, attendees: 120, opportunities: 30, closedDeals: 8, totalRevenue: 40000 },
      });

      const rois = listEventROIs();
      expect(rois).toHaveLength(2);
    });
  });

  describe('compareEventROIs', () => {
    it('should compare multiple event ROIs', () => {
      calculateEventROI({
        eventId: 'event-1',
        eventName: 'Event 1',
        totalCost: 5000,
        metrics: { totalLeads: 100, qualifiedLeads: 50, attendees: 80, opportunities: 20, closedDeals: 5, totalRevenue: 25000 },
      });

      calculateEventROI({
        eventId: 'event-2',
        eventName: 'Event 2',
        totalCost: 8000,
        metrics: { totalLeads: 150, qualifiedLeads: 75, attendees: 120, opportunities: 30, closedDeals: 8, totalRevenue: 40000 },
      });

      const comparison = compareEventROIs(['event-1', 'event-2']);

      expect(comparison.events).toHaveLength(2);
      expect(comparison.bestROI).toBeDefined();
      expect(comparison.worstROI).toBeDefined();
      expect(comparison.totalRevenue).toBe(65000);
      expect(comparison.totalCost).toBe(13000);
    });

    it('should handle non-existent events', () => {
      const comparison = compareEventROIs(['non-existent']);

      expect(comparison.events).toHaveLength(0);
      expect(comparison.bestROI).toBeNull();
      expect(comparison.worstROI).toBeNull();
    });
  });

  describe('calculatePipelineAnalytics', () => {
    const basePipelineInput = {
      eventId: 'event-123',
      startDate: '2024-01-01',
      deals: [
        { dealId: 'deal-1', stageName: 'Qualification', stageId: 'stage-1', amount: 10000, probability: 0.2, createdAt: '2024-01-15' },
        { dealId: 'deal-2', stageName: 'Qualification', stageId: 'stage-1', amount: 15000, probability: 0.2, createdAt: '2024-01-20' },
        { dealId: 'deal-3', stageName: 'Proposal', stageId: 'stage-2', amount: 25000, probability: 0.5, createdAt: '2024-01-10' },
        { dealId: 'deal-4', stageName: 'Closed Won', stageId: 'stage-3', amount: 30000, probability: 1, createdAt: '2024-01-05', closedAt: '2024-02-15' },
      ],
    };

    it('should calculate pipeline analytics', () => {
      const pipeline = calculatePipelineAnalytics(basePipelineInput);

      expect(pipeline.eventId).toBe('event-123');
      expect(pipeline.totalPipelineValue).toBe(80000);
      expect(pipeline.dealsByStage).toHaveLength(3);
    });

    it('should calculate weighted pipeline value', () => {
      const pipeline = calculatePipelineAnalytics(basePipelineInput);

      // (10000*0.2) + (15000*0.2) + (25000*0.5) + (30000*1) = 2000 + 3000 + 12500 + 30000 = 47500
      expect(pipeline.weightedPipelineValue).toBe(47500);
    });

    it('should group deals by stage', () => {
      const pipeline = calculatePipelineAnalytics(basePipelineInput);

      const qualificationStage = pipeline.dealsByStage.find(s => s.stageName === 'Qualification');
      expect(qualificationStage?.dealCount).toBe(2);
      expect(qualificationStage?.totalValue).toBe(25000);
    });

    it('should calculate velocity metrics', () => {
      const pipeline = calculatePipelineAnalytics(basePipelineInput);

      expect(pipeline.velocityMetrics.leadsPerDay).toBeGreaterThan(0);
      expect(pipeline.velocityMetrics.averageTimeToClose).toBeGreaterThan(0);
    });

    it('should store pipeline analytics', () => {
      calculatePipelineAnalytics(basePipelineInput);
      const stored = getPipelineAnalytics('event-123');

      expect(stored).toBeDefined();
      expect(stored?.eventId).toBe('event-123');
    });
  });
});
