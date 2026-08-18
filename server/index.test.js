import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { createServer } from "./index.js";

let server;
let baseUrl;
let dataFile;
let temporaryDirectory;

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "poster-lab-api-"));
  dataFile = path.join(temporaryDirectory, "data.json");
  server = createServer({ dataFile, adminToken: "test-secret" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

async function request(pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = response.headers.get("content-type")?.includes("json") ? await response.json() : await response.text();
  return { response, body };
}

test("health and static frontend are available", async () => {
  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.body.status, "ok");

  const index = await request("/");
  assert.equal(index.response.status, 200);
  assert.match(index.body, /Poster Lab/);

  const head = await fetch(`${baseUrl}/index.html`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("bootstrap returns plain arrays in a single request", async () => {
  const bootstrap = await request("/api/bootstrap");
  assert.equal(bootstrap.response.status, 200);
  assert.ok(Array.isArray(bootstrap.body.styles));
  assert.ok(Array.isArray(bootstrap.body.inspirations));
  assert.ok(Array.isArray(bootstrap.body.templates));
  assert.ok(bootstrap.body.styles.length >= 8);
});

test("collections expose seeded data and filters", async () => {
  const styles = await request("/api/styles");
  assert.equal(styles.response.status, 200);
  assert.ok(styles.body.meta.total >= 8);

  const inspirations = await request("/api/inspirations?styleId=thermal-glow&pageSize=2");
  assert.equal(inspirations.response.status, 200);
  assert.ok(inspirations.body.data.length <= 2);
  assert.ok(inspirations.body.data.every((item) => item.styleId === "thermal-glow"));

  const templates = await request("/api/templates");
  assert.equal(templates.response.status, 200);
  assert.ok(templates.body.data.some((item) => item.id === "photo-serif"));
  assert.equal(Object.hasOwn(templates.body.data[0], "render"), false);
});

test("new records persist and can be updated", async () => {
  const unauthorized = await request("/api/inspirations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Blocked" }),
  });
  assert.equal(unauthorized.response.status, 401);

  const create = await request("/api/inspirations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test-secret" },
    body: JSON.stringify({ id: "test-inspiration", file: "test.png", title: "Test", styleId: "minimal-editorial", tags: [], note: "test" }),
  });
  assert.equal(create.response.status, 201);
  assert.equal(create.body.data.id, "test-inspiration");

  const update = await request("/api/inspirations/test-inspiration", {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: "Bearer test-secret" },
    body: JSON.stringify({ note: "updated" }),
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.body.data.note, "updated");

  const persisted = JSON.parse(await fs.readFile(dataFile, "utf8"));
  assert.equal(persisted.inspirations.at(-1).note, "updated");
});

test("malformed JSON and unknown routes return useful errors", async () => {
  const malformed = await request("/api/styles", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test-secret" },
    body: "not-json",
  });
  assert.equal(malformed.response.status, 400);

  const missing = await request("/api/styles/no-such-style");
  assert.equal(missing.response.status, 404);
});

test("private project files cannot be served", async () => {
  const git = await request("/.git/HEAD");
  assert.equal(git.response.status, 404);

  const storage = await request("/server/data.json");
  assert.equal(storage.response.status, 404);

  const packageFile = await request("/package.json");
  assert.equal(packageFile.response.status, 404);
});

test("CORS is same-origin by default", async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { origin: "https://example.com" } });
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
