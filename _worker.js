// Cloudflare Pages 高级模式 Worker：把预压缩的 wasm 解出来再交给边缘压缩。
// 不要在这里自己声明 Content-Encoding —— 边缘会再压一层，导致前端拿到 gzip 垃圾。
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/index.wasm") {
      const asset = await env.ASSETS.fetch(new URL("/index.wasm.gz", url.origin));
      if (!asset.ok || !asset.body) {
        return new Response("wasm asset missing", { status: 502 });
      }
      const decoded = asset.body.pipeThrough(new DecompressionStream("gzip"));
      return new Response(decoded, {
        headers: {
          "Content-Type": "application/wasm",
          "Cache-Control": "public, max-age=604800",
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
