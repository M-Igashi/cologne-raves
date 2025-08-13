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

    // Get GitHub token from environment
    const githubToken = env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers
      });
    }

    // GitHub API configuration
    const GITHUB_OWNER = 'M-Igashi';
    const GITHUB_REPO = 'cologne-raves';
    const GITHUB_WORKFLOW_ID = 'create-event-pr.yml';

    // Trigger GitHub Actions workflow
    const workflowResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
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

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error('GitHub API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to create pull request',
        details: errorText 
      }), {
        status: 500,
        headers
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Pull request creation initiated. Check the repository for the new PR soon.' 
    }), {
      status: 200,
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
