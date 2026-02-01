#!/usr/bin/env node

/**
 * Performance Check Script
 * Run with: node scripts/performance-check.js
 */

import fs from "fs";
import path from "path";

console.log("🔍 Running performance checks...\n");

// Check bundle sizes
console.log("📦 Checking for large dependencies...");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const largeDeps = ["lodash", "moment", "jquery", "bootstrap", "material-ui", "antd"];

const foundLargeDeps = Object.keys(packageJson.dependencies || {}).filter((dep) =>
  largeDeps.includes(dep)
);

if (foundLargeDeps.length > 0) {
  console.warn("⚠️  Large dependencies found:", foundLargeDeps.join(", "));
  console.warn("   Consider using smaller alternatives\n");
} else {
  console.log("✅ No unnecessarily large dependencies found\n");
}

// Check for unoptimized images in public folder
console.log("🖼️  Checking for unoptimized images...");
const publicDir = path.join(process.cwd(), "public");

function checkImageSizes(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const largeImages = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      largeImages.push(...checkImageSizes(fullPath));
    } else if (/\.(jpg|jpeg|png|gif)$/i.test(file.name)) {
      const stats = fs.statSync(fullPath);
      const sizeInMB = stats.size / (1024 * 1024);
      if (sizeInMB > 0.5) {
        largeImages.push({
          path: fullPath.replace(process.cwd(), ""),
          size: sizeInMB.toFixed(2),
        });
      }
    }
  }

  return largeImages;
}

if (fs.existsSync(publicDir)) {
  const largeImages = checkImageSizes(publicDir);
  if (largeImages.length > 0) {
    console.warn("⚠️  Large images found (>500KB):");
    largeImages.forEach((img) => {
      console.warn(`   ${img.path} (${img.size} MB)`);
    });
    console.warn("   Consider optimizing these images\n");
  } else {
    console.log("✅ All images are reasonably sized\n");
  }
}

// Check for console.logs in production code
console.log("🐛 Checking for console.log statements...");
function findConsoleLogs(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const filesWithConsole = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory() && !file.name.startsWith(".") && file.name !== "node_modules") {
      filesWithConsole.push(...findConsoleLogs(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/i.test(file.name)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const matches = content.match(/console\.(log|warn|error)/g);
      if (matches && matches.length > 0) {
        filesWithConsole.push({
          path: fullPath.replace(process.cwd(), ""),
          count: matches.length,
        });
      }
    }
  }

  return filesWithConsole;
}

const srcDir = path.join(process.cwd(), "src");
if (fs.existsSync(srcDir)) {
  const filesWithConsole = findConsoleLogs(srcDir);
  if (filesWithConsole.length > 0) {
    console.warn(`⚠️  Found console statements in ${filesWithConsole.length} files`);
    console.warn("   These will be removed in production builds\n");
  } else {
    console.log("✅ No console statements found\n");
  }
}

console.log("✅ Performance check complete!\n");
console.log("💡 Tips:");
console.log("   - Run 'npm run build' to check bundle sizes");
console.log("   - Use Lighthouse for detailed performance audits");
console.log("   - Test on slower devices and networks");
