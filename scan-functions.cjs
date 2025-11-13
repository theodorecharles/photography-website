#!/usr/bin/env node
/**
 * Function Scanner
 * Scans all .tsx files and detects functions for extraction analysis
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_SRC = path.join(__dirname, 'frontend/src');
const OUTPUT_FILE = path.join(__dirname, 'FUNCTION_EXTRACTION_CHECKLIST.md');

// Patterns to match function declarations
const FUNCTION_PATTERNS = [
  // const functionName = () => {}
  /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g,
  // const functionName = function() {}
  /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?function\s*\([^)]*\)/g,
  // function functionName() {}
  /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/g,
];

function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, build dirs, etc
      if (!['node_modules', 'dist', 'build', '.next', 'coverage'].includes(file)) {
        findTsxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function extractFunctions(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(__dirname, filePath);
  const functions = new Set();
  
  // Apply each pattern
  FUNCTION_PATTERNS.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const funcName = match[1];
      // Filter out React components (start with uppercase)
      if (funcName && !/^[A-Z]/.test(funcName)) {
        functions.add(funcName);
      }
    }
  });
  
  return Array.from(functions).map(name => ({
    name,
    file: relativePath,
    line: findLineNumber(content, name)
  }));
}

function findLineNumber(content, funcName) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`const ${funcName}`) || 
        lines[i].includes(`function ${funcName}`)) {
      return i + 1;
    }
  }
  return 0;
}

function generateMarkdown(functionsByFile) {
  let markdown = '# Function Extraction Checklist\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `**Total Files:** ${Object.keys(functionsByFile).length}\n`;
  
  const totalFunctions = Object.values(functionsByFile).reduce((sum, funcs) => sum + funcs.length, 0);
  markdown += `**Total Functions Found:** ${totalFunctions}\n\n`;
  markdown += '---\n\n';
  
  // Group by directory
  const filesByDir = {};
  Object.keys(functionsByFile).sort().forEach(file => {
    const dir = path.dirname(file);
    if (!filesByDir[dir]) filesByDir[dir] = [];
    filesByDir[dir].push(file);
  });
  
  Object.keys(filesByDir).sort().forEach(dir => {
    markdown += `## Directory: \`${dir}\`\n\n`;
    
    filesByDir[dir].forEach(file => {
      const functions = functionsByFile[file];
      if (functions.length === 0) return;
      
      markdown += `### File: \`${path.basename(file)}\`\n`;
      markdown += `Path: \`${file}\`\n\n`;
      
      functions.forEach(func => {
        markdown += `- [ ] **${func.name}** (line ${func.line})\n`;
      });
      
      markdown += '\n';
    });
  });
  
  return markdown;
}

// Main execution
console.log('🔍 Scanning for functions in .tsx files...');
const tsxFiles = findTsxFiles(FRONTEND_SRC);
console.log(`Found ${tsxFiles.length} .tsx files`);

const functionsByFile = {};
tsxFiles.forEach(file => {
  const functions = extractFunctions(file);
  if (functions.length > 0) {
    functionsByFile[path.relative(__dirname, file)] = functions;
  }
});

const markdown = generateMarkdown(functionsByFile);
fs.writeFileSync(OUTPUT_FILE, markdown);

console.log(`\n✅ Checklist created: ${OUTPUT_FILE}`);
console.log(`📊 Found ${Object.values(functionsByFile).reduce((sum, funcs) => sum + funcs.length, 0)} functions across ${Object.keys(functionsByFile).length} files\n`);

