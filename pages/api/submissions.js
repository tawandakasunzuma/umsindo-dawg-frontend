// Import the function that reads all stored submissions from our local file
import { listSubmissions } from '../../lib/submissions';

// Runs when a request is made to /api/submissions
export default function handler(req, res) {
  // Get the 'status' query parameter from the request URL, e.g. ?status=pending
  const { status } = req.query;

  try {
    // Use the helper function to get all submissions (or filter by status if provided)
    const items = listSubmissions(status);

    // Send back the list of submissions as a JSON response with status code 200 (OK)
    return res.status(200).json(items);
    
  } catch (err) {
    // If something goes wrong (e.g. file read error), log the error to the console
    console.error(err);

    // Send back a 500 error response with a helpful message
    return res.status(500).json({ message: 'Failed to read submissions' });
  }
}
