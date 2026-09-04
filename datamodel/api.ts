import { api } from "encore.dev/api";
import { fetchMeta } from "../shared/cubeApi";
import { listSchemaFiles, SchemaFile } from "../shared/schemaFiles";

interface MetaResponse {
  // Passed through verbatim from cube_api's own /cubejs-api/v1/meta --
  // deliberately not re-typed/re-parsed here, so this always matches
  // exactly what Cube's own compiler believes is loaded, with no
  // reimplementation of schema parsing to drift out of sync.
  cubes: unknown[];
}

export const meta = api(
  { expose: true, method: "GET", path: "/api/model/meta" },
  async (): Promise<MetaResponse> => {
    const result = (await fetchMeta()) as MetaResponse;
    return result;
  }
);

interface FilesResponse {
  files: SchemaFile[];
}

export const files = api(
  { expose: true, method: "GET", path: "/api/model/files" },
  async (): Promise<FilesResponse> => {
    const files = await listSchemaFiles();
    return { files };
  }
);
