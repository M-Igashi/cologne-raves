import { useState } from "react";
import type { Party } from "@/lib/getAllParties";
import { datedFilename, saveJson } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  allParties: Party[];
}

export default function ExtractEvents({ allParties }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredEvents, setFilteredEvents] = useState<Party[]>([]);
  const [showJson, setShowJson] = useState(false);

  const filterEvents = () => {
    if (!startDate || !endDate) return;
    setFilteredEvents(
      allParties.filter((event) => event.date >= startDate && event.date <= endDate),
    );
    setShowJson(true);
  };

  const downloadJson = () => saveJson(filteredEvents, datedFilename("-extract"));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Extract Events</h2>
      <p className="text-mute">Download events by date range</p>

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
            <pre className="mt-4 p-4 bg-panel border border-line text-sm overflow-x-auto">
              {JSON.stringify(filteredEvents, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
