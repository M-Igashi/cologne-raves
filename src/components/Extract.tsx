import React, { useState } from "react";
import { saveAs } from "file-saver";
import { getAllParties } from "@/lib/getAllParties";
import { parseISO, format } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";

export default function ExtractEvents() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [showJson, setShowJson] = useState(false);

  const handleExtract = async () => {
    if (!startDate || !endDate) return;

    const allEvents = await getAllParties();
    const tz = "Europe/Berlin";

    const start = zonedTimeToUtc(parseISO(startDate), tz);
    const end = zonedTimeToUtc(parseISO(endDate), tz);

    const filtered = allEvents.filter((event) => {
      const eventDate = zonedTimeToUtc(parseISO(event.date), tz);
      return eventDate >= start && eventDate <= end;
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
