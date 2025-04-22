import { createHash } from 'crypto';

export function generateStableId(party: { date: string; title: string }) {
  const hash = createHash('sha256');
  hash.update(`${party.date}-${party.title}`);
  return hash.digest('hex').slice(0, 8);
}