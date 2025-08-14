import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false;

addEventListener('fetch', (event) => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Handle API routes
  if (url.pathname === '/api/submit-event') {
    return handleAPIRequest(request, event);
  }

  // Serve static assets
  try {
    if (DEBUG) {
      // customize caching
      return await getAssetFromKV(event, {});
    }
    const options = {};
    return await getAssetFromKV(event, options);
  } catch (e) {
    // if an error is thrown try to serve the asset at 404.html
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: (req) => new Request(`${new URL(req.url).origin}/404.html`, req),
        });

        return new Response(notFoundResponse.body, {
          ...notFoundResponse,
          status: 404,
        });
      } catch (e) {}
    }

    return new Response(e.message || e.toString(), { status: 500 });
  }
}

async function handleAPIRequest(request, event) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }
  
  // Handle GET request (for testing)
  if (request.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'ok',
      message: 'API endpoint is working',
      timestamp: new Date().toISOString(),
      method: 'GET'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // Handle POST request
  if (request.method === 'POST') {
    return handleEventSubmission(request, event);
  }
  
  // Method not allowed
  return new Response('Method not allowed', { status: 405 });
}

async function handleEventSubmission(request, event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Parse the request body
    const body = await request.json();
    const { events, filename, submitterEmail } = body;

    // Validate the data
    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid events data',
        details: 'Events must be a non-empty array'
      }), {
        status: 400,
        headers
      });
    }

    if (!filename || typeof filename !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Invalid filename',
        details: 'Filename must be a non-empty string'
      }), {
        status: 400,
        headers
      });
    }

    // Validate each event
    for (const event of events) {
      if (!event.title || !event.venue || !event.date || !event.startTime) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields in event data',
          details: 'Each event must have title, venue, date, and startTime'
        }), {
          status: 400,
          headers
        });
      }
    }

    // Get GitHub token from environment variable
    const githubToken = typeof GITHUB_TOKEN !== 'undefined' ? GITHUB_TOKEN : null;
    
    if (!githubToken) {
      console.error('GITHUB_TOKEN not configured');
      return new Response(JSON.stringify({ 
        warning: 'GitHub token not configured',
        message: 'Your event data has been received but cannot be automatically processed. Please contact the administrator.',
        events: events,
        filename: filename
      }), {
        status: 200,
        headers
      });
    }

    // GitHub API configuration
    const GITHUB_OWNER = 'M-Igashi';
    const GITHUB_REPO = 'cologne-raves';
    
    console.log('Triggering GitHub workflow...');
    
    // Try to trigger the workflow
    const workflowResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/create-event-pr.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Cologne-Raves-Worker'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            events_json: JSON.stringify(events),
            filename: filename,
            submitter_email: submitterEmail || 'anonymous'
          }
        })
      }
    );

    console.log('GitHub API response status:', workflowResponse.status);

    // GitHub API returns 204 No Content on success for workflow dispatch
    if (workflowResponse.status === 204) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Pull request creation initiated! Check the repository for the new PR in a few moments.',
        workflowTriggered: true
      }), {
        status: 200,
        headers
      });
    }

    // If workflow dispatch fails, try to create an issue instead
    console.log('Workflow dispatch failed, creating issue instead...');
    
    const issueBody = `## New Event Submission

**Filename:** \`${filename}\`
**Submitted by:** ${submitterEmail || 'anonymous'}
**Timestamp:** ${new Date().toISOString()}

### Event Data

\`\`\`json
${JSON.stringify(events, null, 2)}
\`\`\`

### How to add this event:

1. Copy the JSON content above
2. Create a new file \`data/${filename}\`
3. Paste the JSON content
4. Create a pull request

Or use GitHub Actions:
1. Go to [Actions > Create Event PR](https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/create-event-pr.yml)
2. Click "Run workflow"
3. Paste the JSON data and filename from above

---
*This submission was created from https://cologne.ravers.workers.dev/form/*`;

    // Create GitHub Issue as fallback
    const issueResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Cologne-Raves-Worker'
        },
        body: JSON.stringify({
          title: `🎉 New Event Submission: ${filename}`,
          body: issueBody,
          labels: []
        })
      }
    );

    if (issueResponse.ok) {
      const issueData = await issueResponse.json();
      return new Response(JSON.stringify({ 
        success: true,
        message: `Event submission created as Issue #${issueData.number}. You can view it on GitHub.`,
        issueUrl: issueData.html_url,
        issueNumber: issueData.number
      }), {
        status: 200,
        headers
      });
    }

    // If both methods fail
    const errorText = await issueResponse.text();
    console.error('Both workflow and issue creation failed:', errorText);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to process submission',
      details: 'Could not create PR or issue. Please try again later.',
      debugInfo: errorText
    }), {
      status: 500,
      headers
    });

  } catch (error) {
    console.error('Error processing event submission:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}
