// Reads schema/*.js straight off the read-only bind mount of the SAME
// ./schema directory cube_api itself loads from (see docker-compose.yml).
// This is the one thing in this app that can never drift from what's
// actually deployed -- it's the literal file on disk, not a copy, a git
// ref, or a cached snapshot.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const SCHEMA_DIR = process.env.SCHEMA_DIR || "/app/schema";

export interface SchemaFile {
  name: string;
  content: string;
}

export async function listSchemaFiles(): Promise<SchemaFile[]> {
  const entries = await readdir(SCHEMA_DIR, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && e.name.endsWith(".js"));
  return Promise.all(
    files.map(async (f) => ({
      name: f.name,
      content: await readFile(join(SCHEMA_DIR, f.name), "utf8"),
    }))
  );
}
