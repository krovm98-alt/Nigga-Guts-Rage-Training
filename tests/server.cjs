const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const prefix = "/Nigga-Guts-Rage-Training/";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
let revision = 1;
http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith(prefix)) {
      res.writeHead(404).end();
      return;
    }
    if (url.pathname === prefix + "__test_revision") {
      revision = Number(url.searchParams.get("v")) || 1;
      res.end("ok");
      return;
    }
    const file = path.resolve(
      root,
      decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html",
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      if (file.endsWith("sw.js"))
        data = Buffer.from(
          data
            .toString()
            .replace("v5-production-1", "v5-production-test-" + revision),
        );
      res.end(data);
    });
  })
  .listen(8765, "127.0.0.1");
