# HubSpot Event Partner ROI App

HubSpot app that automates event lead ingestion, campaign creation, UTM cleanup, partner attribution, and event ROI calculations. Generates insights from lead quality, event-to-opportunity conversion, partner performance, and revenue influence.

## Features

- **Event Lead Ingestion**: Automatically import and process event leads into HubSpot CRM
- **Campaign Creation**: Auto-generate campaigns based on events and UTM parameters
- **UTM Cleanup**: Normalize and validate UTM tracking parameters
- **Partner Attribution**: Track and calculate partner contribution to leads and revenue
- **Lead Scoring Engine**: Score leads based on event engagement, company fit, and behavior signals
- **Event ROI Calculator**: Calculate comprehensive ROI metrics for events
- **Pipeline Analytics**: Track deal pipeline velocity and forecasting
- **CRM Cards**: Custom UI extensions for HubSpot contact, deal, and company records
- **Timeline Events**: Log key activities to contact timelines
- **OAuth Integration**: Secure HubSpot OAuth 2.0 authentication

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- HubSpot Developer Account

### Installation

```bash
# Clone the repository
git clone https://github.com/inevitablesale/hubspot-event-partner-roi-app.git
cd hubspot-event-partner-roi-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Configuration

Edit `.env` with your HubSpot app credentials:

```
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=http://localhost:3000/oauth/callback
HUBSPOT_SCOPES=crm.objects.contacts.read,crm.objects.contacts.write,crm.objects.deals.read,crm.objects.deals.write,timeline
PORT=3000
SESSION_SECRET=your_session_secret
```

### Running the App

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix
```

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/oauth/authorize` | GET | Initiate OAuth flow |
| `/oauth/callback` | GET | OAuth callback handler |
| `/oauth/status` | GET | Check connection status |
| `/oauth/disconnect` | POST | Disconnect portal |

### Lead Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads/ingest` | POST | Ingest single event lead |
| `/api/leads/batch` | POST | Batch ingest leads (max 100) |
| `/api/leads/by-event/:eventId` | GET | Get leads by event |
| `/api/leads/campaigns` | GET/POST | List/Create campaigns |
| `/api/leads/campaigns/:id` | GET/PUT | Get/Update campaign |

### Partner Attribution

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/partners/attribution` | GET/POST | List/Calculate attribution |
| `/api/partners/:partnerId/attributions` | GET | Partner's attributions |
| `/api/partners/:partnerId/performance` | GET | Aggregate performance |
| `/api/partners/by-event/:eventId` | GET | Partners for event |

### Scoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scoring/calculate` | POST | Score single lead |
| `/api/scoring/batch` | POST | Batch score leads |
| `/api/scoring/config` | GET | Get scoring configuration |

### Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/roi` | GET/POST | List/Calculate event ROI |
| `/api/analytics/roi/:eventId` | GET | Get event ROI |
| `/api/analytics/roi/compare` | POST | Compare event ROIs |
| `/api/analytics/pipeline` | GET/POST | List/Calculate pipeline |
| `/api/analytics/summary/:eventId` | GET | Full event summary |

### UTM Tools

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/utm/clean` | POST | Clean UTM parameters |
| `/api/utm/parse-url` | POST | Parse UTM from URL |
| `/api/utm/build` | POST | Build UTM query string |
| `/api/utm/validate` | POST | Validate UTM parameters |

### CRM Cards

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/crm-cards/contact/:contactId` | GET | Contact event card |
| `/crm-cards/event/:eventId/roi` | GET | Event ROI card |
| `/crm-cards/partner/:partnerId` | GET | Partner performance card |
| `/crm-cards/event/:eventId/pipeline` | GET | Pipeline card |
| `/crm-cards/deal/:dealId/attribution` | GET | Deal attribution card |

## Lead Scoring Model

The scoring engine evaluates leads on five dimensions:

| Factor | Weight | Description |
|--------|--------|-------------|
| Event Engagement | 30% | Registration, attendance, timing |
| Company Fit | 25% | Company size, industry match |
| Behavior Signals | 20% | Website visits, email engagement |
| Demographic Fit | 15% | Contact completeness, job title |
| Partner Source | 10% | Partner referral bonus |

### Score Tiers

- **Hot** (80+): High priority, ready for sales
- **Warm** (50-79): Engaged, needs nurturing
- **Cold** (< 50): Low engagement, monitor

## Project Structure

```
├── src/
│   ├── config/         # Configuration
│   ├── middleware/     # Express middleware
│   ├── routes/         # API route handlers
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── app.ts          # Express app setup
│   └── index.ts        # Main exports
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── .env.example        # Environment template
├── package.json
├── tsconfig.json
└── jest.config.js
```

## License

ISC
