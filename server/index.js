import 'dotenv/config';
import express from 'express';
import { extractMedsFromDocument } from './extract.js';

const app = express();
app.use(express.json({ limit: '30mb' }));

app.post('/api/extract', async (req, res) => {
  try {
    const meds = await extractMedsFromDocument(req.body ?? {});
    res.json(meds);
  } catch (err) {
    res.status(502).json({ error: err.message ?? 'Extraction failed.' });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Flopsy extract server listening on http://localhost:${PORT}`);
});
