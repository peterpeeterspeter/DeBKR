# Badkamer Configurator

AI-powered bathroom renovation configurator with intelligent analysis, product selection, layout validation, and pricing calculation.

## Features

- Photo upload and AI analysis of existing bathroom
- Interactive product catalog with filtering
- Layout validation with fit warnings
- AI-powered after-image generation (structure-preserving)
- Automatic work plan generation
- Contractor-based pricing calculation
- Admin approval workflow
- Complete audit trail

## Architecture

### Backend (Flask + Python)
- Flask REST API
- Supabase for data persistence and storage
- Google Gemini AI for vision analysis and generation
- LangChain for AI workflows

### Frontend (React + Vite)
- React 18 with React Router
- Modern, responsive UI
- Real-time validation and feedback
- Progress tracking through 7-step workflow

### Database (Supabase PostgreSQL)
- Normalized schema with RLS policies
- Storage buckets for images
- Complete audit trail

## Prerequisites

- Python 3.9+
- Node.js 18+
- Supabase account
- Google Gemini API key (optional for AI features)

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Note your project URL and service role key
3. The database schema and storage buckets are created automatically via migrations

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Load mock catalog data into Supabase
python badkamerconfigurator/scripts/load_mock_catalog.py

# Start Flask API
cd badkamerconfigurator
python server/api.py
```

The backend will run on http://localhost:5001

### 4. Frontend Setup

```bash
# Install Node dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on http://localhost:3000

## Usage Workflow

### User Flow

1. **Intake** (`/intake`)
   - Upload bathroom photo
   - Enter room dimensions
   - AI analyzes fixtures and plumbing

2. **Catalog** (`/catalog`)
   - Browse product catalog
   - Filter by category
   - Select up to 13 products (14 image limit: 1 room + 13 products)

3. **Layout** (`/layout`)
   - Validate product fit
   - Check clearance warnings
   - Generate AfterState

4. **Visualize** (`/visualize`)
   - AI generates structure-preserving after-image
   - Request up to 5 variants
   - Select final approved image

5. **Work Plan** (`/workplan`)
   - AI generates phased work plan
   - View estimated hours per task
   - Review risk flags

6. **Pricing** (`/pricing`)
   - Calculate contractor pricing
   - Regional multipliers applied
   - Material costs included
   - View detailed breakdown

7. **Review** (`/review`)
   - Complete project summary
   - Submit for admin approval

### Admin Flow

Navigate to `/admin` to:
- View all pending projects
- Review complete project details
- Approve or reject with notes

## API Endpoints

### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details

### Upload & Analysis
- `POST /api/upload` - Upload bathroom photo
- `POST /api/before` - Analyze before-state with AI

### Catalog & Selection
- `GET /api/catalog` - Fetch product catalog
- `POST /api/selection` - Submit product selection

### Generation
- `POST /api/image` - Generate after-image
- `POST /api/workplan` - Generate work plan
- `POST /api/pricing` - Calculate pricing

### Admin
- `GET /api/admin/projects` - Get pending projects
- `POST /api/admin/approve` - Approve/reject project

## Configuration

### Pricing Configuration

Edit `badkamerconfigurator/data/mock/pricing.json`:

```json
{
  "labor_hour_base": 75,
  "region_multiplier": {
    "nl_randstad": 1.2,
    "be_vlaanderen": 1.05
  },
  "contingency_percent": 10
}
```

### Catalog Management

Products are stored in Supabase `catalog_items` table. To add products:

1. Prepare CSV with columns: product_id, name, category, price_eur, image_url
2. Run ingestion script:

```bash
python badkamerconfigurator/scripts/ingest_catalog_supabase.py catalog.csv
```

## AI Features

### With GEMINI_API_KEY

The system uses **Gemini 3 Pro** with **thinking_level="high"** for intelligent bathroom analysis:

**Before-state Analysis:**
- Uses `thinking_level: "high"` for deep reasoning and accurate fixture detection
- Analyzes bathroom photos with structured JSON output via `response_schema`
- Automatically detects toilet, washbasin, shower, bathtub with positions
- Intelligent estimation of water inlet and waste outlet positions
- Provides confidence levels (low/medium/high) for plumbing estimates
- Detects room shape (rectangular, l_shaped, irregular)
- Identifies entrance position and dimensions
- Model: `gemini-3-pro-preview` with 1M token context window

**Other AI Features:**
- Work plan generation via LangChain workflows
- Structure-preserving image generation (preserves walls, doors, windows)
- Variant generation (up to 5 different visualizations)

The high thinking level ensures accurate analysis even in complex bathroom layouts.

### Without GEMINI_API_KEY (Mock Mode)

- Mock before-state analysis with default fixture positions
- Manual product selection
- Example work plans with standard phases
- No AI-powered image generation

## Development

### Build for Production

```bash
npm run build
```

### Project Structure

```
project/
├── badkamerconfigurator/
│   ├── ai/                    # AI modules
│   │   ├── before.py          # Before-state analysis
│   │   ├── chains.py          # LangChain workflows
│   │   ├── image_generation.py # Image generation
│   │   ├── layout.py          # Layout validation
│   │   ├── pricing.py         # Pricing calculation
│   │   └── supabase_client.py # Database client
│   ├── data/mock/            # Mock data
│   ├── docs/                 # Documentation
│   ├── schemas/              # JSON schemas
│   ├── scripts/              # Utility scripts
│   └── server/
│       └── api.py            # Flask REST API
├── src/
│   ├── components/           # React components
│   ├── pages/                # Page components
│   ├── api.js                # API client
│   └── main.jsx              # Entry point
├── package.json
├── vite.config.js
└── requirements.txt
```

## Constraints & Limits

- **14 image limit**: 1 room photo + max 13 product images
- **5 variant limit**: Maximum AI-generated image variants per project
- **File uploads**: Max 16MB per file
- **Image generation**: Requires GEMINI_API_KEY, takes 30-60 seconds

## Testing

### Test Gemini Analysis

Test the before-state analysis with or without AI:

```bash
# Test with mock mode (no API key required)
python badkamerconfigurator/scripts/test_gemini_analysis.py

# Test with real API (requires GEMINI_API_KEY)
export GEMINI_API_KEY=your_key_here
python badkamerconfigurator/scripts/test_gemini_analysis.py

# Show the BeforeState schema
python badkamerconfigurator/scripts/test_gemini_analysis.py --schema
```

### Test Complete Flow

```bash
# Load mock catalog
python badkamerconfigurator/scripts/load_mock_catalog.py

# Start backend
python badkamerconfigurator/server/api.py

# In another terminal, start frontend
npm run dev

# Navigate to http://localhost:3000
```

## Troubleshooting

### Backend won't start
- Check Python version (3.9+)
- Verify all environment variables are set
- Run `pip install -r requirements.txt`
- Install google-genai: `pip install google-genai>=1.0.0`

### Frontend won't start
- Check Node version (18+)
- Run `npm install`
- Clear node_modules and reinstall if needed

### Database errors
- Verify Supabase credentials in `.env`
- Check migrations were applied automatically
- Ensure RLS policies are active (view in Supabase dashboard)
- Check storage buckets exist

### AI features not working
- Verify `GEMINI_API_KEY` is set in `.env`
- Check API quota limits at https://aistudio.google.com
- Test with mock mode first (uncheck "Gebruik AI analyse")
- Check model availability: `gemini-3-pro-preview`
- View detailed error logs in Flask console

### Gemini 3 Issues
- Ensure you're using `google-genai>=1.0.0` (not `google-generativeai`)
- Use `thinking_level="high"` (not `thinking_budget`)
- Keep `temperature=1.0` (don't lower it - causes looping in Gemini 3)
- Structured output requires recent API version
- Check image file size (max 16MB)
- Verify image format (JPEG, PNG supported)

## License

Proprietary - All rights reserved

## Support

For questions or issues, contact the development team.
