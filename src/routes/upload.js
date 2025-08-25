const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const upload = require("../middlewares/uploadConfig");
const processImagesToVideo = require("../services/videoProcessor");
const { OUTPUT_DIR } = require("../utils/directories");

const router = express.Router();

router.post("/upload", upload.single("zipFile"), async (req, res) => {
  console.log("Processing video/timelapse upload...");

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file uploaded" });
    }

    // Parse timelapse parameters from request body
    const {
      fps = 25,
      intervalSeconds = 1,
      quality = "medium",
      stabilize = false,
      transition = "none",
    } = req.body;

    // Convert string booleans to actual booleans
    const options = {
      fps: parseInt(fps),
      intervalSeconds: parseFloat(intervalSeconds),
      quality,
      stabilize: stabilize === "true" || stabilize === true,
      transition,
    };

    // Validate parameters
    if (options.fps < 1 || options.fps > 120) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: "FPS must be between 1 and 120",
      });
    }

    if (options.intervalSeconds < 0.1 || options.intervalSeconds > 86400) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: "Interval must be between 0.1 seconds and 24 hours",
      });
    }

    const outputFilename = `video_${uuidv4()}_${Date.now()}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    console.log(
      `Creating ${
        options.intervalSeconds > 1 ? "timelapse" : "video"
      } with settings:`,
      options
    );

    // Process with enhanced options
    const result = await processImagesToVideo(
      req.file.path,
      outputPath,
      options
    );

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    const stats = await fs.stat(outputPath);

    // Format duration for display
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
      if (minutes > 0) return `${minutes}m ${secs}s`;
      return `${secs}s`;
    };

    res.json({
      success: true,
      message: `${
        options.intervalSeconds > 1 ? "Timelapse" : "Video"
      } created successfully`,
      data: {
        filename: outputFilename,
        frameCount: result.frameCount,
        duration: result.duration,
        fps: result.fps,
        fileSize: stats.size,
        downloadUrl: `/api/download/${outputFilename}`,
        // Enhanced timelapse info
        timelapse:
          options.intervalSeconds > 1
            ? {
                realDuration: result.realDuration,
                realDurationFormatted: formatDuration(result.realDuration),
                videoDurationFormatted: formatDuration(result.duration),
                speedupFactor: result.speedupFactor,
                intervalSeconds: options.intervalSeconds,
              }
            : null,
        dimensions: result.dimensions,
        quality: options.quality,
        stabilized: options.stabilize,
        transition: options.transition,
      },
    });
  } catch (error) {
    console.error("Processing error:", error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a simple endpoint to get timelapse presets
router.get("/presets", (req, res) => {
  const presets = {
    construction: {
      name: "Construction Site",
      intervalSeconds: 300, // 5 minutes
      fps: 24,
      quality: "high",
      stabilize: true,
    },
    sunset: {
      name: "Sunset/Sunrise",
      intervalSeconds: 30, // 30 seconds
      fps: 30,
      quality: "high",
      stabilize: false,
    },
    clouds: {
      name: "Cloud Movement",
      intervalSeconds: 10, // 10 seconds
      fps: 30,
      quality: "medium",
      stabilize: false,
    },
    flowers: {
      name: "Plant Growth",
      intervalSeconds: 1800, // 30 minutes
      fps: 25,
      quality: "medium",
      stabilize: false,
    },
    traffic: {
      name: "City Traffic",
      intervalSeconds: 5, // 5 seconds
      fps: 60,
      quality: "medium",
      stabilize: true,
    },
  };

  res.json({ success: true, presets });
});

module.exports = router;
