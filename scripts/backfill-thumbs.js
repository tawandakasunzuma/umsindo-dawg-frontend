const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffprobeStatic = require('ffprobe-static');
const ffmpegStatic = require('ffmpeg-static');

// Setup ffmpeg/ffprobe paths
if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
} else {
  console.warn('ffprobe-static path not found — ffprobe may fail');
}

const ffmpegBinary = ffmpegStatic && (ffmpegStatic.path || ffmpegStatic);
if (ffmpegBinary) {
  ffmpeg.setFfmpegPath(ffmpegBinary);
} else {
  console.warn('ffmpeg-static binary not found — ffmpeg operations may fail');
}

const DB_PATH = path.join(process.cwd(), 'data', 'submissions.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(DB_PATH)) {
  console.error('ERROR: data/submissions.json not found. Run from project root.');
  process.exit(1);
}

const raw = fs.readFileSync(DB_PATH, 'utf8') || '[]';
let submissions;
try {
  submissions = JSON.parse(raw);
} catch (err) {
  console.error('Failed to parse data/submissions.json:', err);
  process.exit(1);
}

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function filePathFromUrl(url) {
  // url expected like '/uploads/filename.mp4' or 'uploads/filename.mp4'
  if (!url) return null;
  const rel = url.startsWith('/') ? url.slice(1) : url;
  return path.join(process.cwd(), rel);
}

function safeBaseName(rec) {
  // Use id if present, else timestamp
  return (rec.id ? String(rec.id) : String(Date.now())).replace(/\s+/g, '-');
}

function takeScreenshot(videoPath, outFolder, outFilename, size = '1280x720', timestamp = '50%') {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        timestamps: [timestamp],
        filename: outFilename,
        folder: outFolder,
        size,
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

async function probeDurationSeconds(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const dur = metadata && metadata.format && metadata.format.duration ? Math.round(Number(metadata.format.duration)) : 0;
      resolve(dur);
    });
  });
}

(async () => {
  console.log('Backfill thumbnails script started');
  await ensureDir(UPLOAD_DIR);

  let updated = 0;
  for (let i = 0; i < submissions.length; i++) {
    const rec = submissions[i];

    // skip if fileUrl missing
    if (!rec || !rec.fileUrl) continue;

    // skip if both thumbnails already exist
    if (rec.thumbnailWide && rec.thumbnailSquare) continue;

    const videoPath = filePathFromUrl(rec.fileUrl);
    if (!videoPath || !fs.existsSync(videoPath)) {
      console.warn(`Skipping ${rec.id || i} — file not found: ${videoPath}`);
      continue;
    }

    const base = safeBaseName(rec);
    const wideName = `${base}-backfill-thumb-wide.jpg`;
    const squareName = `${base}-backfill-thumb-square.jpg`;
    const wideOut = path.join(UPLOAD_DIR, wideName);
    const squareOut = path.join(UPLOAD_DIR, squareName);

    try {
      console.log(`Processing record ${rec.id || i}:`, rec.fileUrl);

      // Probe duration if missing
      if (!rec.durationSeconds) {
        try {
          rec.durationSeconds = await probeDurationSeconds(videoPath);
          console.log(`  - probed duration: ${rec.durationSeconds}s`);
        } catch (probeErr) {
          console.warn('  - probe failed (non-fatal):', probeErr.message || probeErr);
        }
      }

      // Wide screenshot 1280x720
      try {
        await takeScreenshot(videoPath, UPLOAD_DIR, wideName, '1280x720');
        rec.thumbnailWide = `/uploads/${wideName}`;
        console.log(`  - created wide: ${rec.thumbnailWide}`);
      } catch (err) {
        console.warn('  - wide thumbnail failed:', err.message || err);
      }

      // Square screenshot 600x600 (non-fatal)
      try {
        await takeScreenshot(videoPath, UPLOAD_DIR, squareName, '600x600');
        rec.thumbnailSquare = `/uploads/${squareName}`;
        console.log(`  - created square: ${rec.thumbnailSquare}`);
      } catch (err) {
        console.warn('  - square thumbnail failed:', err.message || err);
      }

      // Persist DB update after each successful pass
      writeDb(submissions);
      updated++;
      console.log(`  -> record ${rec.id || i} updated and saved`);
    } catch (err) {
      console.error(`Failed to update record ${rec.id || i}:`, err);
    }
  }

  console.log(`Backfill complete. Records updated: ${updated}`);
})();
