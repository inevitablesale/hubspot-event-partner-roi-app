import { Router, Request, Response } from 'express';
import { 
  calculatePartnerAttribution,
  getPartnerAttribution,
  getPartnerAttributions,
  getEventAttributions,
  calculateAggregatePartnerPerformance,
  updatePartnerAttribution,
  deletePartnerAttribution,
  listAllAttributions,
} from '../services/partnerAttribution';
import { createAPIResponse, createPaginatedResponse } from '../utils/helpers';

const router = Router();

/**
 * POST /partners/attribution
 * Calculate and store partner attribution
 */
router.post('/attribution', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Validate required fields
    const required = ['partnerId', 'partnerName', 'eventId', 'eventName', 'leadsGenerated'];
    for (const field of required) {
      if (data[field] === undefined) {
        res.status(400).json(createAPIResponse(
          false,
          undefined,
          undefined,
          `${field} is required`
        ));
        return;
      }
    }

    const attribution = calculatePartnerAttribution({
      partnerId: data.partnerId,
      partnerName: data.partnerName,
      eventId: data.eventId,
      eventName: data.eventName,
      leadsGenerated: data.leadsGenerated || 0,
      attendees: data.attendees || 0,
      opportunitiesCreated: data.opportunitiesCreated || 0,
      dealsClosed: data.dealsClosed || 0,
      revenueInfluenced: data.revenueInfluenced || 0,
    });

    res.status(201).json(createAPIResponse(
      true,
      attribution,
      'Partner attribution calculated successfully'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to calculate attribution'
    ));
  }
});

/**
 * GET /partners/attribution
 * List all partner attributions
 */
router.get('/attribution', (_req: Request, res: Response) => {
  try {
    const attributions = listAllAttributions();
    res.json(createPaginatedResponse(
      true,
      attributions,
      attributions.length,
      1,
      100
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to list attributions'
    ));
  }
});

/**
 * GET /partners/:partnerId/attribution/:eventId
 * Get specific partner attribution for an event
 */
router.get('/:partnerId/attribution/:eventId', (req: Request, res: Response) => {
  try {
    const { partnerId, eventId } = req.params;
    const attribution = getPartnerAttribution(partnerId, eventId);
    
    if (!attribution) {
      res.status(404).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Attribution not found'
      ));
      return;
    }

    res.json(createAPIResponse(true, attribution));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get attribution'
    ));
  }
});

/**
 * GET /partners/:partnerId/attributions
 * Get all attributions for a partner
 */
router.get('/:partnerId/attributions', (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const attributions = getPartnerAttributions(partnerId);
    
    res.json(createAPIResponse(
      true,
      attributions,
      `Found ${attributions.length} attributions for partner`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get attributions'
    ));
  }
});

/**
 * GET /partners/:partnerId/performance
 * Get aggregate performance for a partner
 */
router.get('/:partnerId/performance', (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const performance = calculateAggregatePartnerPerformance(partnerId);
    
    res.json(createAPIResponse(
      true,
      { partnerId, ...performance }
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to calculate performance'
    ));
  }
});

/**
 * PUT /partners/:partnerId/attribution/:eventId
 * Update partner attribution
 */
router.put('/:partnerId/attribution/:eventId', (req: Request, res: Response) => {
  try {
    const { partnerId, eventId } = req.params;
    const updates = req.body;
    
    const attribution = updatePartnerAttribution(partnerId, eventId, updates);
    
    if (!attribution) {
      res.status(404).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Attribution not found'
      ));
      return;
    }

    res.json(createAPIResponse(
      true,
      attribution,
      'Attribution updated successfully'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to update attribution'
    ));
  }
});

/**
 * DELETE /partners/:partnerId/attribution/:eventId
 * Delete partner attribution
 */
router.delete('/:partnerId/attribution/:eventId', (req: Request, res: Response) => {
  try {
    const { partnerId, eventId } = req.params;
    const deleted = deletePartnerAttribution(partnerId, eventId);
    
    if (!deleted) {
      res.status(404).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Attribution not found'
      ));
      return;
    }

    res.json(createAPIResponse(
      true,
      { partnerId, eventId },
      'Attribution deleted successfully'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to delete attribution'
    ));
  }
});

/**
 * GET /partners/by-event/:eventId
 * Get all partners for a specific event
 */
router.get('/by-event/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const attributions = getEventAttributions(eventId);
    
    res.json(createAPIResponse(
      true,
      attributions,
      `Found ${attributions.length} partner attributions for event`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get partners'
    ));
  }
});

export default router;
