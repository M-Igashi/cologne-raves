"use client";

import React, { useState } from "react";
import fileSaver from "file-saver";
import { v4 as uuidv4 } from "uuid";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import Image from "next/image";

const { saveAs } = fileSaver;

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
  url: ""
});

export default function EventForm() {
  const [events, setEvents] = useState<EventData[]>([generateDefaultEvent()]);
  const [filenameSuffix, setFilenameSuffix] = useState<string>("");
  const [showJson, setShowJson] = useState(false);

  const updateEvent = (index: number, field: keyof EventData, value: string) => {
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
      id: event.id.trim() === "" ? uuidv4().slice(0, 8) : event.id.trim()
    }));
  };

  const getFilename = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const suffix = filenameSuffix.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    return `${y}-${m}-cologne-${d}${suffix ? '-' + suffix : ''}.json`;
  };

  const downloadJson = () => {
    const json = JSON.stringify(generateJson(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    saveAs(blob, getFilename());
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Create Event JSON</h2>
      <p className="text-gray-700">Create Your Cologne Raves Events JSON</p>

      <div>
        <label className="block font-medium">
          Filename suffix <span className="text-gray-500 text-sm">(e.g. "update")</span>
        </label>
        <Input
          value={filenameSuffix}
          onChange={(e) => setFilenameSuffix(e.target.value)}
          placeholder="events-update"
        />
      </div>

      {events.map((event, i) => {
        const isStartTimeValid = /^\d{2}:\d{2}$/.test(event.startTime);
        return (
          <Card key={i} className="p-4 space-y-3 border border-gray-300">
            <h3 className="font-semibold">Event {i + 1}</h3>
            <Input
              placeholder="ID (optional)"
              value={event.id}
              onChange={(e) => updateEvent(i, "id", e.target.value)}
            />
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
              placeholder="Date (required)"
              value={event.date}
              onChange={(e) => updateEvent(i, "date", e.target.value)}
            />
            <Input
              required
              className={`border-l-4 ${isStartTimeValid ? "border-green-500" : "border-red-500"}`}
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
              placeholder="URL (optional)"
              value={event.url || ""}
              onChange={(e) => updateEvent(i, "url", e.target.value)}
            />
            {events.length > 1 && (
              <Button variant="destructive" onClick={() => removeEvent(i)}>
                Remove
              </Button>
            )}
          </Card>
        );
      })}

      {events.length < 4 && (
        <Button onClick={addEvent}>+ Add Event</Button>
      )}

      <div className="flex flex-wrap gap-4 pt-4">
        <Button onClick={downloadJson}>Generate JSON</Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Info</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Custom ID Override</DialogTitle>
              <DialogDescription>
                If you want to overwrite an existing event, enter its ID without the <code>#</code>.
              </DialogDescription>
            </DialogHeader>
            <Image
              src="/id-override.png"
              width={600}
              height={350}
              alt="ID override example"
              className="rounded border shadow"
            />
          </DialogContent>
        </Dialog>
      </div>

      {showJson && (
        <pre className="mt-4 p-4 bg-gray-100 text-sm overflow-x-auto">
          {JSON.stringify(generateJson(), null, 2)}
        </pre>
      )}
    </div>
  );
}
