"use client";

import React, { useState } from "react";
import fileSaver from "file-saver";
import { parseISO, format } from "date-fns";
import * as tz from "date-fns-tz";

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

    const { getAllParties } = await import("@/lib/getAllParties");
    const all = await getAllParties();

    const start = tz.zonedTimeToUtc(parseISO(startDate), "Europe/Berlin");
    const end = tz.zonedTimeToUtc(parseISO(endDate), "Europe/Berlin");

    const filtered = all.filter((e: any) => {
      const date = tz.zonedTimeToUtc(parseISO(e.date), "Europe/Berlin");
      return date >= start && date <= end;
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

    const filename = `${y}-${m}-cologne-${d}-extract.json`;
    saveAs(blob, filename);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Extract Events</h2>
      <p className="text-gray-700">
        Download filtered Cologne Raves JSON by date range.
      </p>

      <div className="flex flex-col gap-4">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Start Date"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="End Date"
        />
        <Button onClick={handleExtract}>Extract JSON</Button>
      </div>

      {filteredEvents.length > 0 && (
        <>
          <div className="pt-4 flex gap-4 flex-wrap">
            <Button onClick={downloadJson}>Download JSON</Button>
            <Button variant="outline" onClick={() => setShowJson((p) => !p)}>
              {showJson ? "Hide JSON" : "Show JSON"}
            </Button>
          </div>

          {showJson && (
            <pre className="mt-4 p-4 bg-gray-100 text-sm overflow-x-auto max-h-[500px]">
              {JSON.stringify(filteredEvents, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
