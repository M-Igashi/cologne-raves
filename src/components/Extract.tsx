"use client";

import React, { useState } from "react";
import * as fileSaver from "file-saver";
import * as tz from "date-fns-tz";
import { getAllParties } from "@/lib/getAllParties";
import { parseISO, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ExtractEvents() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);

  const handleExtract = async () => {
    if (!startDate || !endDate) return;

    const allEvents = await getAllParties();
    const berlinTZ = "Europe/Berlin";

    const start = tz.zonedTimeToUtc(parseISO(startDate), berlinTZ);
    const end = tz.zonedTimeToUtc(parseISO(endDate), berlinTZ);

    const filtered = allEvents.filter((event: any) => {
      const eventDate = tz.zonedTimeToUtc(parseISO(event.date), berlinTZ);
      return eventDate >= start && eventDate <= end;
    });

    setFilteredEvents(filtered);
    setShowJson(true);

    const json = JSON.stringify(filtered, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const filename = `events-${format(start, "yyyyMMdd")}-${format(end, "yyyyMMdd")}.json`;
    fileSaver.saveAs(blob, filename);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Extract Events</h2>
      <p className="text-gray-700">Download Cologne Raves events as JSON by date range</p>

      <div className="flex gap-4 mb-4">
        <div className="flex flex-col">
          <label className="text-sm">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <Button className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800" onClick={handleExtract}>
        Extract JSON
      </Button>

      {showJson && (
        <pre className="mt-4 p-4 bg-gray-100 text-sm overflow-x-auto">
          {JSON.stringify(filteredEvents, null, 2)}
        </pre>
      )}
    </div>
  );
}
