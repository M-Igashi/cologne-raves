"use client";

import React, { useState } from "react";
import fileSaver from "file-saver";
const { saveAs } = fileSaver;
import { getAllParties } from "@/lib/getAllParties";
import { parseISO, format } from "date-fns";
import dfnsTz from "date-fns-tz";
const { utcToZonedTime } = dfnsTz;


export default function ExtractEvents() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);

  const handleExtract = async () => {
    if (!startDate || !endDate) return;

    const allEvents = await getAllParties();
    const tz = "Europe/Berlin";

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const filtered = allEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      const zonedEventDate = utcToZonedTime(eventDate, tz);
      return zonedEventDate >= start && zonedEventDate <= end;
    });

    setFilteredEvents(filtered);
  };

  const downloadJson = () => {
    if (filteredEvents.length === 0) return;

    const start = format(parseISO(startDate), "dd");
    const end = format(parseISO(endDate), "dd");
    const now = new Date();
    const filename = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-cologne-${start}-${end}.json`;

    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, filename);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Extract Events</h2>
      <p className="text-gray-700">Download Cologne Raves events as JSON by date range</p>

      <div className="space-y-2">
        <label className="block font-medium">Start Date</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded px-2 py-1" />

        <label className="block font-medium">End Date</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded px-2 py-1" />
      </div>

      <div className="flex flex-wrap gap-4 pt-4">
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={handleExtract}
        >
          Extract JSON
        </button>
        {filteredEvents.length > 0 && (
          <>
            <button
              className="bg-black text-white px-4 py-2 rounded"
              onClick={downloadJson}
            >
              Download JSON
            </button>
            <button
              className="border px-4 py-2 rounded"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? "Hide JSON" : "Show JSON"}
            </button>
          </>
        )}
      </div>

      {showJson && (
        <pre className="mt-4 p-4 bg-gray-100 text-sm overflow-x-auto">
          {JSON.stringify(filteredEvents, null, 2)}
        </pre>
      )}
    </div>
  );
}
