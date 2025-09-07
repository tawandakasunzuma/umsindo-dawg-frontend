// Import React's useState hook for managing component state
import { useState } from "react";

export default function UploadPage() {

    // State to hold the selected file
    const [file, setFile] = useState(null);

    // State to display messages to the user
    const [message, setMessage] = useState("");

    // State to store URLs of uploaded files for preview
    const [uploads, setUploads] = useState([]);

    // Handle form submission for file upload
    const handleSubmit = async (e) => {

        e.preventDefault(); // Prevent page reload on form submit
        if (!file) return; // Do nothing if no file is selected

        // Prepare form data with the selected file
        const formData = new FormData();
        formData.append("file", file);

        // Send POST request to the upload API endpoint
        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        // Get response from the server
        const data = await res.json();
        setMessage(data.message); // Show success/failure message

        // Add uploaded file to preview list
        setUploads([...uploads, URL.createObjectURL(file)]);

        // Reset file input
        setFile(null);
    };

    return (
        <div>

            {/* Page Title */}
            <h1>
                Upload Your Freestyle
            </h1>

            {/* File upload form */}
            <form onSubmit={handleSubmit}>
                <input
                    type="file"
                    accept="video/*,audio/*" // Accept only audio and video files
                    onChange={(e) => setFile(e.target.files[0])} // Save selected file to state
                />
                <button type="submit">
                    Upload
                </button>
            </form>

            {/* Message area for upload status */}
            <p>{message}</p>

            <h2>
                Uploaded Freestyles (preview only)
            </h2>

            {/* Uploaded files preview section */}
            {uploads.map((src,index) => (
                <div key={index}>
                    <video
                        src={src}
                        controls
                        width="300"
                    />
                </div>
            ))}
        </div>
    );
}