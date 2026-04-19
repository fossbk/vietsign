const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const runCommand = (cmd, args, timeout = 30000) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            `${cmd} failed: ${error.message}${stderr ? ` | ${stderr}` : ""}`,
          ),
        );
        return;
      }
      resolve({ stdout, stderr });
    });
  });

const verifyMp4Metadata = async (filePath) => {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=format_name,duration",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=codec_name,duration,nb_frames,width,height",
    "-of",
    "json",
    filePath,
  ];

  const { stdout } = await runCommand("ffprobe", args, 15000);
  let parsed;
  try {
    parsed = JSON.parse(stdout || "{}");
  } catch {
    throw new Error("ffprobe output is not valid JSON");
  }

  const stream = parsed?.streams?.[0];
  const format = parsed?.format;
  if (!stream) {
    throw new Error("No video stream found after conversion");
  }

  if (!String(format?.format_name || "").includes("mp4")) {
    throw new Error("Converted file format is not MP4");
  }

  const duration = Number(stream.duration);
  const nbFrames = Number(stream.nb_frames);
  const formatDuration = Number(format?.duration);
  const width = Number(stream.width);
  const height = Number(stream.height);
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const hasFormatDuration = Number.isFinite(formatDuration) && formatDuration > 0;
  const hasFrames = Number.isFinite(nbFrames) && nbFrames > 0;
  const hasResolution = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;

  if ((!hasDuration && !hasFrames && !hasFormatDuration) || !hasResolution) {
    throw new Error("Converted MP4 still has invalid duration/frame metadata");
  }
};

/**
 * Convert video buffer to MP4 with proper metadata using ffmpeg.
 * This fixes "broken metadata" errors from AI models that expect
 * well-formed MP4 files (e.g., when browser sends WebM).
 *
 * @param {Buffer} inputBuffer - Raw video file buffer
 * @param {string} originalName - Original filename (used to detect format)
 * @returns {Promise<Buffer>} - Converted MP4 buffer
 */
const buildFfmpegArgs = (inputPath, outputPath, strict) => {
  if (strict) {
    return [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-fflags",
      "+genpts+igndts",
      "-analyzeduration",
      "100M",
      "-probesize",
      "100M",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-vf",
      "fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-vsync",
      "cfr",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "baseline",
      "-level",
      "3.1",
      "-movflags",
      "+faststart",
      "-an",
      "-t",
      "30",
      outputPath,
    ];
  }

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-fflags",
    "+genpts",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "baseline",
    "-level",
    "3.1",
    "-movflags",
    "+faststart",
    "-r",
    "25",
    "-an", // strip audio — AI models only need video
    "-t",
    "30", // cap at 30s to avoid huge files
    outputPath,
  ];
};

const convertToMp4 = (inputBuffer, originalName = "input.webm", options = {}) => {
  return new Promise((resolve, reject) => {
    const strict = Boolean(options?.strict);
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

    const args = buildFfmpegArgs(inputPath, outputPath, strict);

    (async () => {
      try {
        await runCommand("ffmpeg", args, 45000);
        await verifyMp4Metadata(outputPath);
        const outputBuffer = fs.readFileSync(outputPath);
        cleanup();
        resolve(outputBuffer);
      } catch (err) {
        cleanup();
        reject(
          new Error(
            `Video conversion/validation failed${strict ? " (strict mode)" : ""}: ${err.message}`,
          ),
        );
      }
    })();
  });
};

/**
 * Check if a file needs conversion (not already a well-formed MP4).
 */
const needsConversion = (mimetype, originalName) => {
  const ext = path.extname(originalName || "").toLowerCase();
  if ((mimetype || "").startsWith("video/")) return true;
  if (ext === ".mp4" || ext === ".webm" || ext === ".mov") return true;
  // Generic binary/unknown type from some browsers/clients
  if (mimetype === "application/octet-stream" || !mimetype) return true;
  return false;
};

module.exports = { convertToMp4, needsConversion };
