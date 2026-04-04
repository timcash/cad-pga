import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";

type ScreenshotSpec = {
  fileName: string;
  path: string;
  viewport: { width: number; height: number };
  waitMs?: number;
  prepare?: (page: Page) => Promise<void>;
};

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = resolve(rootDir, "dist");
const screenshotDir = resolve(rootDir, "docs", "screenshots");
const headed = process.argv.includes("--headed");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const screenshots: ScreenshotSpec[] = [
  {
    fileName: "library-home.png",
    path: "/",
    viewport: { width: 430, height: 932 },
    waitMs: 2200
  },
  {
    fileName: "mesh-cleanup.png",
    path: "/mesh-cleanup/",
    viewport: { width: 430, height: 932 },
    waitMs: 2200,
    prepare: ensureDetailsClosed
  },
  {
    fileName: "cnc-kernel-simulator.png",
    path: "/cnc-kernel-simulator/",
    viewport: { width: 430, height: 932 },
    waitMs: 3200,
    prepare: ensureDetailsClosed
  },
  {
    fileName: "gear-rotation-linkage.png",
    path: "/gear-rotation-linkage/",
    viewport: { width: 430, height: 932 },
    waitMs: 700,
    prepare: ensureDetailsClosed
  },
  {
    fileName: "meshless-fea-wos.png",
    path: "/meshless-fea-wos/",
    viewport: { width: 430, height: 932 },
    waitMs: 4200,
    prepare: ensureDetailsClosed
  },
  {
    fileName: "mobile-menu.png",
    path: "/mesh-cleanup/",
    viewport: { width: 430, height: 932 },
    waitMs: 1600,
    prepare: async (page) => {
      await page.click('button[data-demo-toggle="menu"]');
      await delay(350);
    }
  }
];

const browser = await puppeteer.launch({
  headless: headed ? false : true,
  defaultViewport: null
});

try {
  await mkdir(screenshotDir, { recursive: true });
  const server = createStaticServer(distDir);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  for (const shot of screenshots) {
    await captureShot(browser, baseUrl, shot);
  }

  server.close();
} finally {
  await browser.close();
}

async function captureShot(browser: Browser, baseUrl: string, shot: ScreenshotSpec) {
  const page = await browser.newPage();
  try {
    await page.setBypassServiceWorker(true);
    await page.setViewport(shot.viewport);
    await page.goto(`${baseUrl}${shot.path}`, { waitUntil: "networkidle0" });
    await waitForStableUi(page);
    await waitForMathIfNeeded(page);

    if (shot.prepare) {
      await shot.prepare(page);
    }

    await delay(shot.waitMs ?? 1000);
    await page.screenshot({
      path: resolve(screenshotDir, shot.fileName),
      fullPage: false
    });
    console.log(`Captured ${shot.fileName}`);
  } finally {
    await page.close();
  }
}

async function waitForStableUi(page: Page) {
  const selectors = [
    "main.page-shell",
    "canvas",
    "svg",
    ".cad-pga-thumb-button",
    "#scene"
  ];

  await Promise.any(
    selectors.map((selector) =>
      page.waitForSelector(selector, {
        timeout: 8000
      })
    )
  );
}

async function waitForMathIfNeeded(page: Page) {
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const isDocsPage = !!document.querySelector("main.page-shell");
    if (!isDocsPage) {
      return true;
    }

    return root.classList.contains("docs-enhanced") &&
      !root.classList.contains("math-loading") &&
      !root.classList.contains("demo-math-loading");
  }, { timeout: 20000 }).catch(() => undefined);
}

function createStaticServer(rootPath: string) {
  return createServer(async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const filePath = await resolveRequestPath(rootPath, request.url || "/");
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

async function resolveRequestPath(rootPath: string, requestUrl: string) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const cleanedPath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, "");
  const relativePath = cleanedPath === "/" ? "index.html" : cleanedPath.slice(1);

  const directFile = join(rootPath, relativePath);
  if (await exists(directFile)) {
    const directStats = await stat(directFile);
    if (directStats.isDirectory()) {
      return join(directFile, "index.html");
    }
    return directFile;
  }

  const withIndex = join(rootPath, relativePath, "index.html");
  if (await exists(withIndex)) {
    return withIndex;
  }

  throw new Error(`Missing asset for ${requestUrl}`);
}

async function exists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function listen(server: ReturnType<typeof createServer>) {
  return new Promise<number>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        rejectPromise(new Error("Unable to determine local server port."));
        return;
      }
      resolvePromise(address.port);
    });
  });
}

function delay(ms: number) {
  return new Promise<void>((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

async function ensureDetailsClosed(page: Page) {
  const detailsOpen = await page.evaluate(() =>
    document.body.classList.contains("cad-pga-details-open")
  );

  if (detailsOpen) {
    const button = await page.$('button[data-demo-toggle="details"]');
    if (button) {
      await button.click();
      await delay(250);
    }
  }

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}
