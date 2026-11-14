"use client";

import { useEffect, useRef, useState } from "react";
import fileSaver from "file-saver";
import { v4 as uuidv4 } from "uuid";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const { saveAs } = fileSaver;

type SubmitMode = "auto" | "details" | "url";

const TURNSTILE_SITEKEY = "0x4AAAAAAGAeakB328iS_632";
// Must stay in sync with TURNSTILE_ACTIONS in workers-site/index.js
const TURNSTILE_ACTIONS = { auto: "extract-event", details: "submit-event" } as const;
// Must stay in sync with MAX_EXTRACT_TEXT_LENGTH in workers-site/extract.js
const MAX_AUTOFILL_LENGTH = 5000;

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "dark";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

const getTurnstile = () => (window as Window & { turnstile?: TurnstileApi }).turnstile;

let turnstileLoading: Promise<void> | undefined;
const loadTurnstile = () =>
  (turnstileLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      turnstileLoading = undefined;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  }));

interface ExtractedEvent {
  title: string;
  venue: string;
  date: string;
  startTime: string;
  artists: string[];
  url?: string;
}

interface EventData {
  id: string;
  title: string;
  venue: string;
  date: string;
  startTime: string;
  artists?: string; // raw comma-separated input; split into string[] in generateJson
  url?: string;
}

const generateDefaultEvent = (): EventData => ({
  id: "",
  title: "",
  venue: "",
  date: "",
  startTime: "",
  artists: "",
  url: "",
});

const tabClass = (active: boolean) =>
  `-mb-px cursor-pointer border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
    active ? "border-acid text-ink" : "border-transparent text-mute hover:text-ink"
  }`;

export default function EventForm() {
  const [mode, setMode] = useState<SubmitMode>("auto");
  const [autoInput, setAutoInput] = useState<string>("");
  const [autofillNote, setAutofillNote] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileBox = useRef<HTMLDivElement>(null);
  const turnstileWidget = useRef<string | undefined>(undefined);
  const [events, setEvents] = useState<EventData[]>([generateDefaultEvent()]);
  const [filenameSuffix, setFilenameSuffix] = useState<string>("");
  const [showJson, setShowJson] = useState(false);
  const [submitterEmail, setSubmitterEmail] = useState<string>("");
  const [eventUrl, setEventUrl] = useState<string>("");
  const [urlNote, setUrlNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
    issueUrl?: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    if (mode === "url") return;
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        const turnstile = getTurnstile();
        if (cancelled || !turnstile || !turnstileBox.current) return;
        turnstileWidget.current = turnstile.render(turnstileBox.current, {
          sitekey: TURNSTILE_SITEKEY,
          action: TURNSTILE_ACTIONS[mode],
          theme: "dark",
          callback: setTurnstileToken,
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => setTurnstileToken(""),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSubmitStatus({
          type: "error",
          message:
            "The verification check could not load. Please reload the page, or use Share Event Link instead.",
        });
      });

    return () => {
      cancelled = true;
      if (turnstileWidget.current !== undefined) {
        getTurnstile()?.remove(turnstileWidget.current);
        turnstileWidget.current = undefined;
      }
      setTurnstileToken("");
    };
  }, [mode]);

  // Tokens are single-use: get a fresh one after every request.
  const resetTurnstile = () => {
    setTurnstileToken("");
    if (turnstileWidget.current !== undefined) {
      getTurnstile()?.reset(turnstileWidget.current);
    }
  };

  const requireTurnstileToken = () => {
    if (turnstileToken) return true;
    setSubmitStatus({
      type: "error",
      message: "Please wait for the verification check to finish, then try again.",
    });
    return false;
  };

  const switchMode = (next: SubmitMode) => {
    setMode(next);
    setSubmitStatus({ type: null, message: "" });
  };

  const autofill = async () => {
    const input = autoInput.trim();
    if (!input) {
      setSubmitStatus({ type: "error", message: "Please paste an event link or event text." });
      return;
    }
    if (!requireTurnstileToken()) return;

    setIsExtracting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const isUrl = /^https?:\/\/\S+$/i.test(input);
      const response = await fetch("/api/extract-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isUrl ? { url: input } : { text: input }), turnstileToken }),
      });

      const result = (await response.json()) as {
        events?: ExtractedEvent[];
        source?: string;
        error?: string;
      };

      if (response.ok && result.events?.length) {
        setEvents(
          result.events.map((event) => ({
            id: "",
            title: event.title,
            venue: event.venue,
            date: event.date,
            startTime: event.startTime,
            artists: event.artists.join(", "),
            url: event.url || "",
          })),
        );
        setAutofillNote(
          result.source === "ai"
            ? "These details were read by AI and may be wrong or incomplete."
            : "These details were read from the event page.",
        );
        setAutoInput("");
        switchMode("details");
      } else {
        setSubmitStatus({
          type: "error",
          message: result.error || "Auto-fill failed. Please fill in the details manually.",
        });
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      resetTurnstile();
      setIsExtracting(false);
    }
  };

  const updateEvent = (
    index: number,
    field: keyof EventData,
    value: string,
  ) => {
    setEvents(
      events.map((event, i) =>
        i === index ? { ...event, [field]: value } : event,
      ),
    );
  };

  const addEvent = () => {
    if (events.length < 4) setEvents([...events, generateDefaultEvent()]);
  };

  const removeEvent = (index: number) => {
    const updated = [...events];
    updated.splice(index, 1);
    setEvents(updated);
  };

  const generateJson = () => {
    // New events carry no id (GitHub Actions backfills it); empty url is omitted too.
    return events.map(({ id, url, artists, ...rest }) => ({
      ...(id.trim() && { id: id.trim() }),
      ...rest,
      artists: (artists || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      ...(url?.trim() && { url: url.trim() }),
    }));
  };

  const getFilename = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const suffix = filenameSuffix.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    const hash = uuidv4().slice(0, 6); // Add unique hash to prevent conflicts
    return `${y}-${m}-cologne-${d}${suffix ? "-" + suffix : ""}-${hash}.json`;
  };

  const downloadJson = () => {
    const json = JSON.stringify(generateJson(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    saveAs(blob, getFilename());
  };

  const isValidTime = (time: string) => /^\d{2}:\d{2}$/.test(time);

  const validateEvents = (): boolean => {
    for (const event of events) {
      if (!event.title || !event.venue || !event.date || !event.startTime) {
        setSubmitStatus({
          type: "error",
          message:
            "All events must have title, venue, date, and start time filled in.",
        });
        return false;
      }
      if (!isValidTime(event.startTime)) {
        setSubmitStatus({
          type: "error",
          message: "All start times must be in HH:MM format (e.g., 23:00).",
        });
        return false;
      }
    }
    return true;
  };

  const submitAsPullRequest = async () => {
    if (!validateEvents() || !requireTurnstileToken()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/submit-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: generateJson(),
          filename: getFilename(),
          submitterEmail: submitterEmail || "anonymous",
          turnstileToken,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        issueUrl?: string;
        error?: string;
      };

      if (response.ok) {
        setSubmitStatus({
          type: "success",
          message:
            result.message || "Your events have been submitted successfully!",
          issueUrl: result.issueUrl,
        });
        setEvents([generateDefaultEvent()]);
        setAutofillNote("");
        setFilenameSuffix("");
        setSubmitterEmail("");
      } else {
        setSubmitStatus({
          type: "error",
          message: result.error || "Failed to submit events. Please try again.",
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      resetTurnstile();
      setIsSubmitting(false);
    }
  };

  const submitUrl = async () => {
    if (!eventUrl.trim()) {
      setSubmitStatus({
        type: "error",
        message: "Please enter an event page URL.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/notify-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: eventUrl.trim(),
          note: urlNote.trim(),
          submitterEmail: submitterEmail || "anonymous",
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        issueUrl?: string;
        error?: string;
      };

      if (response.ok) {
        setSubmitStatus({
          type: "success",
          message:
            result.message || "Your event URL has been submitted for review!",
          issueUrl: result.issueUrl,
        });
        setEventUrl("");
        setUrlNote("");
        setSubmitterEmail("");
      } else {
        setSubmitStatus({
          type: "error",
          message: result.error || "Failed to submit. Please try again.",
        });
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex border-b border-line">
        <button onClick={() => switchMode("auto")} className={tabClass(mode === "auto")}>
          Auto-fill
        </button>
        <button onClick={() => switchMode("details")} className={tabClass(mode === "details")}>
          Fill in Details
        </button>
        <button onClick={() => switchMode("url")} className={tabClass(mode === "url")}>
          Share Event Link
        </button>
      </div>

      {/* How it works */}
      <div className="border border-line bg-panel p-4 space-y-2">
        <h3 className="text-xs font-bold text-acid uppercase tracking-widest">How it works</h3>
        {mode === "auto" ? (
          <>
            <p className="text-sm text-mute leading-relaxed">
              Paste an event link or any event text (a flyer caption, a newsletter, a chat message).
              We read it, using AI where needed, and pre-fill the form for you.{" "}
              <strong className="text-ink">Nothing is submitted until you have checked the details.</strong>
            </p>
            <h3 className="pt-2 text-xs font-bold text-orange-400 uppercase tracking-widest">Limitations</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-mute leading-relaxed">
              <li>Links work best for venue websites and ticket shops.</li>
              <li>
                <strong className="text-ink">Resident Advisor</strong> links cannot be read (RA blocks
                automated access). Paste the event text instead.
              </li>
              <li>
                <strong className="text-ink">Instagram and Facebook</strong> links cannot be read (login
                required). Paste the caption or event description instead.
              </li>
              <li>Pages that only load their content with JavaScript may come back empty.</li>
              <li>AI makes mistakes. Always check the date and the start time.</li>
              <li>
                Up to 4 events per request. Auto-fill runs on a free daily AI quota, so it can be
                unavailable late in the day.
              </li>
            </ul>
          </>
        ) : mode === "details" ? (
          <p className="text-sm text-mute leading-relaxed">
            Fill out the event details below and click <strong className="text-ink">"Submit Events"</strong> to
            automatically create a GitHub Pull Request.
            <br />
            <span className="text-acid">New events:</span> Leave ID field empty &mdash;{" "}
            <span className="text-orange-400">Update existing:</span> Enter the event ID without #
          </p>
        ) : (
          <p className="text-sm text-mute leading-relaxed">
            Paste a link to an event page (e.g. from ticket shops, venue sites, info sites).
            <br />
            We'll review it and add the event to the calendar. No need to fill in details manually.
          </p>
        )}
      </div>

      {mode === "auto" ? (
        <>
          <div>
            <label className="block text-sm font-bold mb-1">
              Event link or text <span className="text-red-400">*</span>
            </label>
            <Textarea
              value={autoInput}
              onChange={(e) => setAutoInput(e.target.value)}
              placeholder={"https://venue.example/events/my-party\n\nor paste the event text here"}
              rows={6}
              maxLength={MAX_AUTOFILL_LENGTH}
              className="border-l-4 border-l-hot"
            />
          </div>
        </>
      ) : mode === "url" ? (
        /* URL notification mode */
        <>
          <div>
            <label className="block text-sm font-bold mb-1">
              Event Page URL <span className="text-red-400">*</span>
            </label>
            <Input
              type="url"
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              placeholder="https://ra.co/events/..."
              className="border-l-4 border-l-hot"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Note{" "}
              <span className="text-mute text-sm">(optional)</span>
            </label>
            <Textarea
              value={urlNote}
              onChange={(e) => setUrlNote(e.target.value)}
              placeholder="Any additional info (e.g. 'multiple dates', 'lineup TBA')"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Your Email{" "}
              <span className="text-mute text-sm">(optional, for attribution)</span>
            </label>
            <Input
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
        </>
      ) : (
        /* Details mode */
        <>
          <div>
            <label className="block text-sm font-bold mb-1">
              Filename suffix{" "}
              <span className="text-mute text-sm">(e.g. "update")</span>
            </label>
            <Input
              value={filenameSuffix}
              onChange={(e) => setFilenameSuffix(e.target.value)}
              placeholder="events-update"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Your Email{" "}
              <span className="text-mute text-sm">
                (optional, for attribution)
              </span>
            </label>
            <Input
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
        </>
      )}

      {mode === "details" && (
        <>
          {autofillNote && (
            <Alert className="border-orange-400 bg-panel">
              <AlertTitle>Auto-filled: please check</AlertTitle>
              <AlertDescription>
                {autofillNote} Check every field, especially the date and the start time, fill in
                anything missing, then press "Submit Events".
              </AlertDescription>
            </Alert>
          )}

          {events.map((event, i) => (
            <Card key={i} className="space-y-3">
              <h3 className="font-display text-2xl uppercase">Event {i + 1}</h3>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Event ID (leave empty for NEW events)"
                  value={event.id}
                  onChange={(e) => updateEvent(i, "id", e.target.value)}
                  className={event.id ? "border-orange-400" : ""}
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      ❗ ID Info
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>⚠️ IMPORTANT: Event ID Instructions</DialogTitle>
                      <DialogDescription className="pt-3 space-y-3">
                        <div className="bg-green-50 p-3 rounded border border-green-300">
                          <strong className="text-green-800">
                            🆕 For NEW events:
                          </strong>
                          <br />
                          <span className="text-green-700">
                            Leave the ID field EMPTY - an ID will be automatically
                            generated
                          </span>
                        </div>

                        <div className="bg-orange-50 p-3 rounded border border-orange-300">
                          <strong className="text-orange-800">
                            ✏️ For UPDATING existing events:
                          </strong>
                          <br />
                          <span className="text-orange-700">
                            1. Find the event ID next to the venue on the event
                            card (e.g., <code>#be790c46</code>)
                            <br />
                            2. Remove the <code>#</code> symbol and enter only the
                            ID (e.g., <code>be790c46</code>)
                            <br />
                            3. This will update the existing event instead of
                            creating a duplicate
                          </span>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                    <img
                      src="/id-override.png"
                      alt="ID override example"
                      className="rounded shadow mt-4 max-w-full"
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <Input
                required
                className="border-l-4 border-l-hot"
                placeholder="Title (required)"
                value={event.title}
                onChange={(e) => updateEvent(i, "title", e.target.value)}
              />
              <Input
                required
                className="border-l-4 border-l-hot"
                placeholder="Venue (required)"
                value={event.venue}
                onChange={(e) => updateEvent(i, "venue", e.target.value)}
              />
              <Input
                required
                className="border-l-4 border-l-hot"
                type="date"
                placeholder="Date (required, YYYY-MM-DD)"
                value={event.date}
                onChange={(e) => updateEvent(i, "date", e.target.value)}
              />
              <Input
                required
                className={
                  isValidTime(event.startTime)
                    ? "border-l-4 border-l-hot"
                    : "border-l-4 border-l-yellow-400"
                }
                placeholder="Start Time (e.g. 23:00)"
                value={event.startTime}
                onChange={(e) => updateEvent(i, "startTime", e.target.value)}
              />
              <Input
                className="border-l-4"
                placeholder="Artists (optional, comma separated)"
                value={event.artists || ""}
                onChange={(e) => updateEvent(i, "artists", e.target.value)}
              />
              <Textarea
                className="border-l-4"
                placeholder="Event URL (optional)"
                value={event.url || ""}
                onChange={(e) => updateEvent(i, "url", e.target.value)}
              />
              {events.length > 1 && (
                <Button variant="destructive" onClick={() => removeEvent(i)}>
                  Remove
                </Button>
              )}
            </Card>
          ))}

          {events.length < 4 && <Button onClick={addEvent}>+ Add Event</Button>}
        </>
      )}

      {submitStatus.type && (
        <Alert
          className={
            submitStatus.type === "success"
              ? "border-green-500 bg-green-950"
              : "border-red-500 bg-red-950"
          }
        >
          <AlertTitle>
            {submitStatus.type === "success" ? "✅ Success" : "❌ Error"}
          </AlertTitle>
          <AlertDescription>
            {submitStatus.message}
            {submitStatus.issueUrl && (
              <div className="mt-2">
                <a
                  href={submitStatus.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-acid underline"
                >
                  View on GitHub →
                </a>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {mode !== "url" && <div key={mode} ref={turnstileBox} />}

      <div className="flex flex-wrap gap-4 pt-4">
        {mode === "auto" ? (
          <Button onClick={autofill} disabled={isExtracting} variant="accent">
            {isExtracting ? "Reading..." : "✨ Auto-fill the form"}
          </Button>
        ) : mode === "details" ? (
          <>
            <Button onClick={downloadJson}>📥 Download JSON</Button>
            <Button
              onClick={submitAsPullRequest}
              disabled={isSubmitting}
              variant="accent"
            >
              {isSubmitting ? "Submitting..." : "🚀 Submit Events"}
            </Button>
            <Button variant="outline" onClick={() => setShowJson(!showJson)}>
              {showJson ? "Hide JSON" : "Show JSON"}
            </Button>
          </>
        ) : (
          <Button
            onClick={submitUrl}
            disabled={isSubmitting}
            variant="accent"
          >
            {isSubmitting ? "Submitting..." : "🔗 Submit Event Link"}
          </Button>
        )}
      </div>

      {showJson && mode === "details" && (
        <pre className="mt-4 p-4 bg-panel text-mute text-sm overflow-x-auto border border-line">
          {JSON.stringify(generateJson(), null, 2)}
        </pre>
      )}
    </div>
  );
}
