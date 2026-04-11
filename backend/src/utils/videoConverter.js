const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

/**
 * Convert video buffer to MP4 with proper metadata using ffmpeg.
 * This fixes "broken metadata" errors from AI models that expect
 * well-formed MP4 files (e.g., when browser sends WebM).
 *
 * @param {Buffer} inputBuffer - Raw video file buffer
 * @param {string} originalName - Original filename (used to detect format)
 * @returns {Promise<Buffer>} - Converted MP4 buffer
 */
const convertToMp4 = (inputBuffer, originalName = "input.webm") => {
  return new Promise((resolve, reject) => {
    const tmpId = crypto.randomBytes(8).toString("hex");
    const tmpDir = os.tmpdir();
    const ext = path.extname(originalName) || ".webm";
    const inputPath = path.join(tmpDir, `ffmpeg_in_${tmpId}${ext}`);
    const outputPath = path.join(tmpDir, `ffmpeg_out_${tmpId}.mp4`);

    const cleanup = () => {
      try { fs.unlinkSync(inputPath); } catch {}
      try { fs.unlinkSync(outputPath); } catch {}
    };

    fs.writeFileSync(inputPath, inputBuffer);

    const args = [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-movflags", "+faststart",
      "-an",            // strip audio — AI models only need video
      "-t", "30",       // cap at 30s to avoid huge files
      outputPath,
    ];

    execFile("ffmpeg", args, { timeout: 30000 }, (error, _stdout, stderr) => {
      if (error) {
        cleanup();
        reject(new Error(`ffmpeg conversion failed: ${error.message}`));
        return;
      }

      try {
        const outputBuffer = fs.readFileSync(outputPath);
        cleanup();
        resolve(outputBuffer);
      } catch (readErr) {
        cleanup();
        reject(new Error(`Failed to read converted file: ${readErr.message}`));
      }
    });
  });
};

/**
 * Check if a file needs conversion (not already a well-formed MP4).
 */
const needsConversion = (mimetype, originalName) => {
  const ext = path.extname(originalName || "").toLowerCase();
  // WebM from browsers always needs conversion
  if (mimetype === "video/webm" || ext === ".webm") return true;
  // Generic binary or unknown type — convert to be safe
  if (mimetype === "application/octet-stream") return true;
  // Even MP4 may have broken metadata from MediaRecorder, so convert
  if (mimetype === "video/mp4" || ext === ".mp4") return true;
  return false;
};

module.exports = { convertToMp4, needsConversion };
