import { Router, Request, Response } from 'express';
import { 
  generateContactEventCard,
  generateEventROICard,
  generatePartnerPerformanceCard,
  generatePipelineCard,
  generateDealAttributionCard,
} from '../services/crmCards';
import { verifyHubSpotSignature } from '../middleware/auth';
import { createAPIResponse } from '../utils/helpers';
import { config } from '../config';

const router = Router();

// Base URL for CRM card actions
const getAppBaseUrl = (req: Request): string => {
  const protocol = req.protocol;
  const host = req.get('host') || `localhost:${config.app.port}`;
  return `${protocol}://${host}`;
};

/**
 * GET /crm-cards/contact/:contactId
 * CRM card for contact event participation
 */
router.get('/contact/:contactId', verifyHubSpotSignature, (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    
    // In a real implementation, fetch event data from HubSpot or local storage
    // This is a demo response
    const eventData = {
      eventId: req.query.eventId as string || 'demo-event-1',
      eventName: req.query.eventName as string || 'Demo Event',
      eventDate: req.query.eventDate as string || new Date().toISOString(),
      attendanceStatus: req.query.attendanceStatus as string || 'registered',
      partnerId: req.query.partnerId as string,
      partnerName: req.query.partnerName as string,
      leadScore: req.query.leadScore ? parseInt(req.query.leadScore as string, 10) : undefined,
      leadTier: req.query.leadTier as string,
    };

    const cardData = generateContactEventCard(
      contactId,
      eventData,
      getAppBaseUrl(req)
    );

    res.json(cardData);
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to generate CRM card'
    ));
  }
});

/**
 * GET /crm-cards/event/:eventId/roi
 * CRM card for event ROI
 */
router.get('/event/:eventId/roi', verifyHubSpotSignature, (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const cardData = generateEventROICard(eventId, getAppBaseUrl(req));
    res.json(cardData);
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to generate ROI card'
    ));
  }
});

/**
 * GET /crm-cards/partner/:partnerId
 * CRM card for partner performance
 */
router.get('/partner/:partnerId', verifyHubSpotSignature, (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const cardData = generatePartnerPerformanceCard(partnerId, getAppBaseUrl(req));
    res.json(cardData);
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to generate partner card'
    ));
  }
});

/**
 * GET /crm-cards/event/:eventId/pipeline
 * CRM card for event pipeline
 */
router.get('/event/:eventId/pipeline', verifyHubSpotSignature, (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const cardData = generatePipelineCard(eventId, getAppBaseUrl(req));
    res.json(cardData);
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to generate pipeline card'
    ));
  }
});

/**
 * GET /crm-cards/deal/:dealId/attribution
 * CRM card for deal attribution
 */
router.get('/deal/:dealId/attribution', verifyHubSpotSignature, (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const eventId = req.query.eventId as string || 'unknown';
    const cardData = generateDealAttributionCard(dealId, eventId, getAppBaseUrl(req));
    res.json(cardData);
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to generate attribution card'
    ));
  }
});

export default router;
