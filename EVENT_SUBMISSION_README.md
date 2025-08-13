# Event Submission via Pull Request

This feature allows users to submit events directly from the web form at https://cologne.ravers.workers.dev/form/ as pull requests to the GitHub repository.

## Setup Instructions

### 1. Configure GitHub Token

You need to set up a GitHub Personal Access Token (PAT) with the following permissions:
- `repo` (full control of private repositories)
- `workflow` (update GitHub Actions workflows)

### 2. Add Secrets to GitHub Repository

Go to your repository Settings → Secrets and variables → Actions, and add:

- `GITHUB_TOKEN`: Your GitHub Personal Access Token (if using a PAT instead of the default token)
- `CLOUDFLARE_API_TOKEN`: Your existing Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your existing Cloudflare account ID

### 3. Configure Cloudflare Workers Environment Variable

In the Cloudflare Workers dashboard:

1. Go to your Worker (cologne)
2. Go to Settings → Variables
3. Add an environment variable:
   - Name: `GITHUB_TOKEN`
   - Value: Your GitHub Personal Access Token

### 4. Deploy the Worker

Deploy your Worker with the new function:

```bash
npm run deploy
```

## How It Works

### User Flow

1. User fills out the event form at `/form/`
2. User clicks "Submit as Pull Request"
3. The form data is sent to the `/api/submit-event` endpoint
4. The endpoint triggers a GitHub Actions workflow
5. The workflow creates a new branch, adds the event file, and opens a PR
6. Repository maintainers can review and merge the PR

### Technical Flow

1. **Frontend** (`EventForm.tsx`):
   - Collects event data
   - Validates required fields
   - Sends POST request to API endpoint

2. **API Endpoint** (`functions/api/submit-event.js`):
   - Validates the incoming data
   - Triggers GitHub Actions workflow via GitHub API
   - Returns success/error response

3. **GitHub Actions** (`create-event-pr.yml`):
   - Creates a new branch
   - Adds the JSON file to `data/` directory
   - Validates the JSON structure
   - Creates a pull request with detailed information

### File Structure

```
cologne-raves/
├── functions/
│   └── api/
│       └── submit-event.js      # Cloudflare Function endpoint
├── .github/
│   └── workflows/
│       └── create-event-pr.yml  # GitHub Actions workflow
├── src/
│   └── components/
│       └── EventForm.tsx        # Updated form component
└── data/
    └── *.json                   # Event files (PRs add here)
```

## Security Considerations

- GitHub token is stored securely in Cloudflare Workers environment
- Workflow uses `workflow_dispatch` to prevent arbitrary code execution
- All events are validated before creating PR
- PRs require manual review before merging

## Testing

1. Fill out the form with test data
2. Click "Submit as Pull Request"
3. Check the GitHub repository for the new PR
4. Review the PR content and validation status
5. Merge if everything looks correct

## Troubleshooting

### PR not created
- Check GitHub Actions tab for workflow runs
- Verify GitHub token has correct permissions
- Check Cloudflare Workers logs for API errors

### Validation failures
- Ensure all required fields are filled
- Check date format (YYYY-MM-DD)
- Check time format (HH:MM)

### API endpoint returns 500
- Verify GITHUB_TOKEN is set in Cloudflare Workers
- Check GitHub API rate limits
- Review Cloudflare Workers logs
