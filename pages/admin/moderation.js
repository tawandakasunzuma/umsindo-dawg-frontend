import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminModeration() {
  // State to hold the list of pending submissions
  const [pending, setPending] = useState([]);

  // State to show loading spinner while approving/rejecting
  const [loading, setLoading] = useState(false);

  // Track if we are on the client (browser), not during SSR
  const [isClient, setIsClient] = useState(false);

  // Access URL parameters (e.g. ?secret=letmein)
  const router = useRouter();
  const secret = router.query.secret || '';

  // Detect when we are on the client
  useEffect(() => {
    setIsClient(true); // This will let the component safely check `window` and secrets
  }, []);

  // Function to load all pending submissions from the API
  const load = () => {
    fetch('/api/submissions?status=pending')
      .then(r => r.json())
      .then(setPending);
  };

  // After client confirms (and only then), fetch pending submissions
  useEffect(() => {
    if (isClient) {
      load();
    }
  }, [isClient]);

  // If we're still waiting to confirm client, show loading
  if (!isClient) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  // Simple protection: Only show the page if secret is correct
  if (secret !== (process.env.NEXT_PUBLIC_ADMIN_SECRET || 'letmein')) {
    return (
      <div style={{ padding: 20 }}>
        Not authorized. Add <code>?secret=letmein</code> to URL (dev only).
      </div>
    );
  }

  // Approve or reject a submission
  async function postAction(id, action) {
    setLoading(true); // Show loading state
    try {
      await fetch(`/api/submissions/${id}/${action}`, { method: 'POST' });
      load(); // Reload the updated list
    } catch (err) {
      console.error(err);
    }
    setLoading(false); // Done loading
  }

  // If there are no pending items
  if (!pending.length) {
    return (
      <div style={{ padding: 20 }}>
        No pending submissions.
      </div>
    );
  }

  // Main page UI
  return (
    <div style={{ padding: 20 }}>
      <h1>Admin — Moderation</h1>

      {/* Loop over each pending submission */}
      {pending.map(p => (
        <div
          key={p.id}
          style={{
            marginBottom: 14,
            padding: 12,
            background: '#111',
            color: '#fff',
          }}
        >
          <div>
            <strong>{p.artist} — {p.title}</strong>
          </div>

          <video
            src={p.fileUrl}
            controls
            style={{ width: '100%', maxWidth: 480, marginTop: 8 }}
          />

          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => postAction(p.id, 'approve')}
              disabled={loading}
            >
              ✅ Approve
            </button>

            <button
              onClick={() => postAction(p.id, 'reject')}
              disabled={loading}
              style={{ marginLeft: 8 }}
            >
              ❌ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
