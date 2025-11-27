import { Router, Request, Response } from 'express';
import { 
  getAuthorizationUrl, 
  exchangeCodeForTokens, 
  storeTokens, 
  getAccessTokenInfo,
  removeTokens,
  isPortalConnected
} from '../services/hubspotAuth';
import { createAPIResponse } from '../utils/helpers';
import { generateId } from '../utils/helpers';

const router = Router();

// Store state tokens for CSRF protection
const stateStore = new Map<string, { createdAt: number }>();

/**
 * GET /oauth/authorize
 * Initiates OAuth flow
 */
router.get('/authorize', (req: Request, res: Response) => {
  try {
    const state = generateId();
    stateStore.set(state, { createdAt: Date.now() });
    
    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 600000;
    for (const [key, value] of stateStore.entries()) {
      if (value.createdAt < tenMinutesAgo) {
        stateStore.delete(key);
      }
    }
    
    const authUrl = getAuthorizationUrl(state);
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Failed to initiate OAuth'
    ));
  }
});

/**
 * GET /oauth/callback
 * Handles OAuth callback from HubSpot
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code || typeof code !== 'string') {
      res.status(400).json(createAPIResponse(
        false,
        undefined,
        undefined,
        'Missing authorization code'
      ));
      return;
    }

    // Verify state parameter
    if (state && typeof state === 'string') {
      if (!stateStore.has(state)) {
        res.status(400).json(createAPIResponse(
          false,
          undefined,
          undefined,
          'Invalid state parameter'
        ));
        return;
      }
      stateStore.delete(state);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // Get portal info
    const tokenInfo = await getAccessTokenInfo(tokens.accessToken);
    const portalId = tokenInfo.hubId.toString();
    
    // Store tokens
    storeTokens(portalId, tokens);
    
    res.json(createAPIResponse(
      true,
      {
        portalId,
        connected: true,
        scopes: tokenInfo.scopes,
      },
      'Successfully connected to HubSpot'
    ));
  } catch (error) {
    res.status(500).json(createAPIResponse(
      false,
      undefined,
      undefined,
      error instanceof Error ? error.message : 'OAuth callback failed'
    ));
  }
});

/**
 * GET /oauth/status
 * Check connection status for a portal
 */
router.get('/status', (req: Request, res: Response) => {
  const portalId = req.query.portalId as string;
  
  if (!portalId) {
    res.status(400).json(createAPIResponse(
      false,
      undefined,
      undefined,
      'Portal ID is required'
    ));
    return;
  }

  const connected = isPortalConnected(portalId);
  
  res.json(createAPIResponse(
    true,
    { portalId, connected }
  ));
});

/**
 * POST /oauth/disconnect
 * Disconnect a portal
 */
router.post('/disconnect', (req: Request, res: Response) => {
  const portalId = req.body.portalId as string;
  
  if (!portalId) {
    res.status(400).json(createAPIResponse(
      false,
      undefined,
      undefined,
      'Portal ID is required'
    ));
    return;
  }

  removeTokens(portalId);
  
  res.json(createAPIResponse(
    true,
    { portalId, connected: false },
    'Successfully disconnected from HubSpot'
  ));
});

export default router;
