import { extractMedsFromDocument } from '../server/extract.js';

// Allow larger bodies for base64-encoded PDFs and photos.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const meds = await extractMedsFromDocument(req.body ?? {});
    res.json(meds);
  } catch (err) {
    res.status(502).json({ error: err.message ?? 'Extraction failed.' });
  }
}
