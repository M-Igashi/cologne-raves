"use client";

import React, { useState } from "react";
import { saveAs } from "file-saver";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function generateStableId(venue: string, date: string, title: string): string {
  const input = `${venue}-${date}-${title}`;
  const hashBuffer = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-1", hashBuffer).then((buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 8)
  );
}

export default function EventForm() {
  const [events, setEvents] = useState([
    { title: "", venue: "", date: "", startTime: "", artists: "", url: "", id: "" },
  ]);
  const [output, setOutput] = useState("");
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...events];
    updated[index][field] = value;
    setEvents(updated);
  };

  const addEvent = () => {
    if (events.length < 4) {
      setEvents([
        ...events,
        { title: "", venue: "", date: "", startTime: "", artists: "", url: "", id: "" },
      ]);
    }
  };

  const generateJSON = async () => {
    const processed = await Promise.all(
      events.map(async (e) => {
        const id = e.id || (await generateStableId(e.venue, e.date, e.title));
        return {
          id,
          title: e.title.trim(),
          venue: e.venue.trim(),
          date: e.date,
          startTime: e.startTime,
          artists: e.artists
            ? e.artists.split(",").map((a) => a.trim()).filter(Boolean)
            : [],
          url: e.url.trim() || undefined,
        };
      })
    );
    setOutput(JSON.stringify(processed, null, 2));
  };

  const downloadJSON = () => {
    const blob = new Blob([output], { type: "application/json" });
    saveAs(blob, "cologne-events.json");
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Create Your Cologne Raves Events JSON</h1>

      {events.map((event, i) => (
        <Card key={i} className="p-4 space-y-4">
          <Input
            placeholder="Title (required)"
            value={event.title}
            onChange={(e) => handleChange(i, "title", e.target.value)}
            required
            className="border-l-4 border-red-500"
          />
          <Input
            placeholder="Venue (required)"
            value={event.venue}
            onChange={(e) => handleChange(i, "venue", e.target.value)}
            required
            className="border-l-4 border-red-500"
          />
          <Input
            type="date"
            value={event.date}
            onChange={(e) => handleChange(i, "date", e.target.value)}
            required
            className="border-l-4 border-red-500"
          />
          <Input
            placeholder="Start Time (hh:mm, required)"
            value={event.startTime}
            onChange={(e) => handleChange(i, "startTime", e.target.value)}
            required
            className={cn(
              "border-l-4",
              event.startTime && !timePattern.test(event.startTime)
                ? "border-red-500"
                : "border-red-500"
            )}
          />
          {event.startTime && !timePattern.test(event.startTime) && (
            <p className="text-red-500 text-sm">Please enter a valid time in hh:mm format.</p>
          )}
          <Input
            placeholder="Artists (comma-separated, optional)"
            value={event.artists}
            onChange={(e) => handleChange(i, "artists", e.target.value)}
            className="border-l-4 border-gray-300"
          />
          <Input
            placeholder="Event URL (optional)"
            value={event.url}
            onChange={(e) => handleChange(i, "url", e.target.value)}
            className="border-l-4 border-gray-300"
          />

          <div className="flex items-center gap-2">
            <Input
              placeholder="Custom ID (optional)"
              value={event.id}
              onChange={(e) => handleChange(i, "id", e.target.value)}
              className="flex-1"
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Info
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Overwriting Existing Event</DialogTitle>
                  <DialogDescription>
                    If you enter an existing event ID here, the uploaded JSON will
                    <strong> overwrite</strong> that event instead of creating a new one.
                  </DialogDescription>
                </DialogHeader>
                <img
                  src="/id-override.png"
                  alt="ID override illustration"
                  className="mx-auto rounded-md mt-4 max-w-full"
                />
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button onClick={addEvent} disabled={events.length >= 4}>
          + Add Event
        </Button>
        <Button onClick={generateJSON}>Generate JSON</Button>
      </div>

      {output && (
        <div className="space-y-4">
          <Textarea
            className="w-full h-64 font-mono text-sm"
            readOnly
            value={output}
          />
          <Button onClick={downloadJSON}>Download JSON</Button>
        </div>
      )}
    </div>
  );
}
