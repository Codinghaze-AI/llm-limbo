import path from "node:path";
import { glob } from "glob";

let dataRoot: string = path.resolve("./data");

export function setDataRoot(dir: string) {
  dataRoot = path.resolve(dir);
}

export function getDataRoot(): string {
  return dataRoot;
}

/** Resolve a relative path, jailing it inside dataRoot. Throws on traversal. */
function safePath(relPath: string): string {
  const resolved = path.resolve(dataRoot, relPath);
  if (!resolved.startsWith(dataRoot + path.sep) && resolved !== dataRoot) {
    throw new Error(`Path traversal attempt blocked: ${relPath}`);
  }
  return resolved;
}

export async function readJSON<T = unknown>(relPath: string, fallback: T): Promise<T> {
  const full = safePath(relPath);
  const file = Bun.file(full);
  if (!(await file.exists())) return fallback;
  try {
    return (await file.json()) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON(relPath: string, data: unknown): Promise<void> {
  const full = safePath(relPath);
  // Ensure parent directory exists
  await Bun.$`mkdir -p ${path.dirname(full)}`.quiet();
  // Atomic write: write to temp file, then rename
  const tmp = full + ".tmp";
  await Bun.write(tmp, JSON.stringify(data, null, 2));
  await Bun.$`mv ${tmp} ${full}`.quiet();
}

export async function listFiles(pattern: string): Promise<string[]> {
  const full = safePath(pattern);
  // Verify the pattern stays inside dataRoot
  const dir = path.dirname(full);
  if (!dir.startsWith(dataRoot)) {
    throw new Error(`Pattern traversal attempt blocked: ${pattern}`);
  }
  const matches = await glob(full);
  // Return paths relative to dataRoot
  return matches.map((m) => path.relative(dataRoot, m));
}

export async function deleteFile(relPath: string): Promise<void> {
  const full = safePath(relPath);
  const file = Bun.file(full);
  if (await file.exists()) {
    await Bun.$`rm ${full}`.quiet();
  }
}
