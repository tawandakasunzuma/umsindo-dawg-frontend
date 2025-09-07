// Import the formidable library to handle file uploads
import formidable from "formidable";

// Disable Next.js’s default body parser
export const config = {
    api: {
        bodyParser: false, // Let formidable handle parsing the multipart/form-data
    },
};

// API route handler for /api/upload
export default async function handler (request, response) {

    // Only allow POST requests
    if (request.method === "POST") {

        // Initialize formidable without allowing multiple files (just one file per upload)
        const form = formidable({ multiples:false });

        // Parse the incoming form data
        form.parse(request, (error, fields, files) => {
            if (error) {
                // Log any error and send failure response
                console.error(error);
                response.status(500).json({ message: "Upload failed." });
                return;
            }

            // At this point, the file is received, but we’re not saving it to disk or cloud yet
            response.status(200).json({ message: "Upload success!" });
        });
        
    } else {
        // Handle unsupported HTTP methods
        response.status(405).json({ message: "Method not allowed" })
    };
};