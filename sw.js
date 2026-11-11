const CACHE='daily-citizen-v1-netlify-2026-11';
const APP_SHELL=['./','./index.html','./assets/css/style.css','./assets/js/app.js','./manifest.webmanifest','./assets/icons/icon-192.png','./assets/icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin)return;
 // Admin/API responses and analytics must always be fresh and must never enter the offline cache.
 if(url.pathname.startsWith('/.netlify/functions/')||url.pathname.startsWith('/admin/')){event.respondWith(fetch(event.request));return;}
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
