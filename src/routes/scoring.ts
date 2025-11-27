import { Router, Request, Response } from 'express';
import { calculateLeadScore, batchScoreLeads, getScoreTierThresholds, getScoringWeights } from '../services/scoringEngine';
import { createAPIResponse } from '../utils/helpers';
import { EventLead } from '../types';

const router = Router();

/**
 * POST /scoring/calculate
 * Calculate score for a single lead
 */
router.post('/calculate', (req: Request, res: Response) => {
  try {
    const { contactId, lead, additionalData } = req.body;
    
    if (!contactId || !lead) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'contactId and lead are required'
      ));
      return;
    }

    // Validate lead data
    if (!lead.email || !lead.eventName || !lead.eventId) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'lead must include email, eventName, and eventId'
      ));
      return;
    }

    const score = calculateLeadScore(contactId, lead as EventLead, additionalData);
    
    res.json(createAPIResponse(
      true,
      score,
      `Lead scored: ${score.totalScore} (${score.tier})`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to calculate score'
    ));
  }
});

/**
 * POST /scoring/batch
 * Calculate scores for multiple leads
 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const { leads } = req.body;
    
    if (!Array.isArray(leads) || leads.length === 0) {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'An array of leads with contactId and lead data is required'
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

    const scores = batchScoreLeads(leads);
    
    // Calculate summary
    const tierCounts = {
      hot: scores.filter(s => s.tier === 'hot').length,
      warm: scores.filter(s => s.tier === 'warm').length,
      cold: scores.filter(s => s.tier === 'cold').length,
    };
    const averageScore = scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length;

    res.json(createAPIResponse(
      true,
      {
        scores,
        summary: {
          total: scores.length,
          averageScore: Math.round(averageScore * 100) / 100,
          tierCounts,
        },
      },
      `Scored ${scores.length} leads`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to batch score leads'
    ));
  }
});

/**
 * GET /scoring/config
 * Get scoring configuration
 */
router.get('/config', (_req: Request, res: Response) => {
  try {
    const thresholds = getScoreTierThresholds();
    const weights = getScoringWeights();
    
    res.json(createAPIResponse(
      true,
      {
        thresholds,
        weights,
        description: {
          eventEngagement: 'Score based on event registration and attendance',
          companyFit: 'Score based on company size and industry fit',
          behaviorSignals: 'Score based on website visits, email opens, etc.',
          demographicFit: 'Score based on contact completeness and job title',
          partnerSource: 'Bonus score for partner-referred leads',
        },
      }
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to get config'
    ));
  }
});

export default router;
