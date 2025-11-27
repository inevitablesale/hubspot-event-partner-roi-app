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
 */
export function verifyHubSpotSignature(req: Request, res: Response, next: NextFunction): void {
  // In production, verify the X-HubSpot-Signature header
  // This is a placeholder for the actual signature verification
  const signature = req.headers['x-hubspot-signature'] as string;
  
  if (!signature && process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      error: 'Invalid signature',
      message: 'Missing or invalid HubSpot signature',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // In development, skip signature verification
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
