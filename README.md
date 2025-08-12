# Shopify AI Agent Readiness Audit

A Next.js application that audits Shopify stores for AI agent readiness by connecting to MCP (Model Context Protocol) endpoints and evaluating various readiness criteria.

## Features

- **MCP Integration**: Connects to Shopify MCP endpoints to fetch product data
- **Comprehensive Scoring**: Evaluates stores across 5 key areas:
  - Data Completeness (35 pts)
  - Filters/Facets (20 pts) 
  - Policies Tool (25 pts)
  - Media Accessibility (10 pts)
  - Reliability (10 pts)
- **Real-time Audit**: Live chat-style interface showing audit progress
- **Single Service**: Frontend and backend unified in one Next.js app

## Prerequisites

- Node.js 18+ 
- npm or yarn
- A Shopify store with MCP endpoint enabled

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shopify-ai-agent-readiness-audit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## Usage

1. Enter your Shopify store URL (e.g., `https://yourstore.myshopify.com`)
2. Click "Run Audit" 
3. Watch the real-time audit progress
4. Review your AI Agent Readiness Score and breakdown

## API Endpoints

The app includes several Next.js API routes:

- `/api/mcp/connect` - Establishes MCP connection
- `/api/mcp/tool` - Executes MCP tools
- `/api/mcp/disconnect` - Closes MCP connection  
- `/api/fetch-file` - Fetches external files (robots.txt, etc.)

## Architecture

- **Frontend**: React with Next.js, Framer Motion for animations
- **Backend**: Next.js API routes
- **MCP Client**: @modelcontextprotocol/sdk for Shopify integration
- **Styling**: Tailwind CSS

## Scoring Criteria

### Data Completeness (35 points)
- Price & currency formats (7 pts)
- Availability enum validation (7 pts) 
- Variants completeness (7 pts)
- Product identity fields (7 pts)
- Image alt text coverage (7 pts)

### Filters/Facets (20 points)
- Number of available product filters

### Policies Tool (25 points)
- Presence of searchable policies/FAQs

### Media Accessibility (10 points)
- robots.txt presence (3 pts)
- sitemap.xml presence (3 pts)
- llms.txt presence (4 pts)

### Reliability (10 points)
- MCP connection stability

## Development

```bash
# Development with hot reload
npm run dev

# Type checking
npm run build

# Production server
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to ensure no TypeScript errors
5. Submit a pull request

## License

MIT License
