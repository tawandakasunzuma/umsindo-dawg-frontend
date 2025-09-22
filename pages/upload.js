// Import React and necessary hooks
import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

/**
 * Upload Page Component
 * - Handles file uploads with artist/title metadata
 * - Previews the selected video/audio before uploading
 * - Shows previously uploaded files with thumbnails
 * - Clicking a thumbnail swaps it to the actual <video> so it can play/fullscreen
 * - Supports fullscreen video playback (desktop + Safari fallback)
 * - Uses localStorage to remember pending uploads
 */
export default function UploadPage() {

  // State to hold artist input
  const [artist, setArtist] = useState('');

  // State to hold title input
  const [title, setTitle] = useState('');

  // State to hold the selected file
  const [file, setFile] = useState(null);

  // State to hold preview URL for the selected file
  const [previewUrl, setPreviewUrl] = useState(null);

  // State to hold upload status or error messages
  const [message, setMessage] = useState('');

  // State to indicate whether the upload is in progress
  const [uploading, setUploading] = useState(false);

  // State to hold all uploaded items (with ID, URL, thumbnail, etc.)
  const [uploads, setUploads] = useState([]);

  // Index of the video that has been "activated" (thumbnail clicked -> show video)
  // null means no active swapped video
  const [activeVideoIndex, setActiveVideoIndex] = useState(null);

  // Array of refs for video elements (used for fullscreen & playback control)
  // videoRefs.current[i] will be a ref object with .current = DOM <video> element
  const videoRefs = useRef([]);

  // Load any existing uploads from localStorage on component mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('umsindo_uploads') || '[]');
      setUploads(stored);
    } catch (e) {
      console.warn("Failed to load from localStorage", e);
    }
  }, []);

  // Save uploads to localStorage whenever uploads state changes
  useEffect(() => {
    try {
      localStorage.setItem('umsindo_uploads', JSON.stringify(uploads));
    } catch (e) {
      console.warn("Failed to save to localStorage", e);
    }
  }, [uploads]);

  // Keep the videoRefs array in sync with the uploads array length.
  // This ensures each upload has a stable React.createRef() stored.
  useEffect(() => {
    videoRefs.current = uploads.map((_, i) => videoRefs.current[i] || React.createRef());
  }, [uploads]);

  // Auto-play the video when its thumbnail is clicked (activeVideoIndex is set).
  // We swallow play() rejections because browsers may block autoplay without user gesture.
  useEffect(() => {
    if (activeVideoIndex == null) return;
    const ref = videoRefs.current[activeVideoIndex];
    const v = ref?.current;
    if (!v) return;
    v.play().catch(() => {
      // play blocked by browser autoplay policy — that's fine, controls are present
    });
  }, [activeVideoIndex]);

  // Clean up preview object URL when component unmounts or previewUrl changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle when a user selects a file
  function onFileChange(e) {
    const files = e.target.files;
    if (!files || files.length === 0) {
      // If no file selected, reset state
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    const f = files[0]; // Take the first selected file
    setFile(f); // Save to state

    // Clear old preview URL if it exists
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    // Create a new preview URL for the selected file
    setPreviewUrl(URL.createObjectURL(f));
  }

  // Handle form submission (uploading the file)
  async function handleSubmit(e) {
    e.preventDefault(); // Prevent page reload
    setMessage(''); // Clear any previous message

    // Basic validation
    if (!artist || !title) {
      setMessage('Please enter artist and title.');
      return;
    }

    if (!file) {
      setMessage('Please select a file.');
      return;
    }

    // Prepare form data to send to the server
    const formData = new FormData();
    formData.append('artist', artist);
    formData.append('title', title);
    formData.append('file', file);

    setUploading(true); // Show uploading state

    try {
      // Send POST request to /api/upload
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data?.message || 'Upload failed');
        return;
      }

      // Show success message
      setMessage(data.message || 'Submitted — pending review');

      // Add the new uploaded item to state
      setUploads(u => [
        {
          id: data.id,
          url: data.url,
          thumbnailWide: data.thumbnailWide || null,
          thumbnailSquare: data.thumbnailSquare || null,
          artist: artist,
          title: title,
          status: 'pending'
        },
        ...u
      ]);

      // Clear the form fields
      setArtist('');
      setTitle('');
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

    } catch (err) {
      console.error(err);
      setMessage('Network error during upload');
    } finally {
      setUploading(false); // Upload complete
    }
  }

  // Function to enter fullscreen mode for a video (robust across browsers)
  async function goFull(index) {
    const v = videoRefs.current[index]?.current;
    if (!v) return;

    try {
      // Prefer standard Fullscreen API
      if (v.requestFullscreen) {
        await v.requestFullscreen();
      // Safari on iOS / old WebKit - enter native fullscreen for <video>
      } else if (v.webkitEnterFullscreen) {
        // webkitEnterFullscreen is not Promise-based, call it and continue
        v.webkitEnterFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen failed", e);
    }

    // Ensure playback starts when entering fullscreen (best-effort)
    try { await v.play(); } catch (_) {}
  }

  // Optional helper: convert .mp4 => .mp4-thumb-wide.jpg as a fallback thumbnail strategy
  function deriveThumbFromSrc(src) {
    if (!src) return null;
    if (src.includes('.mp4')) return src.replace('.mp4', '.mp4-thumb-wide.jpg');
    return null;
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto', color: '#fff' }}>
      {/* Page Title */}
      <h1>Upload Your Freestyle</h1>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
        {/* Artist Input */}
        <input
          name="artist"
          placeholder="Artist name"
          value={artist}
          onChange={e => setArtist(e.target.value)}
          required
        />

        {/* Title Input */}
        <input
          name="title"
          placeholder="Freestyle title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        {/* File Input */}
        <input
          type="file"
          accept="video/*,audio/*"
          onChange={onFileChange}
        />

        {/* Preview selected file before upload */}
        {previewUrl && (
          <div>
            <h4>Preview</h4>
            <video
              src={previewUrl}
              controls
              style={{ width: 320 }}
              playsInline
            />
          </div>
        )}

        {/* Submit Button */}
        <div>
          <button type="submit" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>

      {/* Upload Status Message */}
      <p style={{ marginTop: 12, color: '#B3B3B3' }}>{message}</p>

      {/* Uploaded Items List */}
      <h2 style={{ marginTop: 20 }}>Uploaded Freestyles (preview)</h2>
      <div>
        {/* If no uploads yet */}
        {uploads.length === 0 && <div style={{ padding: 10 }}>No uploads yet.</div>}

        {/* Map over each uploaded item */}
        {uploads.map((item, i) => {
          const src = item.url;
          const thumb = item.thumbnailWide || deriveThumbFromSrc(src);

          // Ensure a ref exists for each video (also synced in the effect above)
          if (!videoRefs.current[i]) videoRefs.current[i] = React.createRef();

          return (
            <div
              key={item.id || i}
              style={{ marginBottom: 18, background: '#111', padding: 10, borderRadius: 8 }}
            >
              {/* Artist and title display */}
              <div style={{ fontWeight: 600 }}>
                {item.artist || 'Unknown'} — {item.title || ''}
              </div>

              {/* Render thumbnail OR video.
                  - If there's a thumbnail and it's NOT the active swapped index, show the image.
                  - If the thumbnail was clicked (activeVideoIndex === i) or there is no thumbnail,
                    render the actual <video> so it can play and go fullscreen.
              */}
              {(thumb && activeVideoIndex !== i) ? (
                <Image
                  src={thumb}
                  alt="Thumbnail"
                  width={360}          // Required: fixed width for next/image
                  height={202}         // Approx height for 16:9 ratio
                  style={{ display: 'block', cursor: 'pointer' }}
                  onClick={() => {
                    // Swap to the real video for playback & fullscreen
                    setActiveVideoIndex(i);
                  }}
                  unoptimized={true}   // disable optimization for external URLs if needed
                />
              ) : (
                // Video player (either fallback when no thumb or after clicking the thumb)
                <video
                  ref={videoRefs.current[i]}
                  src={src}
                  controls
                  playsInline
                  style={{ width: 360 }}
                />
              )}

              {/* Status and ID display */}
              <div style={{ fontSize: 12, color: '#B3B3B3', marginTop: 6 }}>
                Status: {item.status || 'pending'}
                {item.id && <> · ID: {item.id}</>}
              </div>

              {/* Action buttons */}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                {/* Fullscreen button (type="button" so it doesn't submit any form) */}
                <button type="button" onClick={() => {
                  // If thumbnail is currently showing, first swap to video so fullscreen has a target.
                  if (activeVideoIndex !== i && thumb) {
                    setActiveVideoIndex(i);
                    // small timeout to allow DOM update so the ref points to the video element
                    // then call fullscreen/play. 150ms is generous but not huge.
                    setTimeout(() => goFull(i), 150);
                  } else {
                    goFull(i);
                  }
                }}>Fullscreen</button>

                {/* Optional: Hide video and return to thumbnail (if user wants) */}
                {activeVideoIndex === i && thumb && (
                  <button type="button" onClick={() => setActiveVideoIndex(null)}>Back to thumbnail</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
