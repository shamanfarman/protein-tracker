/* Offline app shell. Data is kept in browser storage, never in the service-worker cache. */
const CACHE_NAME='daily-protein-tracker-shell-v1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS))
    .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const name of await caches.keys()) {
      if(name.startsWith('daily-protein-tracker-shell-')&&name!==CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  if(event.request.mode==='navigate') {
    event.respondWith((async()=>{
      try {
        const response=await fetch(event.request);
        if(response.ok){const cache=await caches.open(CACHE_NAME);
          await cache.put(new URL('./index.html',self.registration.scope).href,response.clone());}
        return response;
      }catch(e){return await caches.match('./index.html') || await caches.match('./') || Response.error();}
    })());
  } else {
    event.respondWith((async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      try {
        const response=await fetch(event.request);
        if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(event.request,response.clone());}
        return response;
      } catch(e) {return Response.error();}
    })());
  }
});
