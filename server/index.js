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
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const OPENAI_API_BASE = "https://api.openai.com/v1";
const GITHUB_PAGES_ORIGIN = "https://ronanttl2005-max.github.io";

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

async function readBody(request, maxBytes = 1024 * 1024) {
  const chunks = [];
  let bytes = 0;
  // Drain the whole stream even when over the limit: aborting mid-body makes
  // clients see a reset instead of the 413 response (and breaks under Bun).
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes <= maxBytes) chunks.push(chunk);
  }
  if (bytes > maxBytes) {
    const error = new Error(`Request body is too large (maximum ${Math.round(maxBytes / (1024 * 1024))} MiB)`);
    error.statusCode = 413;
    throw error;
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

function bearerToken(request) {
  const authorization = request.headers.authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function dataUrlBytes(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([a-z0-9/+.-]+);base64,(.*)$/is);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  return bytes.length ? { mime: match[1].toLowerCase(), bytes } : null;
}

async function proxyOpenAi(response, upstream) {
  const contentType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
  const body = await upstream.text();
  response.writeHead(upstream.status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

async function proxyOpenAiResponses(request, response, maxBytes = 20 * 1024 * 1024) {
  const apiKey = bearerToken(request);
  if (!apiKey) return sendError(response, 401, "An OpenAI API key is required");
  const payload = await readBody(request, maxBytes);
  const upstream = await fetch(`${OPENAI_API_BASE}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  await proxyOpenAi(response, upstream);
}

async function proxyOpenAiImageEdit(request, response, maxBytes = 20 * 1024 * 1024) {
  const apiKey = bearerToken(request);
  if (!apiKey) return sendError(response, 401, "An OpenAI API key is required");
  const payload = await readBody(request, maxBytes);
  const image = dataUrlBytes(payload?.imageDataUrl);
  if (!image) return sendError(response, 400, "'imageDataUrl' must be a base64 image data URL");
  const form = new FormData();
  form.append("model", String(payload.model || "gpt-image-2"));
  form.append("prompt", String(payload.prompt || ""));
  form.append("image", new Blob([image.bytes], { type: image.mime }), "input-image");
  if (payload.size) form.append("size", String(payload.size));
  if (payload.quality) form.append("quality", String(payload.quality));
  const upstream = await fetch(`${OPENAI_API_BASE}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  await proxyOpenAi(response, upstream);
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

const folderKinds = ["brand", "theme", "custom"];

async function validateFolderPayload(store, payload, { partial = false, selfId = null } = {}) {
  if (!partial || Object.hasOwn(payload, "name")) {
    if (typeof payload.name !== "string" || !payload.name.trim()) {
      return "Folder 'name' must be a non-empty string";
    }
  }
  if (!partial || Object.hasOwn(payload, "kind")) {
    if (!folderKinds.includes(payload.kind)) {
      return `Folder 'kind' must be one of: ${folderKinds.join(", ")}`;
    }
  }
  if (Object.hasOwn(payload, "parentId") && payload.parentId !== null && payload.parentId !== undefined && payload.parentId !== "") {
    const parent = (await store.list("folders")).find((entry) => String(entry.id) === String(payload.parentId));
    if (!parent) return "Folder 'parentId' must reference an existing folder";
    if (parent.parentId) return "Folders can only be nested one level deep: the parent must be a top-level folder";
    if (selfId !== null && String(parent.id) === String(selfId)) return "A folder cannot be its own parent";
  }
  return null;
}

const uploadMimeExtensions = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function sanitizeUploadName(name, extension) {
  const base = path.basename(String(name || ""), path.extname(String(name || "")));
  const cleaned = base.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "upload";
  return `${cleaned}-${Date.now().toString(36)}${extension}`;
}

async function saveUpload(uploadsDir, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: { status: 400, message: "Request body must be a JSON object" } };
  }
  const dataUrl = typeof payload.dataUrl === "string" ? payload.dataUrl : "";
  const match = dataUrl.match(/^data:([a-z0-9/+.-]+);base64,(.*)$/is);
  if (!match) {
    return { error: { status: 400, message: "'dataUrl' must be a base64 data URL" } };
  }
  const mime = match[1].toLowerCase();
  const extension = uploadMimeExtensions[mime];
  if (!extension) {
    return { error: { status: 400, message: `Unsupported image type '${mime}'. Allowed: ${Object.keys(uploadMimeExtensions).join(", ")}` } };
  }
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length) {
    return { error: { status: 400, message: "'dataUrl' contains no image data" } };
  }

  await fs.mkdir(uploadsDir, { recursive: true });
  let fileName = sanitizeUploadName(payload.name, extension);
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.writeFile(path.join(uploadsDir, fileName), bytes, { flag: "wx" });
      break;
    } catch (error) {
      if (error.code !== "EEXIST" || attempt >= 20) throw error;
      fileName = `${fileName.slice(0, -extension.length)}-${crypto.randomBytes(3).toString("hex")}${extension}`;
    }
  }
  return { fileName };
}

async function serveUpload(response, uploadsDir, requestPath, headOnly = false) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch {
    sendError(response, 400, "Invalid path encoding");
    return;
  }
  const fileName = decodedPath.slice("/uploads/".length);
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.startsWith(".")) {
    sendError(response, 404, "File not found");
    return;
  }
  const filePath = path.resolve(uploadsDir, fileName);
  if (filePath !== path.join(path.resolve(uploadsDir), fileName)) {
    sendError(response, 404, "File not found");
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw Object.assign(new Error("Not a file"), { code: "ENOENT" });
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "Content-Length": stat.size,
    });
    response.end(headOnly ? undefined : await fs.readFile(filePath));
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
  const uploadsDir = process.env.POSTER_LAB_UPLOADS_DIR || path.join(path.dirname(store.filePath), "uploads");
  return http.createServer(async (request, response) => {
    const requestOrigin = request.headers.origin || "";
    // GitHub Pages is a separate static origin. Allow only this known site by
    // default; deployments may still override it with CORS_ORIGIN.
    const allowedOrigin = corsOrigin === "*"
      ? "*"
      : corsOrigin || (requestOrigin === GITHUB_PAGES_ORIGIN ? GITHUB_PAGES_ORIGIN : "");
    if (allowedOrigin) {
      response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
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
        const { inspirations, styles, templates, folders } = await store.snapshot();
        sendJson(response, 200, { inspirations, styles, templates, folders });
        return;
      }

      if (url.pathname === "/api/ai/responses" && request.method === "POST") {
        await proxyOpenAiResponses(request, response);
        return;
      }

      if (url.pathname === "/api/ai/images/edits" && request.method === "POST") {
        await proxyOpenAiImageEdit(request, response);
        return;
      }

      if (url.pathname === "/api/uploads" && request.method === "POST") {
        const authorizationError = authorizeMutation(request, adminToken);
        if (authorizationError) return sendError(response, authorizationError.status, authorizationError.message);
        const payload = await readBody(request, 8 * 1024 * 1024);
        const result = await saveUpload(uploadsDir, payload);
        if (result.error) return sendError(response, result.error.status, result.error.message);
        sendJson(response, 201, { data: { src: `/uploads/${result.fileName}` } });
        return;
      }

      const apiMatch = url.pathname.match(/^\/api\/(styles|inspirations|templates|folders)(?:\/([^/]+))?$/);
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
          if (collection === "folders") {
            const validationError = await validateFolderPayload(store, payload);
            if (validationError) return sendError(response, 400, validationError);
          }
          const item = await store.add(collection, payload);
          sendJson(response, 201, { data: item });
          return;
        }
        if ((request.method === "PATCH" || request.method === "PUT") && id) {
          const authorizationError = authorizeMutation(request, adminToken);
          if (authorizationError) return sendError(response, authorizationError.status, authorizationError.message);
          const payload = await readBody(request);
          if (!payload || typeof payload !== "object" || Array.isArray(payload)) return sendError(response, 400, "Request body must be a JSON object");
          if (collection === "folders") {
            const validationError = await validateFolderPayload(store, payload, { partial: true, selfId: id });
            if (validationError) return sendError(response, 400, validationError);
          }
          const item = await store.update(collection, id, payload);
          if (!item) return sendError(response, 404, `${collection} item not found`);
          sendJson(response, 200, { data: item });
          return;
        }
        if (request.method === "DELETE" && id && (collection === "inspirations" || collection === "folders")) {
          const authorizationError = authorizeMutation(request, adminToken);
          if (authorizationError) return sendError(response, authorizationError.status, authorizationError.message);

          if (collection === "inspirations") {
            const removed = await store.remove("inspirations", id);
            if (!removed) return sendError(response, 404, "inspirations item not found");
            if (typeof removed.src === "string" && removed.src.startsWith("/uploads/")) {
              const fileName = removed.src.slice("/uploads/".length);
              if (fileName && !fileName.includes("/") && !fileName.includes("\\") && !fileName.startsWith(".")) {
                await fs.rm(path.join(uploadsDir, fileName), { force: true }).catch(() => {});
              }
            }
            sendJson(response, 200, { data: removed });
            return;
          }

          const folder = await store.find("folders", id);
          if (!folder) return sendError(response, 404, "folders item not found");
          const children = (await store.list("folders")).filter((entry) => entry.parentId && String(entry.parentId) === String(folder.id));
          const removedIds = [folder.id, ...children.map((child) => child.id)].map(String);
          for (const folderId of removedIds) {
            await store.remove("folders", folderId);
          }
          for (const inspiration of await store.list("inspirations")) {
            if (!Array.isArray(inspiration.collectionIds)) continue;
            const remaining = inspiration.collectionIds.filter((value) => !removedIds.includes(String(value)));
            if (remaining.length !== inspiration.collectionIds.length) {
              await store.update("inspirations", inspiration.id ?? inspiration.file, { collectionIds: remaining });
            }
          }
          sendJson(response, 200, { data: folder });
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
      if (url.pathname.startsWith("/uploads/")) {
        await serveUpload(response, uploadsDir, url.pathname, request.method === "HEAD");
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
