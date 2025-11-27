import { calculateLeadScore, batchScoreLeads, getScoreTierThresholds, getScoringWeights } from '../../src/services/scoringEngine';
import { EventLead } from '../../src/types';

describe('Scoring Engine', () => {
  describe('calculateLeadScore', () => {
    const baseEventLead: EventLead = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Inc',
      eventName: 'Tech Summit 2024',
      eventDate: '2024-06-15',
      eventId: 'event-123',
    };

    it('should calculate a basic lead score', () => {
      const score = calculateLeadScore('contact-1', baseEventLead);
      
      expect(score.contactId).toBe('contact-1');
      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
      expect(['hot', 'warm', 'cold']).toContain(score.tier);
      expect(score.calculatedAt).toBeDefined();
    });

    it('should score attended leads higher', () => {
      const registeredLead = { ...baseEventLead, attendanceStatus: 'registered' as const };
      const attendedLead = { ...baseEventLead, attendanceStatus: 'attended' as const };
      
      const registeredScore = calculateLeadScore('contact-1', registeredLead);
      const attendedScore = calculateLeadScore('contact-2', attendedLead);
      
      expect(attendedScore.breakdown.eventEngagement).toBeGreaterThan(registeredScore.breakdown.eventEngagement);
    });

    it('should give bonus for partner source', () => {
      const withPartner = { ...baseEventLead, partnerId: 'partner-123' };
      const withoutPartner = { ...baseEventLead };
      
      const withPartnerScore = calculateLeadScore('contact-1', withPartner);
      const withoutPartnerScore = calculateLeadScore('contact-2', withoutPartner);
      
      expect(withPartnerScore.breakdown.partnerSource).toBeGreaterThan(withoutPartnerScore.breakdown.partnerSource);
    });

    it('should include all breakdown components', () => {
      const score = calculateLeadScore('contact-1', baseEventLead);
      
      expect(score.breakdown).toHaveProperty('eventEngagement');
      expect(score.breakdown).toHaveProperty('companyFit');
      expect(score.breakdown).toHaveProperty('behaviorSignals');
      expect(score.breakdown).toHaveProperty('demographicFit');
      expect(score.breakdown).toHaveProperty('partnerSource');
    });

    it('should increase score for complete contact info', () => {
      const completeContact = {
        ...baseEventLead,
        phone: '+1234567890',
      };
      const incompleteContact = {
        ...baseEventLead,
        firstName: undefined,
        lastName: undefined,
      };
      
      const completeScore = calculateLeadScore('contact-1', completeContact);
      const incompleteScore = calculateLeadScore('contact-2', incompleteContact);
      
      expect(completeScore.breakdown.demographicFit).toBeGreaterThan(incompleteScore.breakdown.demographicFit);
    });

    it('should score higher with additional behavior data', () => {
      const additionalData = {
        websiteVisits: 15,
        emailOpens: 5,
        contentDownloads: 3,
      };
      
      const withData = calculateLeadScore('contact-1', baseEventLead, additionalData);
      const withoutData = calculateLeadScore('contact-2', baseEventLead);
      
      expect(withData.breakdown.behaviorSignals).toBeGreaterThan(withoutData.breakdown.behaviorSignals);
    });

    it('should assign correct tier based on score', () => {
      const thresholds = getScoreTierThresholds();
      
      // Test with high engagement lead (should be hot or warm)
      const highEngagementLead: EventLead = {
        ...baseEventLead,
        attendanceStatus: 'attended',
        partnerId: 'partner-123',
        phone: '+1234567890',
      };
      
      const highScore = calculateLeadScore('contact-1', highEngagementLead, {
        companySize: 1000,
        industry: 'technology',
        jobTitle: 'CEO',
        websiteVisits: 20,
        emailOpens: 10,
        contentDownloads: 5,
      });
      
      if (highScore.totalScore >= thresholds.hot) {
        expect(highScore.tier).toBe('hot');
      } else if (highScore.totalScore >= thresholds.warm) {
        expect(highScore.tier).toBe('warm');
      } else {
        expect(highScore.tier).toBe('cold');
      }
    });
  });

  describe('batchScoreLeads', () => {
    it('should score multiple leads', () => {
      const leads = [
        {
          contactId: 'contact-1',
          lead: {
            email: 'test1@example.com',
            eventName: 'Event 1',
            eventDate: '2024-06-15',
            eventId: 'event-1',
          },
        },
        {
          contactId: 'contact-2',
          lead: {
            email: 'test2@example.com',
            eventName: 'Event 2',
            eventDate: '2024-06-16',
            eventId: 'event-2',
          },
        },
      ];

      const scores = batchScoreLeads(leads);
      
      expect(scores).toHaveLength(2);
      expect(scores[0].contactId).toBe('contact-1');
      expect(scores[1].contactId).toBe('contact-2');
    });
  });

  describe('getScoreTierThresholds', () => {
    it('should return tier thresholds', () => {
      const thresholds = getScoreTierThresholds();
      
      expect(thresholds).toHaveProperty('hot');
      expect(thresholds).toHaveProperty('warm');
      expect(thresholds).toHaveProperty('cold');
      expect(thresholds.hot).toBeGreaterThan(thresholds.warm);
      expect(thresholds.warm).toBeGreaterThan(thresholds.cold);
    });
  });

  describe('getScoringWeights', () => {
    it('should return scoring weights', () => {
      const weights = getScoringWeights();
      
      expect(weights).toHaveProperty('eventEngagement');
      expect(weights).toHaveProperty('companyFit');
      expect(weights).toHaveProperty('behaviorSignals');
      expect(weights).toHaveProperty('demographicFit');
      expect(weights).toHaveProperty('partnerSource');
    });

    it('should have weights that sum to 100', () => {
      const weights = getScoringWeights();
      const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
      expect(total).toBe(100);
    });
  });
});
