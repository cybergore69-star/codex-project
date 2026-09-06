import { createHash, timingSafeEqual } from 'node:crypto';
export const repo = 'cybergore69-star/codex-project';
export const site = 'https://afdzalsalimi.my';
export function authorized(header, secret) {
  if (!secret || secret.length < 32 || typeof header !== 'string') return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
export function validate(input) {
  if (!input || typeof input !== 'object') fail('Article required');
  const text = (v, max) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max || /[<>\u0000]/.test(v)) fail('Invalid text or unsupported HTML');
    return v.trim();
  };
  const id = text(input.id, 90);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail('Use a lowercase hyphenated id');
  if (!Array.isArray(input.tags) || input.tags.length > 8) fail('Up to eight tags required');
  if (!Array.isArray(input.body) || !input.body.length || input.body.length > 300) fail('Body must contain 1-300 paragraphs');
  const article = { id, title: text(input.title, 200), excerpt: text(input.excerpt, 800), tags: input.tags.map(x => text(x, 40)), body: input.body.map(x => text(x, 6000)), fullPage: true };
  if (JSON.stringify(article).length > 60000) fail('Article too long');
  return article;
}
export const digest = (a, image) => createHash('sha256').update(JSON.stringify(a)).update(image || Buffer.alloc(0)).digest('hex');
export async function downloadImage(refs = []) {
  if (!Array.isArray(refs) || refs.length > 1) fail('Send at most one PNG or JPEG cover');
  if (!refs.length) return null;
  let url;
  try { url = new URL(refs[0].download_link); } catch { fail('Send a fresh ChatGPT file attachment'); }
  if (url.protocol !== 'https:' || url.hostname !== 'files.oaiusercontent.com' || url.port || url.username || url.password) fail('Unsupported file host');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) fail('Attachment expired; send it again');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) fail('Image must be under 4 MB');
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  const ext = data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : data[0] === 255 && data[1] === 216 && data[2] === 255 ? 'jpg' : null;
  if (!ext) fail('Only PNG and JPEG supported; export HEIC as JPEG');
  return { data, ext };
}
export async function github(path, method = 'GET', body) {
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    method, headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw Object.assign(new Error('GitHub request failed'), { status: response.status === 409 || response.status === 422 ? 409 : 502 });
  return response.json();
}
export async function publish(article, image, hash, gh = github) {
  const ref = await gh('git/ref/heads/main');
  const parent = await gh(`git/commits/${ref.object.sha}`);
  const file = await gh(`contents/articles.js?ref=${ref.object.sha}`);
  const source = Buffer.from(file.content, 'base64').toString('utf8');
  // Read the trusted repository as text; never evaluate submitted JavaScript.
  const marker = /^window\.INSIGHTS\s*=\s*\[/;
  if (!marker.test(source)) throw Object.assign(new Error('Unexpected article format'), { status: 409 });
  const ids = [...source.matchAll(/(?:"id"|\bid)\s*:\s*"([a-z0-9-]+)"/g)].map(m => m[1]);
  if (ids.includes(article.id)) {
    if (source.includes(`"publicationHash": "${hash}"`)) return { status: 'already_saved', url: `${site}/p/${article.id}.html` };
    throw Object.assign(new Error('Article id already exists; choose a new id'), { status: 409 });
  }
  const entry = { ...article, publishedAt: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date()), publicationHash: hash };
  const tree = [];
  if (image) {
    entry.image = `assets/${article.id}-${hash.slice(0, 16)}.${image.ext}`;
    const blob = await gh('git/blobs', 'POST', { content: image.data.toString('base64'), encoding: 'base64' });
    tree.push({ path: entry.image, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const content = source.replace(marker, match => `${match}\n${JSON.stringify(entry, null, 2)},`);
  tree.push({ path: 'articles.js', mode: '100644', type: 'blob', content });
  const nextTree = await gh('git/trees', 'POST', { base_tree: parent.tree.sha, tree });
  const commit = await gh('git/commits', 'POST', { message: `feat: publish ${article.id}`, tree: nextTree.sha, parents: [ref.object.sha] });
  // Fast-forward only: concurrent changes must be retried, never overwritten.
  await gh('git/refs/heads/main', 'PATCH', { sha: commit.sha, force: false });
  return { status: 'saved_deployment_pending', commit: commit.sha, url: `${site}/p/${article.id}.html` };
}
