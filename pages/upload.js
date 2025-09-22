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
    const [previewUrl, setPreviewUrl] = useState(null);

    // Form input states
    const [artist, setArtist] = useState('');
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);

    // Handle file selection and preview logic
    function onFileChange(e) {
        const fileList = e.target.files;

        if (fileList && fileList.length > 0) {
            const file = fileList[0]; // Get the first file
            setFile(file); // Save the file to state

            // Revoke old preview URL if it exists
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            const newPreviewUrl = URL.createObjectURL(file); // Create preview
            setPreviewUrl(newPreviewUrl); // Save preview
        } else {
            // If no file selected, clear everything
            setFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(null);
        }
    }

    // Handle form submission for file upload
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setMessage('Please select a file before clicking upload.');
            return;
        }

        if (!artist || !title) {
            setMessage('Please enter artist name and freestyle title before uploading.');
            return;
        }

        // Prepare form data with the selected file + metadata
        const formData = new FormData();
        formData.append('file', file);
        formData.append('artist', artist);
        formData.append('title', title);

        setUploading(true);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok) {
                setMessage(data?.message || 'Upload failed');
                return;
            }

            // success: server returns { url, id, message }
            setMessage(data.message || 'Submitted — pending review');

            // Append the new uploaded item with optional thumbnail
            setUploads(u => [
                ...u,
                {
                    id: data.id,
                    url: data.url,
                    // Attempt to generate thumbnail path from uploaded URL
                    thumbnail: data.url?.endsWith('.mp4')
                        ? data.url.replace('.mp4', '-thumb-wide.jpg')
                        : null,
                }
            ]);

            // Clear form fields
            setArtist('');
            setTitle('');
            setFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }
        } catch (err) {
            console.error(err);
            setMessage('Upload failed (network)');
        } finally {
            setUploading(false);
        }
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
                    name="artist"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Artist name"
                    required
                />

                <input
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Freestyle title"
                    required
                />

                <input
                    type="file"
                    name="file"
                    accept="video/*,audio/*" // Accept only audio and video files
                    onChange={onFileChange} // Save selected file to state
                />

                <button type="submit" disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Upload'}
                </button>
            </form>

            {/* Show preview of selected file before upload */}
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

            {/* Uploaded files preview section with optional thumbnail and fullscreen */}
            {uploads.map((item, index) => {
                const src = item.url || item;
                const thumb =
                    item.thumbnail || // If explicitly provided by backend
                    (item.url && item.url.endsWith('.mp4')
                        ? item.url.replace('.mp4', '-thumb-wide.jpg') // Try to generate
                        : null);

                // Ensure we have a ref for this video
                if (!videoRefs.current[index]) {
                    videoRefs.current[index] = React.createRef();
                }

                // Fullscreen helper function for each video
                async function goFull() {
                    const videoElement = videoRefs.current[index].current;
                    if (!videoElement) return;

                    try {
                        if (videoElement.requestFullscreen) {
                            await videoElement.requestFullscreen(); // Desktop
                        } else if (videoElement.webkitEnterFullscreen) {
                            videoElement.webkitEnterFullscreen(); // iOS fallback
                        }
                        await videoElement.play(); // Start playback
                    } catch (err) {
                        console.warn("Fullscreen failed", err);
                    }
                }

                return (
                    <div key={index} style={{ marginBottom: 16 }}>

                        {/* Optional thumbnail preview if available */}
                        {thumb && (
                            <img
                                src={thumb}
                                alt={`Thumbnail for ${item.id || 'upload'}`}
                                style={{
                                    width: 360,
                                    display: 'block',
                                    marginBottom: 8,
                                    borderRadius: 4,
                                    objectFit: 'cover'
                                }}
                            />
                        )}

                        {/* Actual video preview */}
                        <video
                            ref={videoRefs.current[index]} // Attach the ref to this video
                            src={src}
                            controls
                            playsInline
                            style={{ width: 360 }}
                        />

                        {/* Status badge with optional ID */}
                        <div style={{ fontSize: 12, color: '#B3B3B3', marginTop: 6 }}>
                            Status: Pending
                            {item.id && (
                                <small style={{ marginLeft: 8 }}>ID: {item.id}</small>
                            )}
                        </div>

                        {/* Button to enter fullscreen for this video */}
                        <button onClick={goFull} style={{ marginTop: 6 }}>
                            Fullscreen
                        </button>
                    </div>
                );
            })}

        </div>
    );
}
