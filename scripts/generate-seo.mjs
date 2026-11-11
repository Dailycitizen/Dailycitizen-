import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const publicUrl = (process.env.PUBLIC_SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || '').trim().replace(/\/+$/, '');
if (!publicUrl) {
  throw new Error('Set PUBLIC_SITE_URL for local builds. Netlify automatically provides URL for deployed builds.');
}
let base;
try { base = new URL(publicUrl).origin; } catch { throw new Error('PUBLIC_SITE_URL must be a valid absolute URL, e.g. https://your-domain.com'); }

const laws = JSON.parse(await readFile(path.join(root, 'data/laws.json'), 'utf8'));
const categories = JSON.parse(await readFile(path.join(root, 'data/categories.json'), 'utf8'));
if (!Array.isArray(laws) || !Array.isArray(categories)) throw new Error('SEO generation expected laws.json and categories.json to contain arrays.');

const slugify = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'legal-entry';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const date = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '')) ? value : '';
const canonicalFor = slug => `${base}/laws/${slug}/`;
const used = new Set();
const entries = laws.map((law, index) => {
  const stem = slugify(law.title || `legal-entry-${law.id ?? index + 1}`);
  let slug = stem;
  if (used.has(slug)) slug = `${stem}-${slugify(law.id ?? index + 1)}`;
  while (used.has(slug)) slug = `${stem}-${index + 1}`;
  used.add(slug);
  return { law, slug };
});

const rootFile = path.join(root, 'index.html');
let home = await readFile(rootFile, 'utf8');
home = home.replace(/^<\?php[^\n]*\?>\s*/i, '');
// Make the SEO injection idempotent when the build is run more than once.
home = home.replace(/\s*<meta property="og:url" content="[^"]*">/g, '');
home = home.replace(/\s*<meta name="twitter:card" content="summary_large_image">/g, '');
home = home.replace(/\s*<meta name="application-name" content="Daily Citizen">/g, '');
const canonical = `${base}/`;
const meta = [
  `<link rel="canonical" href="${canonical}">`,
  `<meta property="og:url" content="${canonical}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="application-name" content="Daily Citizen">`
].join('\n    ');
home = home.replace(/<link rel="canonical" href="[^"]*">/, meta);
home = home.replace('<a href="readme.html">Project Info</a>', '<a href="readme.html">Project Info</a> · <a href="/laws/">Legal Library</a>');
await writeFile(rootFile, home);

const pageTemplate = ({ law, slug }) => {
  const title = plain(law.title) || 'Nigerian legal information';
  const category = plain(law.category_name || law.category || 'Nigerian Law');
  const act = plain(law.law?.act);
  const section = plain(law.law?.section);
  const lawText = plain(law.law?.text);
  const meaning = plain(law.meaning);
  const example = plain(law.real_life_instance?.text);
  const caseName = plain(law.case?.name);
  const caseStory = plain(law.case?.story);
  const citation = plain(law.case?.citation);
  const summary = (meaning || lawText || `${title} — accessible legal information from Daily Citizen.`).slice(0, 250);
  const url = canonicalFor(slug);
  const source = law.law?.source_url && /^https:\/\//i.test(law.law.source_url) ? law.law.source_url : '';
  const caseSource = law.case?.source_url && /^https:\/\//i.test(law.case.source_url) ? law.case.source_url : '';
  const tags = Array.isArray(law.tags) ? law.tags.map(plain).filter(Boolean) : [];
  const schema = {
    '@context': 'https://schema.org', '@type': 'Article', headline: title,
    description: summary, inLanguage: 'en-NG', datePublished: date(law.date) || undefined,
    dateModified: date(law.date) || undefined, mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Daily Citizen' },
    publisher: { '@type': 'Organization', name: 'Tec Faktory', url: 'https://tecfaktory.com/' },
    about: { '@type': 'Thing', name: category }
  };
  return `<!doctype html>
<html lang="en-NG"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | Daily Citizen</title><meta name="description" content="${esc(summary)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Daily Citizen"><meta property="og:title" content="${esc(title)} | Daily Citizen"><meta property="og:description" content="${esc(summary)}"><meta property="og:url" content="${esc(url)}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)} | Daily Citizen"><meta name="twitter:description" content="${esc(summary)}">
<link rel="icon" href="/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css"><meta name="theme-color" content="#06100b">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script></head><body><main class="app-shell"><article class="citizen-card" style="max-width:900px;margin:24px auto;padding:clamp(20px,5vw,48px)">
<p class="brand-kicker">DAILY CITIZEN · ${esc(category)}</p><h1>${esc(title)}</h1><p><a href="/">← Back to Daily Citizen</a></p>
${law.date ? `<p><strong>Published in library:</strong> <time datetime="${esc(date(law.date))}">${esc(date(law.date))}</time></p>` : ''}
<section><h2>Legal provision</h2>${act ? `<p><strong>Law:</strong> ${esc(act)}</p>` : ''}${section ? `<p><strong>Section:</strong> ${esc(section)}</p>` : ''}<p>${esc(lawText || 'Legal explanation not supplied.')}</p>${source ? `<p><a href="${esc(source)}" target="_blank" rel="noopener noreferrer">View legal source ↗</a></p>` : ''}</section>
${meaning ? `<section><h2>What this means</h2><p>${esc(meaning)}</p></section>` : ''}
${example ? `<section><h2>Practical example</h2><p>${esc(example)}</p></section>` : ''}
${Array.isArray(law.what_you_can_do) && law.what_you_can_do.length ? `<section><h2>What you can do</h2><ul>${law.what_you_can_do.map(x => `<li>${esc(plain(x))}</li>`).join('')}</ul></section>` : ''}
${caseName ? `<section><h2>Related case</h2><h3>${esc(caseName)}</h3>${citation ? `<p><strong>Citation:</strong> ${esc(citation)}</p>` : ''}${caseStory ? `<p>${esc(caseStory)}</p>` : ''}${caseSource ? `<p><a href="${esc(caseSource)}" target="_blank" rel="noopener noreferrer">Read case source ↗</a></p>` : ''}</section>` : ''}
${tags.length ? `<p><strong>Topics:</strong> ${tags.map(esc).join(' · ')}</p>` : ''}
<p class="disclaimer">General information only. This is not legal advice. Laws may change and legal outcomes depend on the facts. Confirm current law and consult a qualified Nigerian legal practitioner.</p>
<footer><a href="/">Daily Citizen</a> · Developed by <a href="https://tecfaktory.com/">Tec Faktory</a></footer></article></main></body></html>`;
};

await rm(path.join(root, 'laws'), { recursive: true, force: true });
for (const entry of entries) {
  const dir = path.join(root, 'laws', entry.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), pageTemplate(entry));
}

const urls = [
  { loc: `${base}/`, changefreq: 'daily', priority: '1.0' },
  { loc: `${base}/readme.html`, changefreq: 'monthly', priority: '0.3' },
  { loc: `${base}/laws/`, changefreq: 'weekly', priority: '0.8' },
  ...entries.map(({ law, slug }) => ({ loc: canonicalFor(slug), lastmod: date(law.date), changefreq: 'monthly', priority: '0.7' }))
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
await mkdir(path.join(root, 'laws'), { recursive: true });
const libraryLinks = entries.map(({ law, slug }) => `<li><a href="/laws/${esc(slug)}/">${esc(plain(law.title) || 'Legal entry')}</a> <span>— ${esc(plain(law.category_name || law.category || 'Nigerian Law'))}</span></li>`).join('\n');
await writeFile(path.join(root, 'laws', 'index.html'), `<!doctype html><html lang="en-NG"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Legal Library | Daily Citizen</title><meta name="description" content="Browse Nigerian legal rights, laws, sections, court cases and practical explanations in the Daily Citizen legal library."><link rel="canonical" href="${base}/laws/"><meta name="robots" content="index,follow"><link rel="stylesheet" href="/assets/css/style.css"></head><body><main class="app-shell"><article class="citizen-card" style="max-width:900px;margin:24px auto;padding:clamp(20px,5vw,48px)"><p class="brand-kicker">DAILY CITIZEN · LEGAL LIBRARY</p><h1>Explore Nigerian legal information</h1><p>Browse ${entries.length} legal information entries, including constitutional rights, legal provisions, related cases and practical explanations.</p><p><a href="/">← Back to Daily Citizen</a></p><ol>${libraryLinks}</ol><p class="disclaimer">General information only. This is not legal advice. Confirm current law and consult a qualified Nigerian legal practitioner.</p></article></main></body></html>`);
await writeFile(path.join(root, 'sitemap.xml'), xml);
await writeFile(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /data/\nDisallow: /admin/\nDisallow: /.netlify/\nSitemap: ${base}/sitemap.xml\n`);
console.log(`SEO build complete: ${entries.length} legal pages, ${urls.length} sitemap URLs, canonical host ${base}`);
