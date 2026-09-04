// Talks to Cube Store directly over its MySQL wire protocol (internal
// docker network -- `cubestore:3306`, no auth of its own, same as the
// `mysql -h <NETBIRD_IP> -P 3306` access used throughout this project).
//
// Why: the cube_api system routes (/cubejs-system/v1/pre-aggregations/*)
// only ever report the CURRENT build per partition -- versionEntries has
// exactly one entry, confirmed live. Cube Store itself keeps OLD table
// generations around for any partition still inside its refreshKey
// updateWindow (each incremental rebuild creates a new physical table
// rather than overwriting one), so querying system.tables directly is the
// only way to see an actual rebuild timeline -- and only for partitions
// still being incrementally refreshed; older/sealed ones settle at a
// single generation.
import mysql from "mysql2/promise";

const CUBESTORE_HOST = process.env.CUBESTORE_HOST || "cubestore";
const CUBESTORE_PORT = Number(process.env.CUBESTORE_PORT || 3306);

export interface TableGeneration {
  tableName: string; // physical table name, e.g. agg_pre_agg_station20260901_xxx_yyy_zzz
  createdAt: string;
}

export interface PartitionHistory {
  // Logical partition name (schema-qualified, matches the `tableName`
  // field the /cubejs-system/v1/pre-aggregations/partitions API already
  // returns per partition) -- e.g. prod_pre_aggregations.agg_pre_agg_station20260901
  logicalName: string;
  generations: TableGeneration[]; // newest first
}

// Physical table names are <logical name>_<contentVersion>_<structureVersion>_<internalId>,
// three trailing underscore-separated base36-ish segments -- confirmed live,
// e.g. agg_pre_agg_station20260901_c33v1pwz_d4nldg5b_1l9iaga. Strip them to
// group generations of the same logical partition together.
const GENERATION_SUFFIX = /_[0-9a-z]{5,12}_[0-9a-z]{5,12}_[0-9a-z]{5,12}$/;

export async function fetchPartitionHistory(): Promise<PartitionHistory[]> {
  const conn = await mysql.createConnection({
    host: CUBESTORE_HOST,
    port: CUBESTORE_PORT,
    connectTimeout: 10_000,
  });
  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT table_schema, table_name, created_at FROM system.tables WHERE table_schema = 'prod_pre_aggregations' ORDER BY created_at DESC"
    );
    const groups = new Map<string, PartitionHistory>();
    for (const row of rows) {
      const physical = String(row.table_name);
      const logical = physical.replace(GENERATION_SUFFIX, "");
      const logicalName = `${row.table_schema}.${logical}`;
      let group = groups.get(logicalName);
      if (!group) {
        group = { logicalName, generations: [] };
        groups.set(logicalName, group);
      }
      group.generations.push({
        tableName: physical,
        createdAt: new Date(row.created_at).toISOString(),
      });
    }
    return [...groups.values()];
  } finally {
    await conn.end();
  }
}
