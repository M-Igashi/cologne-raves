import {
  ExtractError,
  MAX_EXTRACT_TEXT_LENGTH,
  extractFromText,
  extractFromUrl,
} from "./extract.js";

const SITE_ORIGIN = "https://cologne.ravers.workers.dev";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
// Must stay in sync with TURNSTILE_ACTIONS in src/components/EventForm.tsx
const TURNSTILE_ACTIONS = { extract: "extract-event", submit: "submit-event" };
const GITHUB_API = "https://api.github.com/repos/M-Igashi/cologne-raves";

const MAX_EVENTS = 20;
const MAX_TEXT_LENGTH = 200;
const MAX_URL_LENGTH = 500;
const MAX_NOTE_LENGTH = 1000;
const MAX_ARTISTS = 100;

// Must stay in sync with the filename check in .github/workflows/create-event-pr.yml
const FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.json$/;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{0,32}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const EMAIL_PATTERN = /^[^\s@<>`]+@[^\s@<>`]+\.[^\s@<>`]+$/;
const EVENT_FIELDS = ["id", "title", "venue", "date", "startTime", "artists", "url"];

const API_HEADERS = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/submit-event") {
      return handleSubmitEvent(request, env);
    }

    if (url.pathname === "/api/notify-event") {
      return handleNotifyEvent(request, env);
    }

    if (url.pathname === "/api/extract-event") {
      return handleExtractEvent(request, env);
    }

    if (url.pathname === "/favicon.ico") {
      return Response.redirect(`${SITE_ORIGIN}/favicon.png`, 301);
    }

    return handleStaticAssets(request, env, url);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(triggerRedeploy(env));
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: API_HEADERS });
}

function logError(message, details = {}) {
  console.error(JSON.stringify({ message, ...details }));
}

function githubFetch(env, path, body) {
  return fetch(`${GITHUB_API}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "Cologne-Raves-Worker",
    },
    body: JSON.stringify(body),
  });
}

function dispatchWorkflow(env, workflow, inputs) {
  return githubFetch(env, `/actions/workflows/${workflow}/dispatches`, {
    ref: "main",
    ...(inputs && { inputs }),
  });
}

function isText(value, maxLength) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isHttpUrl(value) {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeSubmitter(email) {
  return typeof email === "string" && email.length <= 254 && EMAIL_PATTERN.test(email)
    ? email
    : "anonymous";
}

function validateEvent(evt) {
  if (!evt || typeof evt !== "object" || Array.isArray(evt)) {
    return "must be an object";
  }
  const unknown = Object.keys(evt).filter((key) => !EVENT_FIELDS.includes(key));
  if (unknown.length > 0) {
    return `has unknown fields: ${unknown.join(", ")}`;
  }
  if (!isText(evt.title, MAX_TEXT_LENGTH) || !isText(evt.venue, MAX_TEXT_LENGTH)) {
    return `needs a title and venue of at most ${MAX_TEXT_LENGTH} characters`;
  }
  if (typeof evt.date !== "string" || !DATE_PATTERN.test(evt.date)) {
    return "needs a date in YYYY-MM-DD format";
  }
  if (typeof evt.startTime !== "string" || !TIME_PATTERN.test(evt.startTime)) {
    return "needs a startTime in HH:MM format";
  }
  if (evt.id !== undefined && (typeof evt.id !== "string" || !EVENT_ID_PATTERN.test(evt.id))) {
    return "has an invalid id";
  }
  if (evt.url !== undefined && evt.url !== "" && !isHttpUrl(evt.url)) {
    return "needs an http(s) url";
  }
  if (
    evt.artists !== undefined &&
    (!Array.isArray(evt.artists) ||
      evt.artists.length > MAX_ARTISTS ||
      !evt.artists.every((artist) => isText(artist, MAX_TEXT_LENGTH)))
  ) {
    return "has an invalid artists list";
  }
  return null;
}

async function readJsonBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

async function triggerRedeploy(env) {
  if (!env.GITHUB_TOKEN) {
    logError("GITHUB_TOKEN not configured for scheduled redeploy");
    return;
  }

  const response = await dispatchWorkflow(env, "redeploy.yml");

  if (response.status !== 204) {
    logError("Scheduled redeploy dispatch failed", {
      status: response.status,
      error: await response.text(),
    });
  }
}

async function handleStaticAssets(request, env, url) {
  const pathname = url.pathname;
  const isHtmlRequest =
    pathname === "/" ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".htm") ||
    !pathname.includes(".");

  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);

  // Do not let error responses (e.g. a 404 for a .js path) inherit long-lived caching.
  if (response.status < 400) {
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
  }

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleSubmitEvent(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: API_HEADERS });
  }

  if (request.method === "GET") {
    return json({
      status: "ok",
      message: "API endpoint is working",
      timestamp: new Date().toISOString(),
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await readJsonBody(request);
  if (!body) {
    return json({ error: "Request body must be a JSON object" }, 400);
  }

  const { events, filename } = body;
  const submitter = normalizeSubmitter(body.submitterEmail);

  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) {
    return json(
      {
        error: "Invalid events data",
        details: `Events must be an array of 1 to ${MAX_EVENTS} items`,
      },
      400,
    );
  }

  if (typeof filename !== "string" || !FILENAME_PATTERN.test(filename)) {
    return json(
      {
        error: "Invalid filename",
        details: "Filename must be a plain .json file name (letters, digits, dot, dash, underscore)",
      },
      400,
    );
  }

  for (const [index, evt] of events.entries()) {
    const problem = validateEvent(evt);
    if (problem) {
      return json(
        { error: `Event ${index + 1} ${problem}`, details: "Invalid event data" },
        400,
      );
    }
  }

  if (!env.GITHUB_TOKEN || !env.TURNSTILE_SECRET) {
    logError("GITHUB_TOKEN or TURNSTILE_SECRET not configured");
    return json(
      { error: "Submissions are temporarily unavailable. Please try again later." },
      503,
    );
  }

  // Events that pass this check may be merged without review (see create-event-pr.yml).
  if (!(await verifyTurnstile(request, env, body.turnstileToken, TURNSTILE_ACTIONS.submit))) {
    return json({ error: "Verification failed. Please reload the page and try again." }, 403);
  }

  try {
    const workflowResponse = await dispatchWorkflow(env, "create-event-pr.yml", {
      events_json: JSON.stringify(events),
      filename,
      submitter_email: submitter,
    });

    if (workflowResponse.status === 204) {
      return json({
        success: true,
        message:
          "Thanks! Your events were submitted. New events usually go live within a few minutes; updates to existing events are reviewed first.",
        workflowTriggered: true,
      });
    }

    logError("Workflow dispatch failed, creating issue instead", {
      status: workflowResponse.status,
    });

    const issueBody = `## New Event Submission

**Filename:** \`${filename}\`
**Submitted by:** ${submitter}
**Timestamp:** ${new Date().toISOString()}

### Event Data

\`\`\`json
${JSON.stringify(events, null, 2).replaceAll("```", "'''")}
\`\`\`

### How to add this event:

1. Copy the JSON content above
2. Create a new file \`data/${filename}\`
3. Paste the JSON content
4. Create a pull request

---
*This submission was created from ${SITE_ORIGIN}/form/*`;

    return await createIssue(
      env,
      { title: `New Event Submission: ${filename}`, body: issueBody, labels: [] },
      (issue) => `Event submission created as Issue #${issue.number}. You can view it on GitHub.`,
    );
  } catch (error) {
    logError("Error processing event submission", { error: String(error) });
    return json({ error: "Failed to process submission. Please try again later." }, 500);
  }
}

async function handleNotifyEvent(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: API_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await readJsonBody(request);
  if (!body) {
    return json({ error: "Request body must be a JSON object" }, 400);
  }

  const { url, note } = body;
  const submitter = normalizeSubmitter(body.submitterEmail);

  if (!isHttpUrl(url)) {
    return json(
      {
        error: "Invalid URL",
        details: `Event URL must be an http(s) link of at most ${MAX_URL_LENGTH} characters`,
      },
      400,
    );
  }

  if (note !== undefined && (typeof note !== "string" || note.length > MAX_NOTE_LENGTH)) {
    return json(
      {
        error: "Invalid note",
        details: `Note must be text of at most ${MAX_NOTE_LENGTH} characters`,
      },
      400,
    );
  }

  if (!env.GITHUB_TOKEN) {
    logError("GITHUB_TOKEN not configured");
    return json(
      { error: "Submissions are temporarily unavailable. Please try again later." },
      503,
    );
  }

  // The note goes into a fenced block so it cannot inject markdown or @mentions.
  const noteBlock = note?.trim()
    ? `\n**Note:**\n\n\`\`\`text\n${note.trim().replaceAll("```", "'''")}\n\`\`\`\n`
    : "";

  const issueBody = `## Event Link Submission

**URL:** ${url}
**Submitted by:** ${submitter}
**Timestamp:** ${new Date().toISOString()}
${noteBlock}
### Next steps

Use the \`crawl-events\` command to scrape this URL and add the event(s) to the calendar.

---
*Submitted from ${SITE_ORIGIN}/form/*`;

  try {
    return await createIssue(
      env,
      { title: `Event link: ${url}`.slice(0, 200), body: issueBody, labels: ["event-link"] },
      (issue) => `Thanks! Your event link has been submitted for review (Issue #${issue.number}).`,
    );
  } catch (error) {
    logError("Error processing event link notification", { error: String(error) });
    return json({ error: "Failed to submit event link. Please try again later." }, 500);
  }
}

// Fails closed: any doubt about the token means the request is rejected.
async function verifyTurnstile(request, env, token, action) {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;

  // TURNSTILE_HOSTNAMES overrides the production hostname for local development only.
  const hostnames = (env.TURNSTILE_HOSTNAMES || new URL(SITE_ORIGIN).hostname)
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") || "",
      }),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return (
      result.success === true &&
      result.action === action &&
      hostnames.includes(result.hostname)
    );
  } catch {
    return false;
  }
}

async function handleExtractEvent(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: API_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await readJsonBody(request);
  if (!body) {
    return json({ error: "Request body must be a JSON object" }, 400);
  }

  const { url, text } = body;
  const hasUrl = url !== undefined && url !== "";
  const hasText = typeof text === "string" && text.trim().length > 0;

  if (hasUrl === hasText) {
    return json({ error: "Send either an event link or event text." }, 400);
  }
  if (hasUrl && !isHttpUrl(url)) {
    return json({ error: "Event link must be an http(s) URL." }, 400);
  }
  if (hasText && text.length > MAX_EXTRACT_TEXT_LENGTH) {
    return json(
      { error: `Event text must be at most ${MAX_EXTRACT_TEXT_LENGTH} characters.` },
      400,
    );
  }

  if (!env.TURNSTILE_SECRET || !env.AI) {
    logError("Auto-fill is not configured");
    return json({ error: "Auto-fill is temporarily unavailable." }, 503);
  }

  if (!(await verifyTurnstile(request, env, body.turnstileToken, TURNSTILE_ACTIONS.extract))) {
    return json({ error: "Verification failed. Please try again." }, 403);
  }

  if (env.EXTRACT_RATE_LIMITER) {
    const key = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.EXTRACT_RATE_LIMITER.limit({ key });
    if (!success) {
      return json({ error: "Too many requests. Please wait a minute and try again." }, 429);
    }
  }

  try {
    const { source, events } = hasUrl
      ? await extractFromUrl(env, url)
      : await extractFromText(env, text);

    if (events.length === 0) {
      return json(
        { error: "No event details were found. Paste the event text or fill in the details manually." },
        422,
      );
    }
    return json({ success: true, source, events });
  } catch (error) {
    if (error instanceof ExtractError) {
      return json({ error: error.message }, error.status);
    }
    logError("Error extracting event", { error: String(error) });
    return json({ error: "Auto-fill failed. Please fill in the details manually." }, 500);
  }
}

async function createIssue(env, issue, successMessage) {
  const response = await githubFetch(env, "/issues", issue);

  if (!response.ok) {
    logError("Issue creation failed", {
      status: response.status,
      error: await response.text(),
    });
    return json({ error: "Failed to submit. Please try again later." }, 500);
  }

  const created = await response.json();
  return json({
    success: true,
    message: successMessage(created),
    issueUrl: created.html_url,
    issueNumber: created.number,
  });
}
