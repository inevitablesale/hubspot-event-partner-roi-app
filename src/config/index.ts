import dotenv from 'dotenv';

dotenv.config();

export const config = {
  hubspot: {
    clientId: process.env.HUBSPOT_CLIENT_ID || '',
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
    redirectUri: process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
    scopes: (process.env.HUBSPOT_SCOPES || 'crm.objects.contacts.read,crm.objects.contacts.write,crm.objects.deals.read,crm.objects.deals.write').split(','),
  },
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'default-session-secret',
  },
  scoring: {
    weights: {
      eventEngagement: 30,
      companyFit: 25,
      behaviorSignals: 20,
      demographicFit: 15,
      partnerSource: 10,
    },
    tiers: {
      hot: 80,
      warm: 50,
      cold: 0,
    },
  },
  utm: {
    validSources: ['google', 'facebook', 'linkedin', 'twitter', 'email', 'partner', 'direct', 'referral', 'organic'],
    validMediums: ['cpc', 'cpm', 'email', 'social', 'organic', 'referral', 'display', 'partner'],
  },
};

export default config;
