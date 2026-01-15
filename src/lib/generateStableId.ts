import { createHash } from "crypto";

export interface PartyIdentity {
  title: string;
  date: string;
  venue?: string;
}

export function generateStableId(party: PartyIdentity): string {
  const hash = createHash("md5")
    .update(JSON.stringify([party.title, party.date, party.venue || ""]))
    .digest("hex");
  return hash.slice(0, 8);
}
