const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { OUTPUT_DIR } = require("../utils/directories");

const router = express.Router();

router.get("/videos", async (req, res) => {
  try {
    const files = await fs.readdir(OUTPUT_DIR);
    const videoFiles = files.filter((file) => file.endsWith(".mp4"));
    const videos = await Promise.all(
      videoFiles.map(async (file) => {
        const stats = await fs.stat(path.join(OUTPUT_DIR, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          downloadUrl: `/api/download/${file}`,
        };
      })
    );
    videos.sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json({ success: true, videos });
  } catch {
    res.status(500).json({ success: false, error: "Failed to list videos" });
  }
});

router.delete("/videos/:filename", async (req, res) => {
  try {
    await fs.unlink(path.join(OUTPUT_DIR, req.params.filename));
    res.json({ success: true, message: "Video deleted successfully" });
  } catch {
    res.status(404).json({ success: false, error: "Video not found" });
  }
});

module.exports = router;
