// Import React hooks for managing state and side effects
import { useEffect, useState } from 'react';
// Import Next.js image component
import Image from 'next/image';

/**
 * Component to render a single competition submission
 * - Initially shows a thumbnail image (if available)
 * - When the user clicks the play button, replaces the image with a <video> element
 */
function CompetitionCard({ submission }) {
    // State to track whether the user has clicked play for this submission
    const [play, setPlay] = useState(false);

    return (
        <div
            key={submission.id}
            style={{
                marginBottom: 20,
                borderRadius: 8,
                padding: 12,
                background: '#1E1E1E',
                color: '#fff',
            }}
        >
            {/* Display the artist and title */}
            <div style={{ fontWeight: 700 }}>
                {submission.artist} — {submission.title}
            </div>

            {/* This container will show either the thumbnail image or the video player */}
            <div style={{ position: 'relative', marginTop: 8, maxWidth: 480 }}>
                {/* If the video is NOT playing yet, show thumbnail and play button */}
                {!play ? (
                    <>
                        {/* If a thumbnail is available, show it. Otherwise show a black placeholder */}
                        {submission.thumbnailWide ? (
                        <Image
                            src={submission.thumbnailWide} // the full path to the image (e.g., /uploads/thumb.jpg or an external URL)
                            alt={`${submission.artist} - ${submission.title}`} // accessibility
                            width={480} // required: define width
                            height={270} // required: define height (or use aspect ratio)
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                            }}
                            priority={false} // only load immediately if needed (optional)
                        />
                        ) : (
                            <div style={{ width: '100%', height: 270, background: '#000' }} />
                        )}

                        {/* Play button that overlays on the thumbnail */}
                        <button
                            onClick={() => setPlay(true)} // Start playing when clicked
                            aria-label={`Play ${submission.title}`}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                padding: 12,
                                borderRadius: 999,
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            ▶
                        </button>
                    </>
                ) : (
                    // If user clicked play, render the video player
                    <video
                        src={submission.fileUrl}
                        controls
                        autoPlay // Start playing immediately
                        playsInline // Ensure inline playback on mobile
                        style={{ width: '100%' }}
                    />
                )}
            </div>

            {/* Display optional duration below video/thumbnail */}
            <div style={{ marginTop: 8, fontSize: 12, color: '#B3B3B3' }}>
                {submission.durationSeconds ? `${submission.durationSeconds}s` : ''}
            </div>
        </div>
    );
}

/**
 * Main Competition page component, rendered at /competition
 * - Fetches approved submissions
 * - Displays them using the CompetitionCard component
 */
export default function CompetitionPage() {
    // State to hold the list of approved freestyle tracks
    const [approvedSubmissions, setApprovedSubmissions] = useState([]);

    // Fetch the approved submissions once when the component loads
    useEffect(() => {
        fetch('/api/submissions?status=approved')
            .then((response) => response.json()) // Convert response to JSON
            .then((data) => setApprovedSubmissions(data)) // Store in state
            .catch((error) => {
                // Log any errors during fetch
                console.error('Failed to load approved submissions:', error);
            });
    }, []); // Empty dependency array = only run once on mount

    // If no approved submissions were found, show a message
    if (approvedSubmissions.length === 0) {
        return (
            <div style={{ padding: 20 }}>
                No approved freestyles yet.
            </div>
        );
    }

    // Otherwise, show the list of approved submissions using CompetitionCard
    return (
        <div style={{ padding: 20 }}>
            <h1>Freestyle Competition — Approved</h1>

            {/* Loop through each approved submission and render it using the CompetitionCard component */}
            {approvedSubmissions.map((submission) => (
                <CompetitionCard submission={submission} key={submission.id} />
            ))}
        </div>
    );
}
