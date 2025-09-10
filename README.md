# Cologne Raves

Event tracking and management system for Cologne's music scene.

## Tech Stack

- **Framework**: Astro
- **Styling**: Tailwind CSS
- **Components**: React
- **Hosting**: Cloudflare Workers
- **CI/CD**: GitHub Actions

## Project Structure

```
cologne-raves/
├── src/
│   ├── components/    # React and Astro components
│   ├── pages/         # Application pages
│   ├── styles/        # Global styles
│   └── utils/         # Utility functions
├── data/              # Event data JSON files
├── public/            # Static assets
└── workers-site/      # Cloudflare Workers configuration
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

## Data Management

Event data is stored in JSON files in the `data/` directory. Each file represents events for a specific week.

### JSON Schema

Events follow the schema defined in `event.schema.json`.

## GitHub Actions

- **Main branch**: Automatic deployment to Cloudflare Workers
- **Pull requests**: JSON schema validation only

## License

Private repository - All rights reserved
