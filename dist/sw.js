const PREFIX='gibdd:'+self.registration.scope+':';
const CACHE=PREFIX+'7bf15356ac81f9b159e4';
const CORE=['./','./index.html','./style.css','./app.js','./engine.js','./progress.js','./THIRD-PARTY-LICENSE.txt','./questions.json','./research.json','./manifest.webmanifest','./icon.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE.map(f=>new Request(new URL(f,self.registration.scope),{cache:'reload'})));
    const response=await cache.match('./questions.json');
    const questions=await response.json();
    const images=[...new Set(questions.filter(q=>q.image).map(q=>'./'+q.image))];
    for(let i=0;i<images.length;i+=20)await cache.addAll(images.slice(i,i+20).map(f=>new Request(new URL(f,self.registration.scope),{cache:'reload'})));
    // Новая версия вступает в силу после закрытия вкладок предыдущей.
  })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX) && key!==CACHE)await caches.delete(key);
  await self.clients.claim();
  for(const client of await self.clients.matchAll())client.postMessage('offline-ready');
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cached=await (await caches.open(CACHE)).match(event.request);
    if(cached)return cached;
    return fetch(event.request);
  })());
});
