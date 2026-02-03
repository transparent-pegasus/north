const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// puppeteer.use(StealthPlugin()); // Not needed for local icon gen if using standard puppeteer

(async () => {
  const svgPath = path.resolve(__dirname, "../../frontend/app/icon.svg");
  const outDir = path.resolve(__dirname, "../../frontend/public");

  if (!fs.existsSync(svgPath)) {
    console.error("Icon SVG not found at:", svgPath);
    process.exit(1);
  }

  const svgContent = fs.readFileSync(svgPath, "utf8");
  const base64Svg = Buffer.from(svgContent).toString("base64");
  const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
  });

  const page = await browser.newPage();

  await page.setViewport({ deviceScaleFactor: 1, height: 512, width: 512 });

  const htmlContent = `
        <html>
            <body style="margin: 0; padding: 0; overflow: hidden; background: white;">
                <img src="${dataUrl}" width="512" height="512" style="display: block;" />
            </body>
        </html>
    `;

  await page.setContent(htmlContent);

  // Save icon-512.png
  await page.screenshot({
    path: path.join(outDir, "icon-512.png"),
    type: "png",
  });
  console.log("Generated icon-512.png");

  // Save icon-maskable-512.png
  await page.screenshot({
    path: path.join(outDir, "icon-maskable-512.png"),
    type: "png",
  });
  console.log("Generated icon-maskable-512.png");

  await browser.close();
})();
