import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INSPIRATIONS } from "../data/inspirations.js";
import { STYLES } from "../data/styles.js";
import { FOLDERS } from "../data/folders.js";
import { TEMPLATES } from "../js/templates.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDataFile = path.join(serverDirectory, "data.json");
const collections = ["styles", "inspirations", "templates", "folders"];

// Functions in template definitions are intentionally omitted from API data.
// The browser still imports js/templates.js for rendering, while the API exposes
// the editable metadata and defaults needed by clients.
const templateMetadata = TEMPLATES.map(({ render, ...template }) => template);
const seedData = {
  styles: STYLES,
  inspirations: INSPIRATIONS,
  templates: templateMetadata,
  folders: FOLDERS,
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeData(value) {
  const data = isObject(value) ? value : {};
  return Object.fromEntries(
    collections.map((name) => [
      name,
      Array.isArray(data[name]) ? data[name] : clone(seedData[name]),
    ])
  );
}

export class DataStore {
  constructor(filePath = process.env.POSTER_LAB_DATA_FILE || defaultDataFile) {
    this.filePath = filePath;
    this.data = null;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.data) return this.data;

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.data = normalizeData(JSON.parse(raw));
    } catch (error) {
      if (error.code !== "ENOENT" && error.name !== "SyntaxError") throw error;
      this.data = normalizeData(seedData);
    }
    return this.data;
  }

  async snapshot() {
    return clone(await this.load());
  }

  async list(collection) {
    await this.load();
    return clone(this.data[collection]);
  }

  async find(collection, id) {
    await this.load();
    const item = this.data[collection].find((entry) => String(entry.id) === String(id) || String(entry.file) === String(id));
    return item ? clone(item) : null;
  }

  async add(collection, item) {
    await this.load();
    const entry = clone(item);
    if (!entry.id) entry.id = `${collection.slice(0, -1)}-${Date.now().toString(36)}`;
    if (this.data[collection].some((existing) => String(existing.id) === String(entry.id))) {
      const error = new Error(`An item with id '${entry.id}' already exists`);
      error.statusCode = 409;
      throw error;
    }
    this.data[collection].push(entry);
    await this.save();
    return clone(entry);
  }

  async update(collection, id, changes) {
    await this.load();
    const index = this.data[collection].findIndex((entry) => String(entry.id) === String(id) || String(entry.file) === String(id));
    if (index < 0) return null;
    const updated = { ...this.data[collection][index], ...clone(changes), id: this.data[collection][index].id };
    this.data[collection][index] = updated;
    await this.save();
    return clone(updated);
  }

  async remove(collection, id) {
    await this.load();
    const index = this.data[collection].findIndex((entry) => String(entry.id) === String(id) || String(entry.file) === String(id));
    if (index < 0) return null;
    const [removed] = this.data[collection].splice(index, 1);
    await this.save();
    return clone(removed);
  }

  async save() {
    const content = `${JSON.stringify(this.data, null, 2)}\n`;
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.tmp`;
      await fs.writeFile(temporaryPath, content, "utf8");
      await fs.rename(temporaryPath, this.filePath);
    });
    return this.writeQueue;
  }
}

export { collections, seedData, templateMetadata };
