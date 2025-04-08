"use client";

import React, { useState } from "react";
import fileSaver from "file-saver";
import { parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

interface Props {
  allParties: EventData[];
}

export default function ExtractEvents({ allParties }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<EventData[]>([]);
  const [showJson, setShowJson] = useState(false);

  const filterEvents = () => {
    if (!startDate || !endDate) return;
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const result = allParties.filter((event) => {
      const eventDate = parseISO(event.date);
      return eventDate >= start && eventDate <= end;
    });

    setFilteredEvents(result);
    setShowJson(true);
  };

  const downloadJson = () => {
    const json = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([json], { type: "application/json" });

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    saveAs(blob, `${y}-${m}-cologne-${d}-extract.json`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Extract Events</h2>
      <p className="text-gray-700">Download events by date range</p>

      <div className="flex flex-col gap-4">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Start date"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="End date"
        />
        <Button onClick={filterEvents}>Filter Events</Button>
      </div>

      {filteredEvents.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={downloadJson}>Download JSON</Button>
            <Button variant="outline" onClick={() => setShowJson(!showJson)}>
              {showJson ? "Hide JSON" : "Show JSON"}
            </Button>
          </div>

          {showJson && (
            <pre className="mt-4 p-4 bg-gray-100 text-sm overflow-x-auto">
              {JSON.stringify(filteredEvents, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
