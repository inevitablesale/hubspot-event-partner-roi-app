import { Router, Request, Response } from 'express';
import { cleanUTMParameters, parseUTMFromURL, buildUTMQueryString, generateCampaignNameFromUTM } from '../utils/utm';
import { createAPIResponse } from '../utils/helpers';

const router = Router();

/**
 * POST /utm/clean
 * Clean and normalize UTM parameters
 */
router.post('/clean', (req: Request, res: Response) => {
  try {
    const { utmData } = req.body;
    
    if (!utmData || typeof utmData !== 'object') {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'utmData object is required'
      ));
      return;
    }

    const cleaned = cleanUTMParameters(utmData);
    
    res.json(createAPIResponse(
      true,
      cleaned,
      cleaned.isValid ? 'UTM parameters are valid' : `UTM issues found: ${cleaned.issues.join(', ')}`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to clean UTM parameters'
    ));
  }
});

/**
 * POST /utm/parse-url
 * Parse UTM parameters from a URL
 */
router.post('/parse-url', (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'URL string is required'
      ));
      return;
    }

    const parsed = parseUTMFromURL(url);
    const cleaned = cleanUTMParameters(parsed);
    
    res.json(createAPIResponse(
      true,
      {
        raw: parsed,
        cleaned,
      },
      `Parsed ${Object.keys(parsed).length} UTM parameters`
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to parse URL'
    ));
  }
});

/**
 * POST /utm/build
 * Build UTM query string from cleaned UTM data
 */
router.post('/build', (req: Request, res: Response) => {
  try {
    const { utmData, eventName } = req.body;
    
    if (!utmData || typeof utmData !== 'object') {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'utmData object is required'
      ));
      return;
    }

    const cleaned = cleanUTMParameters(utmData);
    const queryString = buildUTMQueryString(cleaned);
    const campaignName = generateCampaignNameFromUTM(cleaned, eventName || '');
    
    res.json(createAPIResponse(
      true,
      {
        cleaned,
        queryString,
        suggestedCampaignName: campaignName,
      }
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to build UTM'
    ));
  }
});

/**
 * POST /utm/validate
 * Validate UTM parameters
 */
router.post('/validate', (req: Request, res: Response) => {
  try {
    const { utmData } = req.body;
    
    if (!utmData || typeof utmData !== 'object') {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'utmData object is required'
      ));
      return;
    }

    const cleaned = cleanUTMParameters(utmData);
    
    res.json(createAPIResponse(
      true,
      {
        isValid: cleaned.isValid,
        issues: cleaned.issues,
        cleaned,
      },
      cleaned.isValid ? 'UTM parameters are valid' : 'UTM parameters have issues'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to validate UTM'
    ));
  }
});

export default router;
