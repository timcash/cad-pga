import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false
});

export async function renderMarkdownFile(target, sourceUrl, options = {}) {
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/markdown, text/plain;q=0.9, */*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to load ${sourceUrl}: ${response.status}`);
  }

  const markdownSource = await response.text();
  target.innerHTML = `<article class="markdown-body">${markdown.render(markdownSource)}</article>`;
  enhanceRenderedMarkdown(target, options);
  return markdownSource;
}

export function enhanceRenderedMarkdown(target, options = {}) {
  const baseUrl = options.baseUrl || window.location.href;
  const links = target.querySelectorAll("a[href]");

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) {
      return;
    }

    if (href.startsWith("http://") || href.startsWith("https://")) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noreferrer");
      return;
    }

    try {
      const resolved = new URL(href, baseUrl);
      link.href = resolved.toString();
    } catch {
      // Leave malformed links untouched.
    }
  });
}

export async function loadPrismComponents() {
  try {
    await Promise.all([
      import("prismjs/components/prism-bash"),
      import("prismjs/components/prism-javascript"),
      import("prismjs/components/prism-markup")
    ]);
  } catch (error) {
    console.error("Prism components failed to load:", error);
  }
}
