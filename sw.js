/* owCacheActive —— 由 tools/patch_web_shell.py 自动生成，请勿手改 */
const OW_CACHE = 'ow-99126547fc74679e';
const OW_PRECACHE = [
	'./',
	'./index.html',
	'./index.js',
	'./index.wasm',
	'./index.pck',
	'./index.png',
	'./index.icon.png',
	'./index.apple-touch-icon.png',
	'./index.audio.worklet.js',
	'./index.audio.position.worklet.js',
	'./manifest.json',
];

self.addEventListener('install', (event) => {
	self.skipWaiting();
	event.waitUntil(precache());
});

// 串行缓存：一次下一个，内存和带宽都稳。
// 大文件（wasm）放最后，配额不够时小文件已经安全落盘。
async function precache() {
	const cache = await caches.open(OW_CACHE);
	for (const url of OW_PRECACHE) {
		try {
			const res = await fetch(new Request(url, { cache: 'reload' }));
			if (res && res.ok) { await cache.put(url, res); }
		} catch (err) {
			// 配额不足（iOS 对 Cache Storage 有上限）或正在离线：跳过这一个。
			// 最坏的后果只是「这次离线打不开」，在线一切照常。
		}
	}
}

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		const keys = await caches.keys();
		await Promise.all(keys.filter((k) => k.startsWith('ow-') && k !== OW_CACHE).map((k) => caches.delete(k)));
		await self.clients.claim();
	})());
});

// 只管同源 GET。联机用的 WebSocket 不经过 fetch 事件，所以在线对战完全不受影响。
self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') { return; }
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) { return; }
	if (url.pathname.endsWith('/sw.js')) { return; }
	event.respondWith(respond(req));
});

async function respond(req) {
	const cache = await caches.open(OW_CACHE);
	const hit = await cache.match(req);
	if (hit) { return hit; }
	if (req.mode === 'navigate') {
		const shell = await cache.match('./index.html');
		if (shell) { return shell; }
	}
	// 【只给导航请求兜底】没命中缓存又断网时，只有「打开页面」这件事值得用
	// 缓存里的 index.html 救回来；wasm / pck / js 失败就必须让它失败 ——
	// 拿一份 HTML 去冒充 wasm，引擎只会抛一个更难懂的错，反而不如老实报错。
	try {
		const res = await fetch(req);
		if (res && res.ok) { cache.put(req, res.clone()).catch(() => {}); }
		return res;
	} catch (err) {
		if (req.mode === 'navigate') {
			const shell = await cache.match('./index.html') || await cache.match('./');
			if (shell) { return shell; }
		}
		throw err;
	}
}
