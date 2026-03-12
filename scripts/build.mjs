import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { examCatalog } from "../data/practiceExams.mjs";
import { sourceAnalysis } from "../data/sourceAnalysis.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(distDir, "assets");

const buildMeta = {
  builtAt: new Date().toISOString(),
  examCount: examCatalog.exams.length,
  sourceCount: sourceAnalysis.sources.length
};

async function main() {
  await rm(distDir, { force: true, recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const indexTemplate = await readFile(path.join(srcDir, "index.html"), "utf8");
  const renderedIndex = indexTemplate.replace("__BUILD_DATE__", buildMeta.builtAt);

  await writeFile(path.join(distDir, "index.html"), renderedIndex, "utf8");
  await cp(path.join(srcDir, "styles.css"), path.join(distDir, "styles.css"));
  await cp(path.join(srcDir, "app.js"), path.join(distDir, "app.js"));
  await writeFile(
    path.join(assetsDir, "content.js"),
    [
      `export const buildMeta = ${JSON.stringify(buildMeta, null, 2)};`,
      `export const examCatalog = ${JSON.stringify(examCatalog, null, 2)};`,
      `export const sourceAnalysis = ${JSON.stringify(sourceAnalysis, null, 2)};`
    ].join("\n\n"),
    "utf8"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

