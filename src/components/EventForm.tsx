import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { saveAs } from 'file-saver';
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";

function generateStableId(venue: string, date: string, title: string): string {
  const input = `${venue}-${date}-${title}`;
  const hashBuffer = new TextEncoder().encode(input);
  return crypto.subtle.digest('SHA-1', hashBuffer).then(buffer => {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 8);
  });
}

export default function EventForm() {
  const [events, setEvents] = useState([
    { title: '', venue: '', date: '', startTime: '', artists: '', url: '', id: '' },
  ]);
  const [output, setOutput] = useState('');
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...events];
    updated[index][field] = value;
    setEvents(updated);
  };

  const addEvent = () => {
    if (events.length < 4) {
      setEvents([...events, { title: '', venue: '', date: '', startTime: '', artists: '', url: '', id: '' }]);
    }
  };

  const generateJSON = async () => {
    const processed = await Promise.all(events.map(async (e) => {
      const id = e.id || await generateStableId(e.venue, e.date, e.title);
      return {
        id,
        title: e.title.trim(),
        venue: e.venue.trim(),
        date: e.date,
        startTime: e.startTime,
        artists: e.artists ? e.artists.split(',').map(a => a.trim()).filter(Boolean) : [],
        url: e.url.trim() || undefined,
      };
    }));
    const json = JSON.stringify(processed, null, 2);
    setOutput(json);
  };

  const downloadJSON = () => {
    const blob = new Blob([output], { type: 'application/json' });
    saveAs(blob, 'cologne-events.json');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Create Your Cologne Raves Events JSON</h1>
      {events.map((event, i) => (
        <Card key={i} className="p-4">
          <CardContent className="grid gap-4">
            <Input
              placeholder="Title"
              value={event.title}
              onChange={(e) => handleChange(i, 'title', e.target.value)}
              required
            />
            <Input
              placeholder="Venue"
              value={event.venue}
              onChange={(e) => handleChange(i, 'venue', e.target.value)}
              required
            />
            <Input
              type="date"
              value={event.date}
              onChange={(e) => handleChange(i, 'date', e.target.value)}
              required
            />
            <Input
              placeholder="Start Time (e.g. 23:00)"
              value={event.startTime}
              onChange={(e) => handleChange(i, 'startTime', e.target.value)}
              required
              className={event.startTime && !timePattern.test(event.startTime) ? 'border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500' : ''}
            />
            {event.startTime && !timePattern.test(event.startTime) && (
              <p className="text-red-500 text-sm">Please enter a valid time in hh:mm format.</p>
            )}
            <Input
              placeholder="Artists (comma-separated)"
              value={event.artists}
              onChange={(e) => handleChange(i, 'artists', e.target.value)}
            />
            <Input
              placeholder="Event URL"
              value={event.url}
              onChange={(e) => handleChange(i, 'url', e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Input
                placeholder="Custom ID (optional)"
                value={event.id}
                onChange={(e) => handleChange(i, 'id', e.target.value)}
                className="flex-1"
              />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">Info</Button>
                </DialogTrigger>
                <DialogContent className="text-center">
                  <img
                    src="/id-override.png"
                    alt="ID override info"
                    className="mx-auto max-w-full rounded-md mb-4"
                  />
                  <p>Entering an existing ID will overwrite that event instead of creating a new one.</p>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button onClick={addEvent} disabled={events.length >= 4}>+ Add Event</Button>
        <Button onClick={generateJSON}>Generate JSON</Button>
      </div>
      {output && (
        <div className="space-y-4">
          <Textarea
            className="w-full h-64 font-mono text-sm"
            readOnly
            value={output}
          />
          <Button onClick={downloadJSON}>Download JSON</Button>
        </div>
      )}
    </div>
  );
}
