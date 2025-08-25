const fs = require("fs").promises;

const UPLOAD_DIR = "./uploads";
const OUTPUT_DIR = "./outputs";
const TEMP_DIR = "./temp";

async function createDirectories() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

module.exports = { createDirectories, UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR };
