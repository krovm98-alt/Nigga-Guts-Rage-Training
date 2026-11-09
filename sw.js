const CACHE='guts-rage-v4-audit';
const ASSETS=['./','./index.html','./push.html','./pull.html','./legs.html','./pwa.js','./home.js','./analytics.html','./analytics.js','./progression.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('guts-rage-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const respond=async()=>{const cache=await caches.open(CACHE);
  if(req.mode==='navigate'){try{const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res}catch{return (await cache.match(req))||(await cache.match('./index.html'))||Response.error()}}
  const stored=await cache.match(req);if(stored)return stored;
  try{const res=await fetch(req);if(res.ok)await cache.put(req,res.clone());return res}catch{return Response.error()}
 };e.respondWith(respond());
});
