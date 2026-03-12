import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const assetManifest = JSON.parse(manifestJSON);

const ALLOWED_ORIGIN = "https://cologne.ravers.workers.dev";

function corsHeaders(origin) {
  const allowedOrigin =
    origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/submit-event") {
      return handleAPIRequest(request, env, ctx);
    }

    if (url.pathname === "/api/notify-event") {
      return handleNotifyEvent(request, env, ctx);
    }

    return handleStaticAssets(request, env, ctx, url);
  },
};

async function handleStaticAssets(request, env, ctx, url) {
  const kvArgs = {
    request,
    waitUntil(promise) {
      return ctx.waitUntil(promise);
    },
  };
  const kvOptions = {
    ASSET_NAMESPACE: env.__STATIC_CONTENT,
    ASSET_MANIFEST: assetManifest,
  };

  try {
    const pathname = url.pathname;
    const isHtmlRequest =
      pathname === "/" ||
      pathname.endsWith(".html") ||
      pathname.endsWith(".htm") ||
      (!pathname.includes(".") && pathname !== "/api/submit-event" && pathname !== "/api/notify-event");

    if (isHtmlRequest) {
      kvOptions.cacheControl = {
        edgeTtl: 60 * 60,
        browserTtl: 60 * 60,
      };
    } else {
      kvOptions.cacheControl = {
        edgeTtl: 30 * 24 * 60 * 60,
        browserTtl: 24 * 60 * 60,
      };
    }

    const response = await getAssetFromKV(kvArgs, kvOptions);
    const headers = new Headers(response.headers);

    // Cache headers per asset type
    if (pathname.match(/\.(css|js)$/)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (pathname.match(/\.(woff2?|ttf|otf|eot)$/)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Access-Control-Allow-Origin", "*");
    } else if (pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
      headers.set("Cache-Control", "public, max-age=2592000");
    } else if (isHtmlRequest) {
      headers.set("Cache-Control", "public, max-age=3600, must-revalidate");
    } else {
      headers.set("Cache-Control", "public, max-age=86400");
    }

    // Security headers
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Font preload for HTML pages
    if (isHtmlRequest) {
      headers.set(
        "Link",
        "</fonts/atkinson-regular.woff>; rel=preload; as=font; type=font/woff; crossorigin, </fonts/atkinson-bold.woff>; rel=preload; as=font; type=font/woff; crossorigin",
      );
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (e) {
    try {
      const notFoundResponse = await getAssetFromKV(kvArgs, {
        ...kvOptions,
        mapRequestToAsset: (req) =>
          new Request(`${new URL(req.url).origin}/404.html`, req),
      });

      return new Response(notFoundResponse.body, {
        ...notFoundResponse,
        status: 404,
      });
    } catch {
      // 404.html not found
    }

    return new Response(e.message || e.toString(), { status: 500 });
  }
}

async function handleAPIRequest(request, env, ctx) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request.headers.get("Origin")),
    });
  }

  if (request.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "API endpoint is working",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: corsHeaders(request.headers.get("Origin")),
      },
    );
  }

  if (request.method === "POST") {
    return handleEventSubmission(request, env, ctx);
  }

  return new Response("Method not allowed", { status: 405 });
}

async function handleEventSubmission(request, env, ctx) {
  const headers = corsHeaders(request.headers.get("Origin"));

  try {
    const body = await request.json();
    const { events, filename, submitterEmail } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid events data",
          details: "Events must be a non-empty array",
        }),
        { status: 400, headers },
      );
    }

    if (!filename || typeof filename !== "string") {
      return new Response(
        JSON.stringify({
          error: "Invalid filename",
          details: "Filename must be a non-empty string",
        }),
        { status: 400, headers },
      );
    }

    for (const evt of events) {
      if (!evt.title || !evt.venue || !evt.date || !evt.startTime) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields in event data",
            details: "Each event must have title, venue, date, and startTime",
          }),
          { status: 400, headers },
        );
      }
    }

    const githubToken = env.GITHUB_TOKEN;

    if (!githubToken) {
      console.error(
        JSON.stringify({ message: "GITHUB_TOKEN not configured" }),
      );
      return new Response(
        JSON.stringify({
          warning: "GitHub token not configured",
          message:
            "Your event data has been received but cannot be automatically processed. Please contact the administrator.",
          events,
          filename,
        }),
        { status: 200, headers },
      );
    }

    const GITHUB_OWNER = "M-Igashi";
    const GITHUB_REPO = "cologne-raves";

    const workflowResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/create-event-pr.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          "User-Agent": "Cologne-Raves-Worker",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            events_json: JSON.stringify(events),
            filename: filename,
            submitter_email: submitterEmail || "anonymous",
          },
        }),
      },
    );

    if (workflowResponse.status === 204) {
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Pull request creation initiated! Check the repository for the new PR in a few moments.",
          workflowTriggered: true,
        }),
        { status: 200, headers },
      );
    }

    console.error(
      JSON.stringify({
        message: "Workflow dispatch failed, creating issue instead",
        status: workflowResponse.status,
      }),
    );

    const issueBody = `## New Event Submission

**Filename:** \`${filename}\`
**Submitted by:** ${submitterEmail || "anonymous"}
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

    const issueResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          "User-Agent": "Cologne-Raves-Worker",
        },
        body: JSON.stringify({
          title: `New Event Submission: ${filename}`,
          body: issueBody,
          labels: [],
        }),
      },
    );

    if (issueResponse.ok) {
      const issueData = await issueResponse.json();
      return new Response(
        JSON.stringify({
          success: true,
          message: `Event submission created as Issue #${issueData.number}. You can view it on GitHub.`,
          issueUrl: issueData.html_url,
          issueNumber: issueData.number,
        }),
        { status: 200, headers },
      );
    }

    const errorText = await issueResponse.text();
    console.error(
      JSON.stringify({
        message: "Both workflow and issue creation failed",
        error: errorText,
      }),
    );

    return new Response(
      JSON.stringify({
        error: "Failed to process submission",
        details: "Could not create PR or issue. Please try again later.",
      }),
      { status: 500, headers },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Error processing event submission",
        error: error.message || String(error),
      }),
    );
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message || "Unknown error",
      }),
      { status: 500, headers },
    );
  }
}

async function handleNotifyEvent(request, env, ctx) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request.headers.get("Origin")),
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = corsHeaders(request.headers.get("Origin"));

  try {
    const body = await request.json();
    const { url, note, submitterEmail } = body;

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({
          error: "Invalid URL",
          details: "Event URL must be a non-empty string",
        }),
        { status: 400, headers },
      );
    }

    const githubToken = env.GITHUB_TOKEN;

    if (!githubToken) {
      console.error(
        JSON.stringify({ message: "GITHUB_TOKEN not configured" }),
      );
      return new Response(
        JSON.stringify({
          warning: "GitHub token not configured",
          message:
            "Your event link has been received but cannot be automatically processed.",
        }),
        { status: 200, headers },
      );
    }

    const GITHUB_OWNER = "M-Igashi";
    const GITHUB_REPO = "cologne-raves";

    const issueBody = `## Event Link Submission

**URL:** ${url}
**Submitted by:** ${submitterEmail || "anonymous"}
**Timestamp:** ${new Date().toISOString()}
${note ? `\n**Note:** ${note}\n` : ""}
### Next steps

Use the \`crawl-events\` command to scrape this URL and add the event(s) to the calendar.

---
*Submitted from https://cologne.ravers.workers.dev/form/*`;

    const issueResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          "User-Agent": "Cologne-Raves-Worker",
        },
        body: JSON.stringify({
          title: `Event link: ${url}`,
          body: issueBody,
          labels: ["event-link"],
        }),
      },
    );

    if (issueResponse.ok) {
      const issueData = await issueResponse.json();
      return new Response(
        JSON.stringify({
          success: true,
          message: `Thanks! Your event link has been submitted for review (Issue #${issueData.number}).`,
          issueUrl: issueData.html_url,
          issueNumber: issueData.number,
        }),
        { status: 200, headers },
      );
    }

    const errorText = await issueResponse.text();
    console.error(
      JSON.stringify({
        message: "Failed to create issue for event link",
        error: errorText,
      }),
    );

    return new Response(
      JSON.stringify({
        error: "Failed to submit event link",
        details: "Could not create issue. Please try again later.",
      }),
      { status: 500, headers },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Error processing event link notification",
        error: error.message || String(error),
      }),
    );
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message || "Unknown error",
      }),
      { status: 500, headers },
    );
  }
}
