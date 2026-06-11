import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

const EXTRACTION_PROMPT = `This is veterinary discharge paperwork for a dog. Extract every medication into a JSON array. Each element must have exactly these fields:
- "name": medication name including strength (e.g. "Prednisone 5mg")
- "dose": amount per administration (e.g. "1 tablet", "0.15ml")
- "frequency": how often (e.g. "twice daily", "every 8-12 hours")
- "timing": when to give it (e.g. "morning", "evening 8-9pm", "with food")
- "instructions": any other directions, warnings, or notes
- "shortTerm": boolean — true if the medication is only for a limited course (e.g. "for 3 days", "until finished"), false if ongoing

If a medication is given at multiple distinct times of day (e.g. morning and evening), output one element per dose time.

Respond with ONLY the JSON array — no markdown fences, no commentary.`;

export async function extractMedsFromDocument({ data, mediaType }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Server is missing ANTHROPIC_API_KEY. Add it to the .env file.');
  }

  const client = new Anthropic({ apiKey });

  const contentBlock =
    mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data } };

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      { role: 'user', content: [contentBlock, { type: 'text', text: EXTRACTION_PROMPT }] },
    ],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // Tolerate stray prose or code fences around the JSON array.
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error('Could not find a medication list in the response. Try a clearer photo.');
  }

  const parsed = JSON.parse(text.slice(start, end + 1));
  return parsed.map((m) => ({
    name: String(m.name ?? ''),
    dose: String(m.dose ?? ''),
    timing: [m.timing, m.frequency].filter(Boolean).join(' — '),
    instructions: String(m.instructions ?? ''),
    shortTerm: Boolean(m.shortTerm),
  }));
}
