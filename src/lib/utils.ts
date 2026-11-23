import fileSaver from "file-saver";

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

// "YYYY-MM-cologne-DD<suffix>.json" in local time, the naming scheme of data/ files.
export function datedFilename(suffix: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-cologne-${pad(now.getDate())}${suffix}.json`;
}

export function saveJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  fileSaver.saveAs(blob, filename);
}
