import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import { config } from './config';
import { 
  oauthRouter, 
  leadsRouter, 
  partnersRouter, 
  scoringRouter, 
  analyticsRouter,
  crmCardsRouter,
  utmRouter,
} from './routes';
import { errorHandler, requestLogger, rateLimit } from './middleware/auth';
import { createAPIResponse } from './utils/helpers';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Session configuration
  app.use(session({
    secret: config.app.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.app.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Request logging (development only)
  if (config.app.nodeEnv === 'development') {
    app.use(requestLogger);
  }

  // Rate limiting
  app.use('/api', rateLimit(100, 60000)); // 100 requests per minute

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json(createAPIResponse(true, {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }));
  });

  // API routes
  app.use('/oauth', oauthRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/partners', partnersRouter);
  app.use('/api/scoring', scoringRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/utm', utmRouter);
  app.use('/crm-cards', crmCardsRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json(createAPIResponse(
      false,
      undefined,
      undefined,
      'Route not found'
    ));
  });

  // Error handler
  app.use(errorHandler);

  return app;
}

// Start server if this is the main module
if (require.main === module) {
  const app = createApp();
  const port = config.app.port;

  app.listen(port, () => {
    console.log(`🚀 HubSpot Event Partner ROI App running on port ${port}`);
    console.log(`📊 Environment: ${config.app.nodeEnv}`);
    console.log(`🔐 OAuth: http://localhost:${port}/oauth/authorize`);
    console.log(`❤️ Health: http://localhost:${port}/health`);
  });
}

export default createApp;
