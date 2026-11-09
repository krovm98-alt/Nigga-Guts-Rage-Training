if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const b=document.getElementById('install');if(b)b.style.display='block'});
window.addEventListener('appinstalled',()=>{installPrompt=null;const b=document.getElementById('install');if(b)b.style.display='none'});
window.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('install');if(b)b.onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null}else alert('В меню Chrome выбери «Установить приложение» или «Добавить на главный экран».')}});
