"use client";

import React, { useState } from "react";
import * as fileSaver from "file-saver";
import * as tz from "date-fns-tz";
import { getAllParties } from "@/lib/getAllParties";
import { parseISO, format } from "date-fns";

export default function ExtractEvents() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleExtract = async () => {
    if (!startDate || !endDate) return;

    const allEvents = await getAllParties();
    const start = tz.zonedTimeToUtc(parseISO(startDate), "Europe/Berlin");
    const end = tz.zonedTimeToUtc(parseISO(endDate), "Europe/Berlin");

    const filtered = allEvents.filter((ev: any) => {
      const evDate = tz.zonedTimeToUtc(parseISO(ev.date), "Europe/Berlin");
      return evDate >= start && evDate <= end;
    });

    const suffix = `${format(start, "dd")}-${format(end, "dd")}`;
    const fileName = `2025-04-cologne-${suffix}.json`;
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });

    fileSaver.saveAs(blob, fileName);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Extract Events</h2>
      <p className="text-gray-700 mb-4">
        Download Cologne Raves events as JSON by date range
      </p>
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
        className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800"
        onClick={handleExtract}
      >
        Extract JSON
      </button>
    </div>
  );
}
