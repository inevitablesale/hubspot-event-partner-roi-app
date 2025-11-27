import {
  calculatePartnerAttribution,
  getPartnerAttribution,
  getPartnerAttributions,
  getEventAttributions,
  calculateAggregatePartnerPerformance,
  updatePartnerAttribution,
  deletePartnerAttribution,
  clearAttributionStore,
  listAllAttributions,
} from '../../src/services/partnerAttribution';

describe('Partner Attribution', () => {
  beforeEach(() => {
    clearAttributionStore();
  });

  describe('calculatePartnerAttribution', () => {
    const baseData = {
      partnerId: 'partner-123',
      partnerName: 'Test Partner',
      eventId: 'event-456',
      eventName: 'Tech Summit 2024',
      leadsGenerated: 100,
      attendees: 80,
      opportunitiesCreated: 20,
      dealsClosed: 5,
      revenueInfluenced: 50000,
    };

    it('should calculate partner attribution', () => {
      const attribution = calculatePartnerAttribution(baseData);

      expect(attribution.partnerId).toBe('partner-123');
      expect(attribution.partnerName).toBe('Test Partner');
      expect(attribution.eventId).toBe('event-456');
      expect(attribution.eventName).toBe('Tech Summit 2024');
      expect(attribution.leadsGenerated).toBe(100);
      expect(attribution.attendees).toBe(80);
      expect(attribution.opportunitiesCreated).toBe(20);
      expect(attribution.dealsClosed).toBe(5);
      expect(attribution.revenueInfluenced).toBe(50000);
      expect(attribution.revenueAttributed).toBeGreaterThan(0);
      expect(attribution.attributionPercentage).toBeGreaterThan(0);
      expect(attribution.calculatedAt).toBeDefined();
    });

    it('should store the attribution', () => {
      calculatePartnerAttribution(baseData);
      const stored = getPartnerAttribution('partner-123', 'event-456');
      
      expect(stored).toBeDefined();
      expect(stored?.partnerId).toBe('partner-123');
    });

    it('should calculate higher attribution for better performance', () => {
      const lowPerformance = calculatePartnerAttribution({
        ...baseData,
        leadsGenerated: 10,
        attendees: 5,
        opportunitiesCreated: 1,
        dealsClosed: 0,
      });

      const highPerformance = calculatePartnerAttribution({
        ...baseData,
        partnerId: 'partner-456',
        leadsGenerated: 200,
        attendees: 180,
        opportunitiesCreated: 50,
        dealsClosed: 25,
      });

      expect(highPerformance.attributionPercentage).toBeGreaterThan(lowPerformance.attributionPercentage);
    });
  });

  describe('getPartnerAttribution', () => {
    it('should return undefined for non-existent attribution', () => {
      const result = getPartnerAttribution('non-existent', 'non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getPartnerAttributions', () => {
    it('should return all attributions for a partner', () => {
      calculatePartnerAttribution({
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        eventId: 'event-1',
        eventName: 'Event 1',
        leadsGenerated: 50,
        attendees: 40,
        opportunitiesCreated: 10,
        dealsClosed: 5,
        revenueInfluenced: 25000,
      });

      calculatePartnerAttribution({
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        eventId: 'event-2',
        eventName: 'Event 2',
        leadsGenerated: 75,
        attendees: 60,
        opportunitiesCreated: 15,
        dealsClosed: 8,
        revenueInfluenced: 40000,
      });

      const attributions = getPartnerAttributions('partner-1');
      
      expect(attributions).toHaveLength(2);
      expect(attributions.every(a => a.partnerId === 'partner-1')).toBe(true);
    });
  });

  describe('getEventAttributions', () => {
    it('should return all attributions for an event', () => {
      calculatePartnerAttribution({
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        eventId: 'event-1',
        eventName: 'Event 1',
        leadsGenerated: 50,
        attendees: 40,
        opportunitiesCreated: 10,
        dealsClosed: 5,
        revenueInfluenced: 25000,
      });

      calculatePartnerAttribution({
        partnerId: 'partner-2',
        partnerName: 'Partner 2',
        eventId: 'event-1',
        eventName: 'Event 1',
        leadsGenerated: 30,
        attendees: 25,
        opportunitiesCreated: 8,
        dealsClosed: 3,
        revenueInfluenced: 15000,
      });

      const attributions = getEventAttributions('event-1');
      
      expect(attributions).toHaveLength(2);
      expect(attributions.every(a => a.eventId === 'event-1')).toBe(true);
    });
  });

  describe('calculateAggregatePartnerPerformance', () => {
    it('should calculate aggregate performance across events', () => {
      calculatePartnerAttribution({
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        eventId: 'event-1',
        eventName: 'Event 1',
        leadsGenerated: 50,
        attendees: 40,
        opportunitiesCreated: 10,
        dealsClosed: 5,
        revenueInfluenced: 25000,
      });

      calculatePartnerAttribution({
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        eventId: 'event-2',
        eventName: 'Event 2',
        leadsGenerated: 75,
        attendees: 60,
        opportunitiesCreated: 15,
        dealsClosed: 8,
        revenueInfluenced: 40000,
      });

      const performance = calculateAggregatePartnerPerformance('partner-1');
      
      expect(performance.totalLeads).toBe(125);
      expect(performance.totalAttendees).toBe(100);
      expect(performance.totalOpportunities).toBe(25);
      expect(performance.totalDeals).toBe(13);
      expect(performance.totalRevenueInfluenced).toBe(65000);
      expect(performance.eventsParticipated).toBe(2);
    });

    it('should return zeros for non-existent partner', () => {
      const performance = calculateAggregatePartnerPerformance('non-existent');
      
      expect(performance.totalLeads).toBe(0);
      expect(performance.eventsParticipated).toBe(0);
    });
  });

  describe('updatePartnerAttribution', () => {
    it('should update an existing attribution', () => {
      calculatePartnerAttribution({
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        eventId: 'event-1',
        eventName: 'Event 1',
        leadsGenerated: 50,
        attendees: 40,
        opportunitiesCreated: 10,
        dealsClosed: 5,
        revenueInfluenced: 25000,
      });

      const updated = updatePartnerAttribution('partner-1', 'event-1', {
        leadsGenerated: 75,
        attendees: 60,
      });

      expect(updated).toBeDefined();
      expect(updated?.leadsGenerated).toBe(75);
      expect(updated?.attendees).toBe(60);
    });

    it('should return undefined for non-existent attribution', () => {
      const result = updatePartnerAttribution('non-existent', 'non-existent', {});
      expect(result).toBeUndefined();
    });
  });

  describe('deletePartnerAttribution', () => {
    it('should delete an existing attribution', () => {
      calculatePartnerAttribution({
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        eventId: 'event-1',
        eventName: 'Event 1',
        leadsGenerated: 50,
        attendees: 40,
        opportunitiesCreated: 10,
        dealsClosed: 5,
        revenueInfluenced: 25000,
      });

      const result = deletePartnerAttribution('partner-1', 'event-1');
      
      expect(result).toBe(true);
      expect(getPartnerAttribution('partner-1', 'event-1')).toBeUndefined();
    });

    it('should return false for non-existent attribution', () => {
      const result = deletePartnerAttribution('non-existent', 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('listAllAttributions', () => {
    it('should list all attributions', () => {
      calculatePartnerAttribution({
        partnerId: 'partner-1',
        partnerName: 'Partner 1',
        eventId: 'event-1',
        eventName: 'Event 1',
        leadsGenerated: 50,
        attendees: 40,
        opportunitiesCreated: 10,
        dealsClosed: 5,
        revenueInfluenced: 25000,
      });

      calculatePartnerAttribution({
        partnerId: 'partner-2',
        partnerName: 'Partner 2',
        eventId: 'event-2',
        eventName: 'Event 2',
        leadsGenerated: 30,
        attendees: 25,
        opportunitiesCreated: 8,
        dealsClosed: 3,
        revenueInfluenced: 15000,
      });

      const all = listAllAttributions();
      
      expect(all).toHaveLength(2);
    });
  });
});
