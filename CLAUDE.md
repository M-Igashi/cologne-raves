# cologne-raves - Project Guidelines

Community-powered electronic music event calendar for Cologne/Koeln.

## Tech Stack

- **Framework**: Astro
- **Hosting**: Cloudflare Workers (static)
- **Data**: JSON event files in data/

## Build Commands

```bash
npm install
npm run build
npm run preview
```

## URL

https://cologne.ravers.workers.dev/

## Development Guidelines

### Modifying Working Code

When modifying existing code that is currently working in production:

1. **Understand the full context** - Read the entire file/function before making changes
2. **Check variable dependencies** - Ensure any new code using existing variables is placed after their declarations
3. **Test locally before deploying** - Always run `npm run build` and verify the changes work
4. **Minimize scope of changes** - Make only the necessary changes; avoid reformatting or restructuring unrelated code
