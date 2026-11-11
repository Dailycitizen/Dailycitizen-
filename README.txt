DAILY CITIZEN V1 — NETLIFY EDITION
Tec Faktory | Know Your Rights. Know Your Power.

This release migrates the Daily Citizen V2.3 Launch Showcase project from PHP endpoints to a static-first Netlify application with serverless JavaScript functions.

PUBLIC APPLICATION
- index.html: public Daily Citizen experience
- assets/: styles, scripts, icons and illustrative media
- data/: JSON content collections retained from the previous project
- netlify/functions/: content delivery, admin authentication, GitHub content management and anonymous analytics
- admin/: single-master-admin dashboard

DEPLOYMENT
1. Push this project to a GitHub repository.
2. Connect the repository to Netlify. Publish directory: . ; functions directory: netlify/functions.
3. Set Node.js version 20 or newer in Netlify.
4. Add the environment variables listed below.
5. Enable Netlify Blobs for the site (the analytics functions use the Blobs store).
6. Deploy over HTTPS.

REQUIRED NETLIFY ENVIRONMENT VARIABLES
- ADMIN_PASSWORD: a long, unique administrator password. Never put it in the repository.
- ADMIN_SESSION_SECRET: a cryptographically random secret of at least 32 bytes.
- GITHUB_REPOSITORY: owner/repository-name for the content repository.
- GITHUB_TOKEN: fine-grained GitHub token restricted to this repository, with Contents read/write permission.
- GITHUB_BRANCH: deployment branch, normally main.

ADMIN
Visit /admin/ after deployment. The dashboard supports secure master-admin login, JSON collection loading, record selection, JSON editing, adding draft records, importing/exporting JSON and saving changes through GitHub's Git data API. Saving triggers a normal GitHub commit and Netlify deployment. The editor uses optimistic SHA checks to avoid silently overwriting a newer version.

ANALYTICS AND PRIVACY
Visitor analytics use a random first-party browser identifier and a session identifier. The application does not store raw IP addresses. This is more privacy-conscious and more useful for return-visitor estimates than treating an IP address as a person: IPs can be shared, reassigned or changed. Metrics include tracked visits, unique browser IDs, returning browser IDs, page views, visits today/this week/this month, online sessions and top pages. Online means a session heartbeat was seen within 90 seconds. Analytics counts begin when the new analytics functions are deployed; the old 5,123 launch baseline is deliberately not carried forward as if independently verified.

LIMITATIONS
- Analytics are approximate and may undercount users who block scripts/storage or overcount bots and users who clear browser storage/change devices.
- Netlify Blobs is used for initial persistent analytics. At significant traffic scale, move event aggregation to a dedicated analytics/database service with atomic writes and retention controls.
- The current editor manages JSON collections. It is intentionally flexible but is not yet a field-by-field legal content wizard.
- GitHub content changes become public after Netlify completes the next deployment.
- Large audio uploads should use dedicated object storage; do not commit large music libraries into Git.
- Music records in the legacy dataset are artist/Spotify showcase entries, not direct audio tracks. Obtain rights before adding playable music.
- Lawyer demo records and advertiser showcase entries must be verified/approved before public commercial use.
- Legal information requires qualified review and authoritative source verification. The site is educational and is not a substitute for legal advice.

LOCAL DEVELOPMENT
npm install
npx netlify dev

This project requires Netlify Functions and Netlify Blobs. Opening index.html directly from a file manager will not exercise serverless APIs.

ADMIN SECURITY NOTES
Login attempts are rate-limited by a keyed hash of the connecting IP address (the raw IP is not written to analytics or stored as a plain value). Admin sessions use a signed, HttpOnly, Secure, SameSite=Strict cookie and expire after 12 hours. Use a strong unique password and keep the session secret private.

SEO BUILD / SEARCH INDEXING
---------------------------
The Netlify build runs `npm run build`, which executes scripts/generate-seo.mjs.
It generates a crawlable static HTML page for each record in data/laws.json, a
browseable /laws/ legal library, a sitemap.xml containing the homepage, library,
project information page and every legal entry, and a robots.txt that keeps the
admin and private data paths out of crawling. It also applies the canonical host
and social URL metadata to the homepage. Legal entry pages include unique titles,
descriptions, canonical URLs, Open Graph/Twitter metadata and Article JSON-LD.

Netlify supplies the site URL automatically. If the project uses a custom domain,
set the Netlify environment variable PUBLIC_SITE_URL to the final public origin,
for example https://your-real-domain.com (no trailing path). For local builds,
set PUBLIC_SITE_URL before running `npm run build`. Do not leave a temporary or
preview domain as the production canonical URL. After deployment, submit
https://YOUR-DOMAIN/sitemap.xml in Google Search Console and Bing Webmaster Tools.
Search indexing is not guaranteed and can take time. Legal content should be
reviewed against current authoritative sources before publication.
