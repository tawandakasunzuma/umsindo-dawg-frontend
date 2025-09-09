// Import React's useState hook for managing component state
import React, { useState, useRef } from "react";

export default function UploadPage() {

    // Store refs for each uploaded video
    const videoRefs = useRef([]); // To control each video element (like fullscreen)

    // State to hold the selected file
    const [file, setFile] = useState(null);

    // State to display messages to the user
    const [message, setMessage] = useState("");

    // State to store preview URLs of uploaded files
    const [uploads, setUploads] = useState([]);

    // State to store preview URL of the currently selected file
    const [previewUrl,setPreviewUrl] = useState(null);

    function onFileChange(e) {
        
        // Get the list of selected files
        const fileList = e.target.files;

        // Check if at least one file is selected
        if (fileList && fileList.length > 0) {
        
            const file = fileList[0]; // Get the first file
            setFile(file); // Save the file to state

            // Revoke previous preview URL if it exists
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            const newPreviewUrl = URL.createObjectURL(file); // Create a preview URL
            setPreviewUrl(newPreviewUrl); // Save the preview URL to state
        
            } else {
                // No file selected, so clear the file and preview
                setFile(null);
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                }
                setPreviewUrl(null);
            }

    }

    // Handle form submission for file upload
    const handleSubmit = async (e) => {

        e.preventDefault(); // Prevent page reload on form submit
        if (!file) {
            setMessage('Please select a file before clicking upload.');
            return;
        };

        // Prepare form data with the selected file
        const formData = new FormData();
        formData.append("file", file);

        // Send POST request to /api/upload
        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        // Get response from the server
        const data = await res.json(); // Convert response to JSON

        // If failed, show error and stop
        if (!res.ok) {
            // Show error message from server (or fallback if none)
            setMessage(data?.message || "Upload failed");
            return;
        }

        // If successful, show message and update uploaded files list
        setMessage(data.message || "Upload success!");
        // Add a new preview URL for the uploaded file to the list
        setUploads([...uploads, data.url]);

        // Reset file input
        setFile(null);

        // Reset preview
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl); // Clean up URL object
        }
        setPreviewUrl(null);
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
                    name="file"
                    accept="video/*,audio/*" // Accept only audio and video files
                    onChange={onFileChange} // Save selected file to state
                />
                <button type="submit">
                    Upload
                </button>
            </form>

            {/* Show preview when uploaded */}
            {previewUrl && (
                <div>
                    <h3>Preview:</h3>
                    <video
                        src={previewUrl}
                        controls
                        width="300"
                    />
                </div>
            )}

            {/* Message area for upload status */}
            <p>{message}</p>

            <h2>
                Uploaded Freestyles (preview only)
            </h2>

            {/* Uploaded files preview section with fullscreen button */}
            {uploads.map((src, index) => {
                // Make sure there's a ref for this video
                if (!videoRefs.current[index]) {
                    videoRefs.current[index] = React.createRef(); // Create a ref for this video to control it later
                }

                // Function to make this video fullscreen
                async function goFull() {
                    const videoElement = videoRefs.current[index].current;
                    if (!videoElement) return;

                    try {
                        if (videoElement.requestFullscreen) {
                            await videoElement.requestFullscreen(); // Desktop browsers
                        } else if (videoElement.webkitEnterFullscreen) {
                            videoElement.webkitEnterFullscreen(); // iOS fallback
                        }
                        await videoElement.play(); // Start playback after fullscreen
                    } catch (err) {
                        console.warn("Fullscreen failed", err);
                    }
                }

                return (
                    <div key={index}>
                        <video
                            ref={videoRefs.current[index]} // Attach the ref to this video
                            src={src}
                            controls
                            playsInline
                            style={{ width: 360 }}
                        />
                        <button onClick={goFull}>Fullscreen</button>
                    </div>
                );
            })}

        </div>
    );
}