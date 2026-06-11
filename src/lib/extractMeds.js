import { api } from './api';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Extraction runs on the server so the Anthropic API key never reaches the browser.
export async function extractMedsFromDocument(file) {
  const data = await fileToBase64(file);
  return api('/extract', { method: 'POST', body: { data, mediaType: file.type } });
}
