import { Router, Request, Response } from 'express';
import { 
  calculateEventROI,
  getEventROI,
  listEventROIs,
  compareEventROIs,
  calculatePipelineAnalytics,
  getPipelineAnalytics,
  listPipelineAnalytics,
  getEventSummary,
} from '../services/roiCalculator';
import { createAPIResponse, createPaginatedResponse } from '../utils/helpers';

const router = Router();

/**
 * POST /analytics/roi
 * Calculate ROI for an event
 */
router.post('/roi', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Validate required fields
    if (!data.eventId || !data.eventName) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'eventId and eventName are required'
      ));
      return;
    }

    if (data.totalCost === undefined || !data.metrics) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'totalCost and metrics are required'
      ));
      return;
    }

    const roi = calculateEventROI({
      eventId: data.eventId,
      eventName: data.eventName,
      totalCost: data.totalCost,
      metrics: {
        totalLeads: data.metrics.totalLeads || 0,
        qualifiedLeads: data.metrics.qualifiedLeads || 0,
        attendees: data.metrics.attendees || 0,
        opportunities: data.metrics.opportunities || 0,
        closedDeals: data.metrics.closedDeals || 0,
        totalRevenue: data.metrics.totalRevenue || 0,
        partnerContributions: data.metrics.partnerContributions,
      },
    });

    res.status(201).json(createAPIResponse(
      true,
      roi,
      `Event ROI calculated: ${roi.roiPercentage.toFixed(2)}%`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to calculate ROI'
    ));
  }
});

/**
 * GET /analytics/roi
 * List all event ROIs
 */
router.get('/roi', (_req: Request, res: Response) => {
  try {
    const rois = listEventROIs();
    res.json(createPaginatedResponse(
      true,
      rois,
      rois.length,
      1,
      100
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to list ROIs'
    ));
  }
});

/**
 * GET /analytics/roi/:eventId
 * Get ROI for a specific event
 */
router.get('/roi/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const roi = getEventROI(eventId);
    
    if (!roi) {
      res.status(404).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'ROI data not found for event'
      ));
      return;
    }

    res.json(createAPIResponse(true, roi));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get ROI'
    ));
  }
});

/**
 * POST /analytics/roi/compare
 * Compare ROI across multiple events
 */
router.post('/roi/compare', (req: Request, res: Response) => {
  try {
    const { eventIds } = req.body;
    
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'An array of eventIds is required'
      ));
      return;
    }

    const comparison = compareEventROIs(eventIds);
    
    res.json(createAPIResponse(
      true,
      comparison,
      `Compared ${comparison.events.length} events`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to compare ROIs'
    ));
  }
});

/**
 * POST /analytics/pipeline
 * Calculate pipeline analytics for an event
 */
router.post('/pipeline', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    if (!data.eventId || !data.deals || !data.startDate) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'eventId, deals array, and startDate are required'
      ));
      return;
    }

    const pipeline = calculatePipelineAnalytics({
      eventId: data.eventId,
      deals: data.deals,
      startDate: data.startDate,
    });

    res.status(201).json(createAPIResponse(
      true,
      pipeline,
      'Pipeline analytics calculated successfully'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to calculate pipeline'
    ));
  }
});

/**
 * GET /analytics/pipeline
 * List all pipeline analytics
 */
router.get('/pipeline', (_req: Request, res: Response) => {
  try {
    const pipelines = listPipelineAnalytics();
    res.json(createPaginatedResponse(
      true,
      pipelines,
      pipelines.length,
      1,
      100
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to list pipelines'
    ));
  }
});

/**
 * GET /analytics/pipeline/:eventId
 * Get pipeline analytics for a specific event
 */
router.get('/pipeline/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const pipeline = getPipelineAnalytics(eventId);
    
    if (!pipeline) {
      res.status(404).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Pipeline data not found for event'
      ));
      return;
    }

    res.json(createAPIResponse(true, pipeline));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get pipeline'
    ));
  }
});

/**
 * GET /analytics/summary/:eventId
 * Get complete event summary (ROI, pipeline, attributions)
 */
router.get('/summary/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const summary = getEventSummary(eventId);
    
    res.json(createAPIResponse(
      true,
      summary,
      'Event summary retrieved'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get summary'
    ));
  }
});

export default router;
