import fs from "fs";
import path from "path";
import { z } from "zod";
import eventSchema from "../../event.schema.json";

const Event = z.object({
  id: z.string(),
  date: z.string(),
  venue: z.string(),
  title: z.string(),
  url: z.string().optional(),
  startTime: z.string().optional(),
  artists: z.array(z.string()).optional(),
});

export type Party = z.infer<typeof Event> & {
  sourceFile?: string;
};

export async function getAllParties(): Promise<Party[]> {
  const dataDir = path.resolve("data");
  const files = fs.readdirSync(dataDir);

  const parties: Party[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(dataDir, file);
    const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (!Array.isArray(json)) continue;

    for (const event of json) {
      const result = Event.safeParse(event);
      if (result.success) {
        parties.push({ ...result.data, sourceFile: file });
      }
    }
  }

  return parties.sort((a, b) => a.date.localeCompare(b.date));
}