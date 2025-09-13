import { useEffect, useState } from 'react';

// Main page component that will be shown at /competition
export default function CompetitionPage() {

    // State to hold the list of all approved freestyle tracks
    const [approvedSubmissions, setApprovedSubmissions] = useState([]);

    useEffect(() => {

        // Fetch only the submissions that have status=approved
        fetch('/api/submissions?status=approved')
            .then(response => response.json()) // Convert the response to JSON
            .then(data => setApprovedSubmissions(data)) // Save the result in our state
            .catch(error => {
                // Log any errors that happen during the fetch
                console.error("Failed to load approved submissions:", error);
            });
    }, []); // Only run once on page load

    // If no approved submissions were found, show a simple message
    if (approvedSubmissions.length === 0) {
        return (
        <div style={{ padding: 20 }}>
            No approved freestyles yet.
        </div>
        );
    }

    // Otherwise, show the list of approved submissions
    return (
        <div style={{ padding: 20 }}>
            <h1>Freestyle Competition — Approved</h1>

            {/* Loop through each approved submission and render it */}
            {approvedSubmissions.map(submission => (
                <div
                    key={submission.id}
                    style={{
                        marginBottom: 20,
                        borderRadius: 8,
                        padding: 12,
                        background: '#1E1E1E',
                    }}
                >
                {/* Show artist and title */}
                <div style={{ fontWeight: 600 }}>
                    {submission.artist} — {submission.title}
                </div>

                {/* Show the video player */}
                <video
                    src={submission.fileUrl}
                    controls
                    style={{
                        width: '100%',
                        maxWidth: 480,
                        marginTop: 8,
                        borderRadius: 4,
                    }}
                />
                </div>
            ))}
        </div>
    );
}
