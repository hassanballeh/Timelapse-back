const AdmZip = require("adm-zip");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs").promises;
const cleanup = require("./cleanup");
const { TEMP_DIR } = require("../utils/directories");

// Enhanced function with timelapse capabilities
async function processImagesToVideo(zipPath, outputPath, options = {}) {
  const {
    fps = 25,
    intervalSeconds = 1, // Time between photos in real life
    quality = "medium",
    stabilize = false,
    transition = "none",
  } = options;

  const tempId = uuidv4();
  const extractDir = path.join(TEMP_DIR, `extract_${tempId}`);
  const processDir = path.join(TEMP_DIR, `process_${tempId}`);

  try {
    await fs.mkdir(extractDir, { recursive: true });
    await fs.mkdir(processDir, { recursive: true });

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);

    const files = await fs.readdir(extractDir);
    const imageExtensions = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"];

    // Smart sorting for timelapse sequences
    const imageFiles = files
      .filter((file) =>
        imageExtensions.includes(path.extname(file).toLowerCase())
      )
      .sort((a, b) => {
        // Try to extract numbers for natural sorting
        const aNum = extractNumber(a);
        const bNum = extractNumber(b);
        if (aNum !== null && bNum !== null) return aNum - bNum;
        return a.localeCompare(b);
      })
      .map((file) => path.join(extractDir, file));

    if (imageFiles.length < 2) {
      throw new Error("At least 2 images required");
    }

    console.log(`Processing ${imageFiles.length} images for timelapse`);

    // Find minimum dimensions for consistent video
    let width = Infinity;
    let height = Infinity;
    for (let i = 0; i < imageFiles.length; i++) {
      const metadata = await sharp(imageFiles[i]).metadata();
      width = Math.min(width, metadata.width);
      height = Math.min(height, metadata.height);
    }

    // Ensure even dimensions (required for H.264)
    if (width % 2 !== 0) width -= 1;
    if (height % 2 !== 0) height -= 1;

    console.log(`Target dimensions: ${width}x${height}`);

    // Process all images to uniform size with enhancement for timelapse
    for (let i = 0; i < imageFiles.length; i++) {
      await sharp(imageFiles[i])
        .resize(width, height, {
          fit: "cover",
          position: "center",
        })
        .normalize() // Auto-adjust contrast for timelapse
        .sharpen({ sigma: 1, flat: 1, jagged: 1 }) // Slight sharpening
        .jpeg({ quality: getQualityValue(quality), mozjpeg: true })
        .toFile(
          path.join(processDir, `frame_${String(i + 1).padStart(6, "0")}.jpg`)
        );
    }

    // Calculate timelapse info
    const realDurationSeconds = imageFiles.length * intervalSeconds;
    const videoDurationSeconds = imageFiles.length / fps;
    const speedupFactor = Math.round(
      realDurationSeconds / videoDurationSeconds
    );

    console.log(
      `Timelapse: ${imageFiles.length} frames, ${speedupFactor}x speedup`
    );

    return new Promise((resolve, reject) => {
      let command = ffmpeg(path.join(processDir, "frame_%06d.jpg"))
        .inputFPS(fps)
        .videoCodec("libx264")
        .outputOptions(getQualitySettings(quality));

      // Add stabilization if requested
      if (stabilize) {
        command = command.videoFilters([
          "deshake=x=-1:y=-1:w=-1:h=-1:rx=16:ry=16",
        ]);
      }

      // Add transition effects
      if (transition === "fade") {
        const fadeFrames = Math.min(30, Math.floor(imageFiles.length * 0.05));
        command = command.videoFilters([
          `fade=in:0:${fadeFrames},fade=out:${
            imageFiles.length - fadeFrames
          }:${fadeFrames}`,
        ]);
      }

      command
        .fps(fps)
        .output(outputPath)
        .on("progress", (progress) => {
          console.log(`Processing: ${Math.round(progress.percent || 0)}%`);
        })
        .on("end", async () => {
          console.log("yes");
          await cleanup([extractDir, processDir]);
          resolve({
            frameCount: imageFiles.length,
            duration: parseFloat(videoDurationSeconds.toFixed(2)),
            realDuration: realDurationSeconds,
            speedupFactor: speedupFactor,
            fps: fps,
            dimensions: { width, height },
          });
        })
        .on("error", async (error) => {
          await cleanup([extractDir, processDir]);
          reject(new Error(`Video creation failed: ${error.message}`));
        })
        .run();
    });
  } catch (error) {
    await cleanup([extractDir, processDir]);
    throw error;
  }
}

// Helper functions
function extractNumber(filename) {
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function getQualityValue(quality) {
  const qualityMap = {
    high: 95,
    medium: 85,
    low: 75,
  };
  return qualityMap[quality] || 85;
}

function getQualitySettings(quality) {
  const settings = {
    high: ["-crf", "18", "-preset", "slow"],
    medium: ["-crf", "23", "-preset", "medium"],
    low: ["-crf", "28", "-preset", "fast"],
  };

  return [
    ...(settings[quality] || settings.medium),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-tune",
    "film", // Optimize for photographic content
  ];
}

module.exports = processImagesToVideo;
