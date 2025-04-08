"use client";

import React, { useState } from "react";
import fileSaver from "file-saver";
import * as tz from "date-fns-tz";
import { getAllParties } from "@/lib/getAllParties";
import { parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const { saveAs } = fileSaver;

export default function ExtractEvents() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleExtract = async () => {
    if (!startDate || !endDate) return;

    const allParties = await getAllParties();

    const berlinStart = tz.utcToZonedTime(parseISO(startDate), "Europe/Berlin");
    const berlinEnd = tz.utcToZonedTime(parseISO(endDate), "Europe/Berlin");

    const filtered = allParties.filter((p) => {
      const partyDate = parseISO(p.date);
      return partyDate >= berlinStart && partyDate <= berlinEnd;
    });

    const json = JSON.stringify(filtered, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const filename = `events-${startDate}-to-${endDate}.json`;
    saveAs(blob, filename);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Extract Events by Date</h2>
      <p className="text-gray-700">Filter events by date range and download as JSON</p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div>
          <label className="text-sm block font-medium">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm block font-medium">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <Button className="w-full sm:w-auto" onClick={handleExtract}>
        Extract JSON
      </Button>
    </div>
  );
}
