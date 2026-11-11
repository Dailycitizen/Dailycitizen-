import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
export function json(data, status=200, extra={}) { return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } }); }
export function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  const part = raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
  return part ? decodeURIComponent(part.slice(name.length+1)) : '';
}
export function sign(value) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  return createHmac('sha256', secret).update(value).digest('hex');
}
export function makeSession() {
  const payload = Buffer.from(JSON.stringify({ sub:'master', exp:Date.now()+12*60*60*1000, nonce:randomUUID() })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function isAdmin(request) {
  try {
    const token = cookieValue(request, 'dc_admin');
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;
    const expected = sign(payload);
    const a = Buffer.from(signature), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a,b)) return false;
    const data = JSON.parse(Buffer.from(payload,'base64url').toString());
    return data.sub === 'master' && data.exp > Date.now();
  } catch { return false; }
}
export function originAllowed(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
