"use client";

import { useState } from "react";
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

type SubmitMode = "details" | "url";

interface EventData {
  id: string;
  title: string;
  venue: string;
  date: string;
  startTime: string;
  artists?: string[];
  url?: string;
}

const generateDefaultEvent = (): EventData => ({
  id: "",
  title: "",
  venue: "",
  date: "",
  startTime: "",
  artists: [],
  url: "",
});

export default function EventForm() {
  const [mode, setMode] = useState<SubmitMode>("details");
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

  const updateEvent = (
    index: number,
    field: keyof EventData,
    value: string,
  ) => {
    const updated = [...events];
    if (field === "artists") {
      updated[index][field] = value.split(",").map((s) => s.trim());
    } else {
      updated[index][field] = value;
    }
    setEvents(updated);
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
    return events.map((event) => ({
      ...event,
      id: event.id.trim(), // Keep empty if no ID provided - GitHub Actions will generate it
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
    if (!validateEvents()) {
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
        setTimeout(() => {
          setEvents([generateDefaultEvent()]);
          setFilenameSuffix("");
          setSubmitterEmail("");
          setSubmitStatus({ type: null, message: "" });
        }, 10000);
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
        setTimeout(() => {
          setEventUrl("");
          setUrlNote("");
          setSubmitterEmail("");
          setSubmitStatus({ type: null, message: "" });
        }, 10000);
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
      <h2 className="text-xl font-bold">Submit Events to Cologne Raves</h2>
      <p className="text-gray-400">
        Submit events to the community calendar
      </p>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("details"); setSubmitStatus({ type: null, message: "" }); }}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            mode === "details"
              ? "bg-gray-800 text-white border border-b-0 border-gray-600"
              : "bg-gray-900 text-gray-400 border border-transparent hover:text-gray-200"
          }`}
        >
          Fill in Details
        </button>
        <button
          onClick={() => { setMode("url"); setSubmitStatus({ type: null, message: "" }); }}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            mode === "url"
              ? "bg-gray-800 text-white border border-b-0 border-gray-600"
              : "bg-gray-900 text-gray-400 border border-transparent hover:text-gray-200"
          }`}
        >
          Share Event Link
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">How it works</h3>
        {mode === "details" ? (
          <p className="text-sm text-gray-400 leading-relaxed">
            Fill out the event details below and click <strong className="text-gray-200">"Submit Events"</strong> to
            automatically create a GitHub Pull Request.
            <br />
            <span className="text-green-400">New events:</span> Leave ID field empty &mdash;{" "}
            <span className="text-orange-400">Update existing:</span> Enter the event ID without #
          </p>
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed">
            Paste a link to an event page (e.g. from ticket shops, venue sites, info sites).
            <br />
            We'll review it and add the event to the calendar. No need to fill in details manually.
          </p>
        )}
      </div>

      {mode === "url" ? (
        /* URL notification mode */
        <>
          <div>
            <label className="block font-medium mb-1">
              Event Page URL <span className="text-red-400">*</span>
            </label>
            <Input
              type="url"
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              placeholder="https://ra.co/events/..."
              className="border-l-4 border-red-500"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Note{" "}
              <span className="text-gray-500 text-sm">(optional)</span>
            </label>
            <Textarea
              value={urlNote}
              onChange={(e) => setUrlNote(e.target.value)}
              placeholder="Any additional info (e.g. 'multiple dates', 'lineup TBA')"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Your Email{" "}
              <span className="text-gray-500 text-sm">(optional, for attribution)</span>
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
            <label className="block font-medium">
              Filename suffix{" "}
              <span className="text-gray-500 text-sm">(e.g. "update")</span>
            </label>
            <Input
              value={filenameSuffix}
              onChange={(e) => setFilenameSuffix(e.target.value)}
              placeholder="events-update"
            />
          </div>

          <div>
            <label className="block font-medium">
              Your Email{" "}
              <span className="text-gray-500 text-sm">
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
          {events.map((event, i) => (
            <Card key={i} className="p-4 space-y-3 border border-gray-300">
              <h3 className="font-semibold">Event {i + 1}</h3>

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
                            1. Find the event ID in the top-right corner of the
                            event card (e.g., <code>#be790c46</code>)
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
                className="border-l-4 border-red-500"
                placeholder="Title (required)"
                value={event.title}
                onChange={(e) => updateEvent(i, "title", e.target.value)}
              />
              <Input
                required
                className="border-l-4 border-red-500"
                placeholder="Venue (required)"
                value={event.venue}
                onChange={(e) => updateEvent(i, "venue", e.target.value)}
              />
              <Input
                required
                className="border-l-4 border-red-500"
                type="date"
                placeholder="Date (required, YYYY-MM-DD)"
                value={event.date}
                onChange={(e) => updateEvent(i, "date", e.target.value)}
              />
              <Input
                required
                className={
                  isValidTime(event.startTime)
                    ? "border-l-4 border-red-500"
                    : "border-l-4 border-yellow-400"
                }
                placeholder="Start Time (e.g. 23:00)"
                value={event.startTime}
                onChange={(e) => updateEvent(i, "startTime", e.target.value)}
              />
              <Input
                className="border-l-4 border-gray-300"
                placeholder="Artists (optional, comma separated)"
                value={event.artists?.join(", ") || ""}
                onChange={(e) => updateEvent(i, "artists", e.target.value)}
              />
              <Textarea
                className="border-l-4 border-gray-300"
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
                  className="text-blue-400 hover:underline"
                >
                  View on GitHub →
                </a>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-4 pt-4">
        {mode === "details" ? (
          <>
            <Button onClick={downloadJson}>📥 Download JSON</Button>
            <Button
              onClick={submitAsPullRequest}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
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
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "Submitting..." : "🔗 Submit Event Link"}
          </Button>
        )}
      </div>

      {showJson && mode === "details" && (
        <pre className="mt-4 p-4 bg-gray-900 text-gray-300 text-sm overflow-x-auto rounded border border-gray-700">
          {JSON.stringify(generateJson(), null, 2)}
        </pre>
      )}
    </div>
  );
}
