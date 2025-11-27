import { Router, Request, Response } from 'express';
import { 
  ingestEventLead, 
  batchIngestEventLeads,
  listCampaigns,
  getCampaign,
  getCampaignsByEvent,
  getCampaignsByPartner,
  createCampaign,
  updateCampaign,
  searchContactsByEvent,
} from '../services/eventLeadService';
import { requireAuth } from '../middleware/auth';
import { createAPIResponse, createPaginatedResponse, isValidEmail } from '../utils/helpers';
import { EventLead } from '../types';

const router = Router();

/**
 * POST /leads/ingest
 * Ingest a single event lead
 */
router.post('/ingest', requireAuth, async (req: Request, res: Response) => {
  try {
    const lead: EventLead = req.body;
    
    // Validate required fields
    if (!lead.email || !isValidEmail(lead.email)) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Valid email is required'
      ));
      return;
    }

    if (!lead.eventName || !lead.eventDate || !lead.eventId) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'eventName, eventDate, and eventId are required'
      ));
      return;
    }

    const result = await ingestEventLead(req.portalId!, lead);
    
    res.status(201).json(createAPIResponse(
      true,
      result,
      result.isNew ? 'New contact created' : 'Existing contact updated'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to ingest lead'
    ));
  }
});

/**
 * POST /leads/batch
 * Batch ingest multiple event leads
 */
router.post('/batch', requireAuth, async (req: Request, res: Response) => {
  try {
    const leads: EventLead[] = req.body.leads;
    
    if (!Array.isArray(leads) || leads.length === 0) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'An array of leads is required'
      ));
      return;
    }

    if (leads.length > 100) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Maximum 100 leads per batch'
      ));
      return;
    }

    const result = await batchIngestEventLeads(req.portalId!, leads);
    
    res.json(createAPIResponse(
      true,
      result,
      `Processed ${leads.length} leads: ${result.successful} successful, ${result.failed} failed`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to batch ingest leads'
    ));
  }
});

/**
 * GET /leads/by-event/:eventId
 * Get leads for a specific event
 */
router.get('/by-event/:eventId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const contacts = await searchContactsByEvent(req.portalId!, eventId);
    
    res.json(createAPIResponse(
      true,
      contacts,
      `Found ${contacts.length} contacts for event`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get leads'
    ));
  }
});

/**
 * GET /leads/campaigns
 * List all campaigns
 */
router.get('/campaigns', (_req: Request, res: Response) => {
  try {
    const campaigns = listCampaigns();
    res.json(createPaginatedResponse(
      true,
      campaigns,
      campaigns.length,
      1,
      100
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to list campaigns'
    ));
  }
});

/**
 * GET /leads/campaigns/:campaignId
 * Get a specific campaign
 */
router.get('/campaigns/:campaignId', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const campaign = getCampaign(campaignId);
    
    if (!campaign) {
      res.status(404).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Campaign not found'
      ));
      return;
    }

    res.json(createAPIResponse(true, campaign));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get campaign'
    ));
  }
});

/**
 * POST /leads/campaigns
 * Create a new campaign
 */
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaignData = req.body;
    
    if (!campaignData.name || !campaignData.eventId || !campaignData.eventName || !campaignData.startDate) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'name, eventId, eventName, and startDate are required'
      ));
      return;
    }

    const campaign = await createCampaign({
      ...campaignData,
      status: campaignData.status || 'draft',
    });

    res.status(201).json(createAPIResponse(
      true,
      campaign,
      'Campaign created successfully'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to create campaign'
    ));
  }
});

/**
 * PUT /leads/campaigns/:campaignId
 * Update a campaign
 */
router.put('/campaigns/:campaignId', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const updates = req.body;
    
    const campaign = updateCampaign(campaignId, updates);
    
    if (!campaign) {
      res.status(404).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Campaign not found'
      ));
      return;
    }

    res.json(createAPIResponse(
      true,
      campaign,
      'Campaign updated successfully'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to update campaign'
    ));
  }
});

/**
 * GET /leads/campaigns/by-event/:eventId
 * Get campaigns for a specific event
 */
router.get('/campaigns/by-event/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const campaigns = getCampaignsByEvent(eventId);
    
    res.json(createAPIResponse(
      true,
      campaigns,
      `Found ${campaigns.length} campaigns for event`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get campaigns'
    ));
  }
});

/**
 * GET /leads/campaigns/by-partner/:partnerId
 * Get campaigns for a specific partner
 */
router.get('/campaigns/by-partner/:partnerId', (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const campaigns = getCampaignsByPartner(partnerId);
    
    res.json(createAPIResponse(
      true,
      campaigns,
      `Found ${campaigns.length} campaigns for partner`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get campaigns'
    ));
  }
});

export default router;
