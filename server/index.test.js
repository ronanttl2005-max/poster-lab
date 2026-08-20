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
  assert.ok(Array.isArray(bootstrap.body.folders));
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

const authorizedJson = { "content-type": "application/json", authorization: "Bearer test-secret" };
const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test("folders can be created, validated, and updated", async () => {
  const unauthorized = await request("/api/folders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Blocked", kind: "custom" }),
  });
  assert.equal(unauthorized.response.status, 401);

  const missingName = await request("/api/folders", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "  ", kind: "custom" }),
  });
  assert.equal(missingName.response.status, 400);

  const badKind = await request("/api/folders", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "Bad", kind: "nope" }),
  });
  assert.equal(badKind.response.status, 400);

  const badParent = await request("/api/folders", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "Orphan", kind: "custom", parentId: "no-such-folder" }),
  });
  assert.equal(badParent.response.status, 400);

  const parent = await request("/api/folders", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "品牌 A", kind: "brand", parentId: null, note: "", createdAt: "2026-08-20" }),
  });
  assert.equal(parent.response.status, 201);
  assert.match(parent.body.data.id, /^folder-/);

  const child = await request("/api/folders", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ id: "folder-child", name: "系列 1", kind: "theme", parentId: parent.body.data.id }),
  });
  assert.equal(child.response.status, 201);

  const grandchild = await request("/api/folders", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "太深了", kind: "custom", parentId: "folder-child" }),
  });
  assert.equal(grandchild.response.status, 400);

  const rename = await request(`/api/folders/${parent.body.data.id}`, {
    method: "PATCH",
    headers: authorizedJson,
    body: JSON.stringify({ name: "品牌 A（改名）" }),
  });
  assert.equal(rename.response.status, 200);
  assert.equal(rename.body.data.name, "品牌 A（改名）");

  const list = await request("/api/folders");
  assert.equal(list.response.status, 200);
  assert.ok(list.body.data.some((item) => item.id === "folder-child"));

  const single = await request("/api/folders/folder-child");
  assert.equal(single.response.status, 200);
  assert.equal(single.body.data.parentId, parent.body.data.id);
});

test("deleting a folder cascades to children and inspiration collectionIds", async () => {
  const parent = await request("/api/folders", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ id: "folder-cascade", name: "级联", kind: "custom", parentId: null }),
  });
  assert.equal(parent.response.status, 201);
  const child = await request("/api/folders", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ id: "folder-cascade-child", name: "子级", kind: "custom", parentId: "folder-cascade" }),
  });
  assert.equal(child.response.status, 201);

  const inspiration = await request("/api/inspirations", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({
      id: "cascade-inspiration",
      title: "在收藏夹中",
      collectionIds: ["folder-cascade", "folder-cascade-child", "folder-unrelated"],
    }),
  });
  assert.equal(inspiration.response.status, 201);

  const unauthorized = await request("/api/folders/folder-cascade", { method: "DELETE" });
  assert.equal(unauthorized.response.status, 401);

  const removal = await request("/api/folders/folder-cascade", {
    method: "DELETE",
    headers: authorizedJson,
  });
  assert.equal(removal.response.status, 200);
  assert.equal(removal.body.data.id, "folder-cascade");

  const goneParent = await request("/api/folders/folder-cascade");
  assert.equal(goneParent.response.status, 404);
  const goneChild = await request("/api/folders/folder-cascade-child");
  assert.equal(goneChild.response.status, 404);

  const cleaned = await request("/api/inspirations/cascade-inspiration");
  assert.equal(cleaned.response.status, 200);
  assert.deepEqual(cleaned.body.data.collectionIds, ["folder-unrelated"]);
});

test("uploads accept whitelisted images and serve them back", async () => {
  const unauthorized = await request("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "x.png", dataUrl: `data:image/png;base64,${tinyPngBase64}` }),
  });
  assert.equal(unauthorized.response.status, 401);

  const upload = await request("/api/uploads", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "参考 图!!.png", dataUrl: `data:image/png;base64,${tinyPngBase64}` }),
  });
  assert.equal(upload.response.status, 201);
  assert.match(upload.body.data.src, /^\/uploads\/[A-Za-z0-9_-]*-[a-z0-9]+\.png$/);

  const served = await fetch(`${baseUrl}${upload.body.data.src}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.ok((await served.arrayBuffer()).byteLength > 0);

  const badMime = await request("/api/uploads", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "evil.svg", dataUrl: "data:image/svg+xml;base64,PHN2Zy8+" }),
  });
  assert.equal(badMime.response.status, 400);

  const notDataUrl = await request("/api/uploads", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "x.png", dataUrl: "https://example.com/x.png" }),
  });
  assert.equal(notDataUrl.response.status, 400);

  const oversized = await request("/api/uploads", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "big.png", dataUrl: `data:image/png;base64,${"A".repeat(9 * 1024 * 1024)}` }),
  });
  assert.equal(oversized.response.status, 413);

  const dotFile = await request("/uploads/.hidden");
  assert.equal(dotFile.response.status, 404);
  const traversal = await request("/uploads/..%2Fdata.json");
  assert.equal(traversal.response.status, 404);
  const missing = await request("/uploads/nope.png");
  assert.equal(missing.response.status, 404);
});

test("inspirations can be deleted along with their uploaded file", async () => {
  const upload = await request("/api/uploads", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ name: "to-delete.png", dataUrl: `data:image/png;base64,${tinyPngBase64}` }),
  });
  assert.equal(upload.response.status, 201);
  const src = upload.body.data.src;

  const create = await request("/api/inspirations", {
    method: "POST",
    headers: authorizedJson,
    body: JSON.stringify({ id: "delete-me", title: "待删除", src }),
  });
  assert.equal(create.response.status, 201);

  const unauthorized = await request("/api/inspirations/delete-me", { method: "DELETE" });
  assert.equal(unauthorized.response.status, 401);

  const removal = await request("/api/inspirations/delete-me", {
    method: "DELETE",
    headers: authorizedJson,
  });
  assert.equal(removal.response.status, 200);
  assert.equal(removal.body.data.id, "delete-me");

  const gone = await request("/api/inspirations/delete-me");
  assert.equal(gone.response.status, 404);

  const goneFile = await fetch(`${baseUrl}${src}`);
  assert.equal(goneFile.status, 404);

  const missing = await request("/api/inspirations/never-existed", {
    method: "DELETE",
    headers: authorizedJson,
  });
  assert.equal(missing.response.status, 404);

  const stylesDelete = await request("/api/styles/minimal-editorial", {
    method: "DELETE",
    headers: authorizedJson,
  });
  assert.equal(stylesDelete.response.status, 405);
});

test("CORS is same-origin by default", async () => {
  const response = await fetch(`${baseUrl}/api/health`, { headers: { origin: "https://example.com" } });
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
