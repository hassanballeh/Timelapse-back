const fs = require("fs").promises;
const path = require("path");

async function cleanup(directories) {
  for (const dir of directories) {
    try {
      const files = await fs.readdir(dir);
      await Promise.all(files.map((file) => fs.unlink(path.join(dir, file))));
      await fs.rmdir(dir);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
}

module.exports = cleanup;
