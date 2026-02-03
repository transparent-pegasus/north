const fs = require("fs");
const { marked } = require("marked");
const path = require("path");

// Configuration
const DOCS_DIR = path.join(__dirname, "..", "docs", "releases");
const OUTPUT_DIR = path.join(__dirname, "..", "frontend", "public", "releases");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// HTML Template
const template = (title, content) => `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background-color: #f9fafb;
    }
    .container {
      background-color: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1, h2, h3 { color: #111; }
    h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 0.5rem; }
    h2 { margin-top: 2rem; border-bottom: 1px solid #eaeaea; padding-bottom: 0.3rem; }
    ul { padding-left: 1.5rem; }
    code { background-color: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;

// Process files
try {
  const files = fs.readdirSync(DOCS_DIR);

  files.forEach((file) => {
    if (path.extname(file) === ".md") {
      const filePath = path.join(DOCS_DIR, file);
      const content = fs.readFileSync(filePath, "utf8");
      const htmlContent = marked(content);
      const title = file.replace(".md", "");

      const outputPath = path.join(OUTPUT_DIR, `${title}.html`);

      fs.writeFileSync(outputPath, template(title, htmlContent));
      console.log(`Generated: ${outputPath}`);
    }
  });
  console.log("Release notes generation complete.");
} catch (err) {
  console.error("Error generating release notes:", err);
  process.exit(1);
}
