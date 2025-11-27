import request from 'supertest';
import { createApp } from '../../src/app';
import { Express } from 'express';
import { clearAttributionStore } from '../../src/services/partnerAttribution';
import { clearROIStore, clearPipelineStore } from '../../src/services/roiCalculator';
import { clearCampaignStore } from '../../src/services/eventLeadService';

describe('API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    clearAttributionStore();
    clearROIStore();
    clearPipelineStore();
    clearCampaignStore();
  });

  describe('Health Check', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('UTM Endpoints', () => {
    it('POST /api/utm/clean should clean UTM parameters', async () => {
      const response = await request(app)
        .post('/api/utm/clean')
        .send({
          utmData: {
            utm_source: 'Google',
            utm_medium: 'CPC',
            utm_campaign: 'Test Campaign',
          },
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.source).toBe('google');
      expect(response.body.data.medium).toBe('cpc');
    });

    it('POST /api/utm/parse-url should parse UTM from URL', async () => {
      const response = await request(app)
        .post('/api/utm/parse-url')
        .send({
          url: 'https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=test',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.raw).toHaveProperty('utm_source');
      expect(response.body.data.cleaned).toHaveProperty('source');
    });

    it('POST /api/utm/clean should return error for missing data', async () => {
      const response = await request(app)
        .post('/api/utm/clean')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Scoring Endpoints', () => {
    it('POST /api/scoring/calculate should calculate lead score', async () => {
      const response = await request(app)
        .post('/api/scoring/calculate')
        .send({
          contactId: 'contact-123',
          lead: {
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            eventName: 'Tech Summit 2024',
            eventDate: '2024-06-15',
            eventId: 'event-456',
          },
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contactId).toBe('contact-123');
      expect(response.body.data.totalScore).toBeGreaterThan(0);
      expect(['hot', 'warm', 'cold']).toContain(response.body.data.tier);
    });

    it('POST /api/scoring/batch should batch score leads', async () => {
      const response = await request(app)
        .post('/api/scoring/batch')
        .send({
          leads: [
            { contactId: 'contact-1', lead: { email: 'test1@example.com', eventName: 'Event', eventDate: '2024-06-15', eventId: 'event-1' } },
            { contactId: 'contact-2', lead: { email: 'test2@example.com', eventName: 'Event', eventDate: '2024-06-15', eventId: 'event-1' } },
          ],
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scores).toHaveLength(2);
      expect(response.body.data.summary.total).toBe(2);
    });

    it('GET /api/scoring/config should return scoring config', async () => {
      const response = await request(app).get('/api/scoring/config');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.thresholds).toBeDefined();
      expect(response.body.data.weights).toBeDefined();
    });
  });

  describe('Partner Endpoints', () => {
    it('POST /api/partners/attribution should calculate attribution', async () => {
      const response = await request(app)
        .post('/api/partners/attribution')
        .send({
          partnerId: 'partner-123',
          partnerName: 'Test Partner',
          eventId: 'event-456',
          eventName: 'Tech Summit 2024',
          leadsGenerated: 100,
          attendees: 80,
          opportunitiesCreated: 20,
          dealsClosed: 5,
          revenueInfluenced: 50000,
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.partnerId).toBe('partner-123');
      expect(response.body.data.attributionPercentage).toBeGreaterThan(0);
    });

    it('GET /api/partners/:partnerId/attributions should list partner attributions', async () => {
      // First create an attribution
      await request(app)
        .post('/api/partners/attribution')
        .send({
          partnerId: 'partner-123',
          partnerName: 'Test Partner',
          eventId: 'event-456',
          eventName: 'Tech Summit',
          leadsGenerated: 100,
        });

      const response = await request(app).get('/api/partners/partner-123/attributions');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('GET /api/partners/:partnerId/performance should return aggregate performance', async () => {
      // Create attributions
      await request(app)
        .post('/api/partners/attribution')
        .send({
          partnerId: 'partner-123',
          partnerName: 'Test Partner',
          eventId: 'event-1',
          eventName: 'Event 1',
          leadsGenerated: 50,
          revenueInfluenced: 25000,
        });

      const response = await request(app).get('/api/partners/partner-123/performance');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalLeads).toBe(50);
      expect(response.body.data.eventsParticipated).toBe(1);
    });
  });

  describe('Analytics Endpoints', () => {
    it('POST /api/analytics/roi should calculate event ROI', async () => {
      const response = await request(app)
        .post('/api/analytics/roi')
        .send({
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
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.roi).toBe(4);
      expect(response.body.data.roiPercentage).toBe(400);
    });

    it('GET /api/analytics/roi/:eventId should return event ROI', async () => {
      // First create ROI
      await request(app)
        .post('/api/analytics/roi')
        .send({
          eventId: 'event-123',
          eventName: 'Tech Summit',
          totalCost: 10000,
          metrics: { totalLeads: 100, qualifiedLeads: 50, attendees: 80, opportunities: 20, closedDeals: 5, totalRevenue: 30000 },
        });

      const response = await request(app).get('/api/analytics/roi/event-123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBe('event-123');
    });

    it('POST /api/analytics/pipeline should calculate pipeline analytics', async () => {
      const response = await request(app)
        .post('/api/analytics/pipeline')
        .send({
          eventId: 'event-123',
          startDate: '2024-01-01',
          deals: [
            { dealId: 'deal-1', stageName: 'Qualification', stageId: 'stage-1', amount: 10000, probability: 0.2, createdAt: '2024-01-15' },
            { dealId: 'deal-2', stageName: 'Proposal', stageId: 'stage-2', amount: 25000, probability: 0.5, createdAt: '2024-01-10' },
          ],
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalPipelineValue).toBe(35000);
    });

    it('GET /api/analytics/summary/:eventId should return event summary', async () => {
      // First create some ROI data for the event
      await request(app)
        .post('/api/analytics/roi')
        .send({
          eventId: 'event-summary-test',
          eventName: 'Summary Test Event',
          totalCost: 5000,
          metrics: { totalLeads: 50, qualifiedLeads: 25, attendees: 40, opportunities: 10, closedDeals: 3, totalRevenue: 15000 },
        });

      const response = await request(app).get('/api/analytics/summary/event-summary-test');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.roi).toBeDefined();
      expect(response.body.data.roi.eventId).toBe('event-summary-test');
      expect(response.body.data).toHaveProperty('partnerAttributions');
    });
  });

  describe('Campaign Endpoints', () => {
    it('POST /api/leads/campaigns should create a campaign', async () => {
      const response = await request(app)
        .post('/api/leads/campaigns')
        .send({
          name: 'Spring Campaign',
          eventId: 'event-123',
          eventName: 'Spring Event',
          startDate: '2024-03-01',
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Spring Campaign');
      expect(response.body.data.id).toBeDefined();
    });

    it('GET /api/leads/campaigns should list campaigns', async () => {
      // Create a campaign first
      await request(app)
        .post('/api/leads/campaigns')
        .send({
          name: 'Test Campaign',
          eventId: 'event-123',
          eventName: 'Test Event',
          startDate: '2024-03-01',
        });

      const response = await request(app).get('/api/leads/campaigns');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('CRM Card Endpoints', () => {
    it('GET /crm-cards/contact/:contactId should return CRM card data', async () => {
      const response = await request(app)
        .get('/crm-cards/contact/12345')
        .query({ eventId: 'event-123', eventName: 'Test Event' });
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('GET /crm-cards/event/:eventId/roi should return ROI card', async () => {
      const response = await request(app).get('/crm-cards/event/event-123/roi');
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Route not found');
    });
  });
});
