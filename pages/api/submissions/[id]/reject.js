// Import the updateSubmission function to modify the status
import { updateSubmission } from '../../../../lib/submissions';

// This API endpoint will reject a submission by its ID
export default function handler(req, res) {

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).end();
  };

  // Get the submission ID from the URL
  const { id } = req.query;

  // Try to update the submission's status to "rejected"
  const updated = updateSubmission(id, { status: 'rejected' });

  // If no submission found, return 404
  if (!updated) {
    return res.status(404).json({ message: 'Not found' });
  };

  // Otherwise, return the updated submission object
  return res.status(200).json(updated);
}
