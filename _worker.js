// Cloudflare Pages 高级模式 Worker：修正 gzip wasm 的投递头。
// 站点其余资源交给静态资产处理器。
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/index.wasm") {
      const asset = await env.ASSETS.fetch(new URL("/index.wasm.gz", url.origin));
      if (!asset.ok) {
        return new Response("wasm asset missing", { status: 502 });
      }
      return new Response(asset.body, {
        headers: {
          "Content-Type": "application/wasm",
          "Content-Encoding": "gzip",
          "Cache-Control": "public, max-age=604800",
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
