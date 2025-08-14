export async function onRequestGet(context) {
  const { env } = context;
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // Check if GitHub token is configured
    const hasToken = !!env.GITHUB_TOKEN;
    
    if (!hasToken) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'GitHub token not configured',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers
      });
    }

    // Test GitHub API connection
    const testResponse = await fetch(
      'https://api.github.com/repos/M-Igashi/cologne-raves',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'User-Agent': 'Cologne-Raves-Worker'
        }
      }
    );

    const repoData = await testResponse.json();

    return new Response(JSON.stringify({
      status: 'success',
      message: 'API connection test successful',
      tokenConfigured: true,
      githubConnection: testResponse.ok,
      repoName: repoData.name || 'N/A',
      repoOwner: repoData.owner?.login || 'N/A',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers
    });
  }
}

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
    
    console.log('Creating GitHub issue...');
    
    // Create issue with event data
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

### Automated PR Creation

To create a PR automatically:
1. Go to [Actions > Create Event PR](https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/create-event-pr.yml)
2. Click "Run workflow"
3. Paste the JSON data and filename from above

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

    console.log('GitHub Issue API response status:', issueResponse.status);

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

    // Handle errors
    const errorText = await issueResponse.text();
    console.error('GitHub API error:', issueResponse.status, errorText);
    
    let errorMessage = 'Failed to create submission';
    if (issueResponse.status === 401) {
      errorMessage = 'Authentication failed. Please check the GitHub token.';
    } else if (issueResponse.status === 403) {
      errorMessage = 'Permission denied. The GitHub token may lack necessary permissions.';
    } else if (issueResponse.status === 422) {
      errorMessage = 'Invalid request data.';
    } else if (issueResponse.status === 404) {
      errorMessage = 'Repository not found or token lacks access.';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorText || `Status: ${issueResponse.status}`,
      status: issueResponse.status
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
