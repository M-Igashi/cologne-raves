"use client";

import React, { useState } from "react";
import fileSaver from "file-saver";
import { parseISO } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const { saveAs } = fileSaver;

export default function ExtractEvents() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);

  const handleExtract = async () => {
    if (!startDate || !endDate) return;

    const start = zonedTimeToUtc(parseISO(startDate), "Europe/Berlin");
    const end = zonedTimeToUtc(parseISO(endDate), "Europe/Berlin");

    const { getAllParties } = await import("@/lib/getAllParties");
    const allEvents = await getAllParties();

    const filtered = allEvents.filter((event: any) => {
      const eventDate = zonedTimeToUtc(parseISO(event.date), "Europe/Berlin");
      return eventDate >= start && eventDate <= end;
    });

    setFilteredEvents(filtered);
    setShowJson(true);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], {
      type: "application/json",
    });
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const filename = `${y}-${m}-cologne-${d}-extracted.json`;
    saveAs(blob, filename);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Extract Events by Date</h2>
      <p className="text-gray-700">Filter events by date range and download as JSON</p>

      <div className="flex flex-col md:flex-row gap-4">
        <div>
          <label className="block text-sm font-medium">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 pt-2 flex-wrap">
        <Button onClick={handleExtract}>Extract JSON</Button>
        {filteredEvents.length > 0 && (
          <>
            <Button variant="outline" onClick={downloadJson}>
              Download JSON
            </Button>
            <Button variant="outline" onClick={() => setShowJson(!showJson)}>
              {showJson ? "Hide JSON" : "Show JSON"}
            </Button>
          </>
        )}
      </div>

      {showJson && filteredEvents.length > 0 && (
        <pre className="mt-4 p-4 bg-gray-100 text-sm overflow-x-auto">
          {JSON.stringify(filteredEvents, null, 2)}
        </pre>
      )}
    </div>
  );
}
