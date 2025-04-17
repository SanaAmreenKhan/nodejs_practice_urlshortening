import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { json } from "stream/consumers";

const PORT = "3000";
const DATA_FILE = path.join("data", "links.json");

const serverFile = async (res, file, type) => {
  try {
    const data = await readFile(path.join("public", file));
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 page not found");
  }
};

const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw err;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links), "utf-8");
};

const server = createServer(async (req, res) => {
  if (req.method === "GET") {
    if (req.url === "/") {
      return serverFile(res, "index.html", "text/html");
    } else if (req.url === "/style.css") {
      return serverFile(res, "style.css", "text/css");
    } else if (req.url === "/links") {
      const file = await loadLinks();

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(file));
    } else {
      const links = await loadLinks();
      const shortCode = req.url.slice(1);
      if (links[shortCode]) {
        res.writeHead(302, { location: links[shortCode] });
        return res.end();
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Shortened URL Not found");
    }
  }

  if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadLinks();
    let body = "";
    req.on("data", (resp) => (body += resp));
    req.on("end", async () => {
      const { url, shortCode } = JSON.parse(body);
      console.log("hiiiii", url, shortCode);

      if (!url) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("URL is required");
      }
      const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");
      if (links[finalShortCode]) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("Short code already exist , please choose another.");
      }
      links[finalShortCode] = url;
      await saveLinks(links);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
    });
  }
});

server.listen(PORT, () => {
  console.log("server running at https://localhost");
});
