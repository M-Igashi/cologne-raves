export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Parse the request body
    const body = await request.json();
    const { events, filename, submitterEmail } = body;

    // Validate the data
    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid events data' }), {
        status: 400,
        headers
      });
    }

    if (!filename || typeof filename !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid filename' }), {
        status: 400,
        headers
      });
    }

    // Validate each event
    for (const event of events) {
      if (!event.title || !event.venue || !event.date || !event.startTime) {
        return new Response(JSON.stringify({ error: 'Missing required fields in event data' }), {
          status: 400,
          headers
        });
      }
    }

    // Get GitHub token from environment variable
    const githubToken = env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.error('GITHUB_TOKEN not configured');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: 'GitHub authentication not configured. Please contact the administrator.' 
      }), {
        status: 500,
        headers
      });
    }

    // GitHub API configuration
    const GITHUB_OWNER = 'M-Igashi';
    const GITHUB_REPO = 'cologne-raves';
    
    // Try both methods: workflow dispatch and issue creation
    let success = false;
    let message = '';
    let issueUrl = '';

    // Method 1: Try workflow dispatch with the exact path
    try {
      console.log('Attempting workflow dispatch...');
      
      // Use the exact workflow file path
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

      console.log('Workflow dispatch response status:', workflowResponse.status);

      // GitHub API returns 204 No Content on success for workflow dispatch
      if (workflowResponse.status === 204) {
        success = true;
        message = 'Pull request creation initiated! Check the repository for the new PR in a few moments.';
      } else if (workflowResponse.status === 404 || workflowResponse.status === 422) {
        // If workflow dispatch fails, fall back to creating an issue
        console.log('Workflow dispatch failed, falling back to issue creation...');
      } else if (workflowResponse.status === 401 || workflowResponse.status === 403) {
        // Authentication/permission issues
        const errorText = await workflowResponse.text();
        return new Response(JSON.stringify({ 
          error: 'GitHub authentication failed',
          details: `Please check token permissions. Status: ${workflowResponse.status}`
        }), {
          status: 500,
          headers
        });
      }
    } catch (error) {
      console.error('Workflow dispatch error:', error);
    }

    // Method 2: Fallback to creating an issue if workflow dispatch failed
    if (!success) {
      console.log('Creating GitHub issue as fallback...');
      
      const issueBody = `## New Event Submission

**Filename:** \`${filename}\`
**Submitted by:** ${submitterEmail || 'anonymous'}
**Timestamp:** ${new Date().toISOString()}

### Event Data

\`\`\`json
${JSON.stringify(events, null, 2)}
\`\`\`

### Manual Steps Required
Since automated PR creation failed, please:
1. Copy the JSON content above
2. Create a new file \`data/${filename}\`
3. Paste the JSON content
4. Create a pull request

### Automated PR Command (for maintainers)
You can trigger the automated PR workflow manually from GitHub Actions with these inputs:
- **events_json:** (paste the JSON above)
- **filename:** ${filename}
- **submitter_email:** ${submitterEmail || 'anonymous'}

---
*This issue was automatically created from a form submission at https://cologne.ravers.workers.dev/form/*`;

      // Create GitHub Issue
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
            labels: ['event-submission', 'automated']
          })
        }
      );

      if (issueResponse.ok) {
        const issueData = await issueResponse.json();
        success = true;
        message = `Event submission created as Issue #${issueData.number}. A maintainer will create the PR.`;
        issueUrl = issueData.html_url;
      } else {
        const errorText = await issueResponse.text();
        console.error('Issue creation failed:', issueResponse.status, errorText);
        
        return new Response(JSON.stringify({ 
          error: 'Failed to create submission',
          details: errorText || `Status: ${issueResponse.status}`
        }), {
          status: 500,
          headers
        });
      }
    }

    if (success) {
      return new Response(JSON.stringify({ 
        success: true,
        message: message,
        issueUrl: issueUrl
      }), {
        status: 200,
        headers
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Failed to process submission',
        details: 'Both workflow dispatch and issue creation failed'
      }), {
        status: 500,
        headers
      });
    }

  } catch (error) {
    console.error('Error processing event submission:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error'
    }), {
      status: 500,
      headers
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
