const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { OUTPUT_DIR } = require("../utils/directories");

const router = express.Router();

router.get("/download/:filename", async (req, res) => {
  try {
    const filePath = path.join(OUTPUT_DIR, req.params.filename);
    await fs.access(filePath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.params.filename}"`
    );
    require("fs").createReadStream(filePath).pipe(res);
  } catch {
    res.status(404).json({ success: false, error: "File not found" });
  }
});

module.exports = router;
