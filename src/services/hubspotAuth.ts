import { Client } from '@hubspot/api-client';
import { config } from '../config';
import { OAuthTokens } from '../types';

let hubspotClient: Client | null = null;
let tokenStore: Map<string, OAuthTokens> = new Map();

/**
 * Get the authorization URL for HubSpot OAuth
 */
export function getAuthorizationUrl(state?: string): string {
  const client = new Client();
  return client.oauth.getAuthorizationUrl(
    config.hubspot.clientId,
    config.hubspot.redirectUri,
    config.hubspot.scopes.join(' '),
    state
  );
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const client = new Client();
  
  const result = await client.oauth.tokensApi.create(
    'authorization_code',
    code,
    config.hubspot.redirectUri,
    config.hubspot.clientId,
    config.hubspot.clientSecret
  );

  const tokens: OAuthTokens = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + (result.expiresIn * 1000),
    tokenType: result.tokenType,
  };

  return tokens;
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const client = new Client();
  
  const result = await client.oauth.tokensApi.create(
    'refresh_token',
    undefined,
    undefined,
    config.hubspot.clientId,
    config.hubspot.clientSecret,
    refreshToken
  );

  const tokens: OAuthTokens = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + (result.expiresIn * 1000),
    tokenType: result.tokenType,
  };

  return tokens;
}

/**
 * Store tokens for a portal
 */
export function storeTokens(portalId: string, tokens: OAuthTokens): void {
  tokenStore.set(portalId, tokens);
}

/**
 * Get tokens for a portal
 */
export function getTokens(portalId: string): OAuthTokens | undefined {
  return tokenStore.get(portalId);
}

/**
 * Remove tokens for a portal
 */
export function removeTokens(portalId: string): void {
  tokenStore.delete(portalId);
}

/**
 * Get an authenticated HubSpot client
 */
export async function getHubSpotClient(portalId: string): Promise<Client> {
  const tokens = tokenStore.get(portalId);
  
  if (!tokens) {
    throw new Error('No tokens found for portal');
  }

  // Check if token is expired or about to expire (within 5 minutes)
  if (Date.now() >= tokens.expiresAt - 300000) {
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    storeTokens(portalId, newTokens);
    tokens.accessToken = newTokens.accessToken;
  }

  hubspotClient = new Client({ accessToken: tokens.accessToken });
  return hubspotClient;
}

/**
 * Get access token info
 */
export async function getAccessTokenInfo(accessToken: string): Promise<{
  hubId: number;
  userId: number;
  appId: number;
  expiresIn: number;
  scopes: string[];
}> {
  const client = new Client({ accessToken });
  const result = await client.oauth.accessTokensApi.get(accessToken);
  
  return {
    hubId: result.hubId,
    userId: result.userId,
    appId: result.appId,
    expiresIn: result.expiresIn,
    scopes: result.scopes,
  };
}

/**
 * Check if portal is connected
 */
export function isPortalConnected(portalId: string): boolean {
  const tokens = tokenStore.get(portalId);
  return !!tokens && Date.now() < tokens.expiresAt;
}

/**
 * Clear token store (for testing)
 */
export function clearTokenStore(): void {
  tokenStore = new Map();
}
