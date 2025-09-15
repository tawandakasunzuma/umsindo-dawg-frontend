// Import the formidable library to handle file uploads
import formidable from "formidable";
import { createSubmission } from '../../lib/submissions';
import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";

// Tell 'fluent-ffmpeg' where to find the ffprobe tool — this is required for it to read media file details
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Disable Next.js’s default body parser
export const config = {
    api: {
        bodyParser: false, // Let formidable handle parsing the multipart/form-data
    },
};

// API route handler for /api/upload
export default async function handler (request, response) {

    console.log("Upload API called:", request.method);

    // Only allow POST requests
    if (request.method === "POST") {

        // Initialize formidable without allowing multiple files (just one file per upload)
        const form = formidable({ multiples:false });

        // Parse the incoming form data
        form.parse(request, async (error, fields, files) => {
            
            if (error) {
                // Log any error and send failure response
                console.error(error);
                response.status(500).json({ message: "Upload failed." });
                return;
            }

            // Check for the uploaded file
            let file = files.file;
            if (!file) {
                return response.status(400).json({ message: "No file uploaded"});
            }

            if (Array.isArray(file)) {
                file = file[0]; // Use first file
            }

            // Check the filepath exists
            if (!file.filepath) {
                console.error("Missing filepath in file:", file);
                return response.status(500).json( { message: "Filepath is missing."});
            }

            // Dynamically import Node.js filesystem and path modules
            const fs = await import('fs/promises');
            const path = await import('path');

            // Get the temp file path from Formidable
            const tempPath = file.filepath;

            // Set upload directory inside your Next.js /public folder
            const uploadDir = path.join(process.cwd(), 'public', 'uploads');

            // Create the uploads folder if it doesn't already exist
            await fs.mkdir(uploadDir, { recursive: true });

            // Make a safe, unique filename (e.g. 169432-video.mp4)
            const timestamp = Date.now();
            const originalName = file.originalFilename || 'upload';
            const safeName = `${timestamp}-${originalName}`.replace(/\s+/g, '-');

            // Final path where the file will be moved to
            const newPath = path.join(uploadDir, safeName);

            // Move the file from temp location to public/upload
            await fs.rename(tempPath, newPath);

            // Create the public URL to return to the frontend
            const publicUrl = `/uploads/${safeName}`;

            try {
            // Use ffprobe (via fluent-ffmpeg) to analyze the saved audio file
            const probe = await new Promise((resolve, reject) => {
                ffmpeg.ffprobe(newPath, (err, metadata) => {
                    if (err) return reject(err);
                        resolve(metadata);
                    });
            });

            // Pull the duration (in seconds) from the metadata
            const duration = (probe && probe.format && probe.format.duration) ? Number(probe.format.duration) : 0;
            console.log('ffprobe duration (s):', duration);

            // Define allowed duration range
            const MIN_SEC = 60;
            const MAX_SEC = 90;

            // If duration is outside allowed range, delete the file and respond with an error
            if (!(duration >= MIN_SEC && duration <= MAX_SEC)) {
                try {
                    // Try to delete the uploaded file
                    await fs.unlink(newPath);
                } catch (e) {
                    console.warn('Cleanup unlink failed', e);
                }

                // Send error response to the client
                return response.status(422).json({
                    message: `Invalid duration: ${Math.round(duration)}s — freestyles must be between ${MIN_SEC} and ${MAX_SEC} seconds.`
                });
            }

            } catch (probeErr) {
            // Something went wrong while probing the file
            console.error('ffprobe error', probeErr);

            // Attempt to clean up by deleting the file
            try {
                await fs.unlink(newPath);
            } catch (e) {
                console.warn('cleanup unlink failed', e);
            }

            // Send internal server error response
            return response.status(500).json({ message: 'Failed to validate uploaded file duration.' });
            }

            // Normalize fields (formidable can return strings or arrays)
            const artist = Array.isArray(fields?.artist) ? (fields.artist[0] || 'Unknown') : (fields?.artist || 'Unknown');
            const title  = Array.isArray(fields?.title)  ? (fields.title[0]  || 'Untitled') : (fields?.title  || 'Untitled');

            // trim and sanitize a bit
            const safeArtist = String(artist).trim().slice(0, 100);
            const safeTitle  = String(title).trim().slice(0, 140);

            // Create a new submission record with the artist, title, file URL, and status
            const record = createSubmission({
                artist: safeArtist, // artist name from form or 'Unknown'
                title: safeTitle, // title from form or 'Untitled'
                fileUrl: publicUrl, // where file is accessible
                status: 'pending' // initial status set to pending review
            });

            // Log uploaded file and submission record (for debugging)
            console.log("Uploaded file:", file);
            console.log("Created submission record:", record);

            // At this point, the file is received, but we’re not saving it to disk or cloud yet
            response.status(200).json({
                message: "Upload success!", 
                url: publicUrl,
                id: record.id, // send the new submission record ID
            });
        });
        
    } else {
        // Handle unsupported HTTP methods
        response.status(405).json({ message: "Method not allowed" })
    };
};