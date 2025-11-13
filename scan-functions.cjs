#!/usr/bin/env node

/**
 * Scans all .tsx files for function definitions and creates a markdown checklist
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_FILE = 'FUNCTION_EXTRACTION_CHECKLIST.md';

// Find all .tsx files
const tsxFiles = execSync(
  'find frontend/src -name "*.tsx" -type f',
  { encoding: 'utf-8', cwd: process.cwd() }
)
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${tsxFiles.length} .tsx files to scan`);

const functions = [];

// Regex patterns to match function declarations
const patterns = [
  // function declarations: function name() {}
  /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm,
  // arrow functions assigned to const: const name = () => {}
  /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm,
  // arrow functions with explicit types: const name: Type = () => {}
  /^\s*(?:export\s+)?const\s+(\w+)\s*:\s*[^=]+=\s*(?:async\s+)?\([^)]*\)\s*=>/gm,
];

tsxFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      const matches = [...line.matchAll(pattern)];
      matches.forEach((match) => {
        const functionName = match[1];
        // Skip React component names (start with uppercase) and common hooks
        if (
          functionName &&
          !functionName.match(/^[A-Z]/) && // Skip components
          !functionName.match(/^use[A-Z]/) // Skip custom hooks
        ) {
          functions.push({
            name: functionName,
            file: file,
            line: index + 1,
            code: line.trim(),
          });
        }
      });
    });
  });
});

console.log(`Found ${functions.length} functions`);

// Group by file
const functionsByFile = {};
functions.forEach((fn) => {
  if (!functionsByFile[fn.file]) {
    functionsByFile[fn.file] = [];
  }
  functionsByFile[fn.file].push(fn);
});

// Generate markdown
let markdown = `# Function Extraction Checklist\n\n`;
markdown += `**Total Functions Found:** ${functions.length}\n`;
markdown += `**Total Files:** ${Object.keys(functionsByFile).length}\n\n`;
markdown += `---\n\n`;

Object.keys(functionsByFile)
  .sort()
  .forEach((file) => {
    markdown += `## \`${file}\`\n\n`;
    functionsByFile[file].forEach((fn) => {
      markdown += `- [ ] **${fn.name}** (line ${fn.line})\n`;
      markdown += `  \`\`\`${fn.line}:${fn.line}:${fn.file}\n`;
      markdown += `  ${fn.code}\n`;
      markdown += `  \`\`\`\n\n`;
    });
    markdown += `---\n\n`;
  });

fs.writeFileSync(OUTPUT_FILE, markdown);
console.log(`\n✅ Checklist written to ${OUTPUT_FILE}`);
console.log(`\nRun: cat ${OUTPUT_FILE} | head -50`);

