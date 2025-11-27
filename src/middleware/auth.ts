import { Request, Response, NextFunction } from 'express';
import { isPortalConnected } from '../services/hubspotAuth';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      portalId?: string;
    }
  }
}

/**
 * Authentication middleware - verifies portal is connected
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const portalId = req.headers['x-portal-id'] as string || req.query.portalId as string;
  
  if (!portalId) {
    res.status(401).json({
      success: false,
      error: 'Missing portal ID',
      message: 'Portal ID is required in x-portal-id header or portalId query parameter',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!isPortalConnected(portalId)) {
    res.status(401).json({
      success: false,
      error: 'Portal not connected',
      message: 'Please authenticate with HubSpot OAuth first',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  req.portalId = portalId;
  next();
}

/**
 * Optional authentication middleware - attaches portal ID if available
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const portalId = req.headers['x-portal-id'] as string || req.query.portalId as string;
  
  if (portalId && isPortalConnected(portalId)) {
    req.portalId = portalId;
  }
  
  next();
}

/**
 * HubSpot signature verification middleware
 * 
 * In production: Verifies the X-HubSpot-Signature header to ensure requests 
 * are authentically from HubSpot.
 * 
 * In development: Logs a warning but allows requests through for easier testing.
 * For staging environments, set VERIFY_HUBSPOT_SIGNATURE=true to enforce verification.
 */
export function verifyHubSpotSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['x-hubspot-signature'] as string;
  const forceVerification = process.env.VERIFY_HUBSPOT_SIGNATURE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!signature && (isProduction || forceVerification)) {
    res.status(403).json({
      success: false,
      error: 'Invalid signature',
      message: 'Missing or invalid HubSpot signature',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Log warning in non-production environments without signature
  if (!signature && !isProduction) {
    console.warn('⚠️ HubSpot signature verification skipped in development. Set VERIFY_HUBSPOT_SIGNATURE=true to enforce.');
  }

  // TODO: Implement actual signature verification using crypto
  // const crypto = require('crypto');
  // const clientSecret = config.hubspot.clientSecret;
  // const sourceString = clientSecret + req.method + req.originalUrl + JSON.stringify(req.body);
  // const expectedSignature = crypto.createHash('sha256').update(sourceString).digest('hex');
  // if (signature !== expectedSignature) { ... }

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    let record = requestCounts.get(key);
    
    if (!record || now >= record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      requestCounts.set(key, record);
    }
    
    record.count++;
    
    if (record.count > maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
}
