"use client";

import React, { useState } from "react";
import * as fileSaver from "file-saver";
import * as tz from "date-fns-tz";
import { getAllParties } from "@/lib/getAllParties";
import { parseISO, format } from "date-fns";

export default function ExtractEvents() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);

  const handleExtract = async () => {
    if (!startDate || !endDate) return;

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const allParties = await getAllParties();

    const filtered = allParties.filter((event) => {
      const eventDate = parseISO(event.date);
      return eventDate >= start && eventDate <= end;
    });

    setFilteredEvents(filtered);
    setShowJson(true);
  };

  const handleDownload = () => {
    const berlinNow = tz.utcToZonedTime(new Date(), "Europe/Berlin");
    const filename = format(berlinNow, "yyyy-MM") + "-cologne-extract.json";
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], {
      type: "application/json",
    });
    fileSaver.saveAs(blob, filename);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Extract Events</h1>
      <div className="flex gap-4 mb-4">
        <div className="flex flex-col">
          <label className="text-sm">Start Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">End Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <button
        onClick={handleExtract}
        className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
      >
        Extract JSON
      </button>

      {showJson && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Result</h2>
          <pre className="bg-gray-100 p-2 rounded max-h-80 overflow-auto text-sm">
            {JSON.stringify(filteredEvents, null, 2)}
          </pre>
          <button
            onClick={handleDownload}
            className="mt-4 bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
          >
            Download
          </button>
        </div>
      )}
    </div>
  );
}
