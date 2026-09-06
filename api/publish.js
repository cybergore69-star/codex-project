import { authorized, validate, digest, downloadImage, publish } from '../lib/publisher.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!process.env.PUBLISH_API_KEY || !process.env.GITHUB_TOKEN) return res.status(503).json({ error: 'Publisher not configured' });
  if (!authorized(req.headers.authorization, process.env.PUBLISH_API_KEY)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (JSON.stringify(data || {}).length > 90000) return res.status(413).json({ error: 'Request too large' });
    const article = validate(data.article);
    const image = await downloadImage(data.openaiFileIdRefs);
    const hash = digest(article, image?.data);
    if (data.mode === 'preview') return res.json({ status: 'preview_only', article, imageIncluded: !!image, confirmationHash: hash });
    if (data.mode !== 'publish' || data.confirmationHash !== hash) return res.status(400).json({ error: 'Preview the exact article and image first, then confirm its hash' });
    return res.json(await publish(article, image, hash));
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status === 400 || error.status === 409 ? error.message : 'Publication failed. Retry the same article; do not change its id.' });
  }
}
