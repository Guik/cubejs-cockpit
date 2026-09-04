import { api } from "encore.dev/api";
import { INDEX_HTML } from "./indexHtml";

export const index = api.raw(
  { expose: true, path: "/", method: "GET" },
  async (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    resp.end(INDEX_HTML);
  }
);
