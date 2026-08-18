import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DataStore, collections } from "./store.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(serverDirectory, "..");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, jsonHeaders);
  response.end(`${JSON.stringify(payload)}\n`);
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: { message, status: statusCode } });
}

function isLoopback(address = "") {
  const normalized = address.startsWith("::ffff:") ? address.slice(7) : address;
  return normalized === "::1" || normalized === "127.0.0.1" || normalized.startsWith("127.");
}

function tokensMatch(presented, expected) {
  const presentedBuffer = Buffer.from(presented);
  const expectedBuffer = Buffer.from(expected);
  return presentedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(presentedBuffer, expectedBuffer);
}

function authorizeMutation(request, adminToken) {
  if (!adminToken) {
    if (isLoopback(request.socket.remoteAddress)) return null;
    return {
      status: 503,
      message: "Writes are disabled for remote clients until POSTER_LAB_ADMIN_TOKEN is configured",
    };
  }

  const authorization = request.headers.authorization || "";
  const presented = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!presented || !tokensMatch(presented, adminToken)) {
    return { status: 401, message: "A valid Bearer token is required" };
  }
  return null;
}

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) {
      const error = new Error("Request body is too large (maximum 1 MiB)");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function collectionPayload(collection, items, query) {
  let filtered = items;
  const search = query.get("q")?.trim().toLowerCase();
  const styleId = query.get("styleId")?.trim();
  if (styleId) filtered = filtered.filter((item) => item.styleId === styleId);
  if (search) {
    filtered = filtered.filter((item) => JSON.stringify(item).toLowerCase().includes(search));
  }

  const requestedPageSize = Number(query.get("pageSize") || 0);
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
    ? Math.min(requestedPageSize, 100)
    : null;
  const requestedPage = Number(query.get("page") || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const total = filtered.length;
  if (pageSize) filtered = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: filtered,
    meta: {
      collection,
      count: filtered.length,
      total,
      ...(pageSize ? { page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) } : {}),
    },
  };
}

async function serveStatic(response, requestPath, headOnly = false) {
  const pathname = requestPath === "/" ? "/index.html" : requestPath;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendError(response, 400, "Invalid path encoding");
    return;
  }

  // Only expose files the browser needs. In particular, never make the Git
  // repository, backend storage, environment files, or package metadata public.
  const isAllowed = decodedPath === "/index.html"
    || decodedPath === "/favicon.ico"
    || /^\/(?:css|js|data|assets|vendor)\/[A-Za-z0-9_@+.,%()\-\/]+$/.test(decodedPath);
  const containsPrivateSegment = decodedPath.split("/").some((segment) => segment.startsWith("."));
  if (!isAllowed || containsPrivateSegment) {
    sendError(response, 404, "File not found");
    return;
  }

  const requestedFile = path.resolve(projectDirectory, `.${decodedPath}`);
  if (requestedFile !== projectDirectory && !requestedFile.startsWith(`${projectDirectory}${path.sep}`)) {
    sendError(response, 403, "Path is outside the project");
    return;
  }

  try {
    const stat = await fs.stat(requestedFile);
    if (!stat.isFile()) throw Object.assign(new Error("Not a file"), { code: "ENOENT" });
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(requestedFile).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Content-Length": stat.size,
    });
    response.end(headOnly ? undefined : await fs.readFile(requestedFile));
  } catch (error) {
    if (error.code === "ENOENT") sendError(response, 404, "File not found");
    else sendError(response, 500, "Unable to read file");
  }
}

export function createServer({
  dataFile,
  adminToken = process.env.POSTER_LAB_ADMIN_TOKEN || "",
  corsOrigin = process.env.CORS_ORIGIN || "",
} = {}) {
  const store = new DataStore(dataFile);
  return http.createServer(async (request, response) => {
    if (corsOrigin) {
      response.setHeader("Access-Control-Allow-Origin", corsOrigin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    let url;
    try {
      url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    } catch {
      sendError(response, 400, "Invalid URL");
      return;
    }

    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        sendJson(response, 200, { status: "ok", service: "poster-lab-api", time: new Date().toISOString() });
        return;
      }

      if (url.pathname === "/api/bootstrap" && request.method === "GET") {
        const { inspirations, styles, templates } = await store.snapshot();
        sendJson(response, 200, { inspirations, styles, templates });
        return;
      }

      const apiMatch = url.pathname.match(/^\/api\/(styles|inspirations|templates)(?:\/([^/]+))?$/);
      if (apiMatch) {
        const [, collection, encodedId] = apiMatch;
        if (!collections.includes(collection)) {
          sendError(response, 404, "Unknown collection");
          return;
        }
        const id = encodedId ? decodeURIComponent(encodedId) : null;
        if (request.method === "GET") {
          if (id) {
            const item = await store.find(collection, id);
            if (!item) return sendError(response, 404, `${collection} item not found`);
            sendJson(response, 200, { data: item });
          } else {
            sendJson(response, 200, collectionPayload(collection, await store.list(collection), url.searchParams));
          }
          return;
        }
        if (request.method === "POST" && !id) {
          const authorizationError = authorizeMutation(request, adminToken);
          if (authorizationError) return sendError(response, authorizationError.status, authorizationError.message);
          const payload = await readBody(request);
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) return sendError(response, 400, "Request body must be a JSON object");
          const item = await store.add(collection, payload);
          sendJson(response, 201, { data: item });
          return;
        }
        if ((request.method === "PATCH" || request.method === "PUT") && id) {
          const authorizationError = authorizeMutation(request, adminToken);
          if (authorizationError) return sendError(response, authorizationError.status, authorizationError.message);
          const payload = await readBody(request);
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) return sendError(response, 400, "Request body must be a JSON object");
          const item = await store.update(collection, id, payload);
          if (!item) return sendError(response, 404, `${collection} item not found`);
          sendJson(response, 200, { data: item });
          return;
        }
        sendError(response, 405, "Method not allowed");
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        sendError(response, 404, "API route not found");
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendError(response, 405, "Method not allowed");
        return;
      }
      await serveStatic(response, url.pathname, request.method === "HEAD");
    } catch (error) {
      sendError(response, error.statusCode || 500, error.statusCode ? error.message : "Internal server error");
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer();
  server.listen(port, host, () => {
    console.log(`Poster Lab running at http://${host}:${port}`);
    console.log(`API available at http://${host}:${port}/api/health`);
  });
}
