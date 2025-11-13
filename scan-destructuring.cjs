#!/usr/bin/env node
/**
 * Destructuring Assignment Scanner
 * Finds all multi-line destructuring assignments in TypeScript/JavaScript files
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_SRC = path.join(__dirname, 'frontend/src');
const OUTPUT_FILE = path.join(__dirname, 'DESTRUCTURING_SCAN.md');

function findTsxTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.next', 'coverage'].includes(file)) {
        findTsxTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function scanDestructuring(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(__dirname, filePath);
  const lines = content.split('\n');
  const destructuringBlocks = [];
  
  let inDestructuring = false;
  let currentBlock = {
    startLine: 0,
    endLine: 0,
    lines: [],
    source: '',
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Start of destructuring: const { or const [
    if (!inDestructuring && (trimmed.match(/^const\s*\{/) || trimmed.match(/^const\s*\[/))) {
      inDestructuring = true;
      currentBlock = {
        startLine: i + 1,
        endLine: i + 1,
        lines: [line],
        source: '',
      };
      
      // Check if it's a single-line destructuring
      if (trimmed.includes('=') && trimmed.includes(';')) {
        // Extract source
        const match = trimmed.match(/=\s*(.+?);/);
        if (match) {
          currentBlock.source = match[1].trim();
        }
        // Only include if it's multi-property (more than one comma or spans multiple lines visually)
        const propCount = (trimmed.match(/,/g) || []).length + 1;
        if (propCount >= 3) {
          currentBlock.endLine = i + 1;
          destructuringBlocks.push({ ...currentBlock });
        }
        inDestructuring = false;
      }
    } else if (inDestructuring) {
      currentBlock.lines.push(line);
      currentBlock.endLine = i + 1;
      
      // Extract source from lines with =
      if (line.includes('=') && !currentBlock.source) {
        const match = line.match(/=\s*(.+?)(?:;|$)/);
        if (match) {
          currentBlock.source = match[1].trim();
        }
      }
      
      // End of destructuring: } = or ] =
      if (trimmed.match(/^\}\s*=/) || trimmed.match(/^\]\s*=/)) {
        // Extract source if not already found
        if (!currentBlock.source) {
          const match = line.match(/=\s*(.+?)(?:;|$)/);
          if (match) {
            currentBlock.source = match[1].trim();
          }
        }
        
        // Only include blocks with 3+ lines
        if (currentBlock.lines.length >= 3) {
          destructuringBlocks.push({ ...currentBlock });
        }
        inDestructuring = false;
      }
    }
  }
  
  return destructuringBlocks.length > 0 ? {
    file: relativePath,
    blocks: destructuringBlocks
  } : null;
}

function generateMarkdown(results) {
  let markdown = '# Destructuring Assignment Scan Report\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  
  const totalFiles = results.length;
  const totalBlocks = results.reduce((sum, r) => sum + r.blocks.length, 0);
  
  markdown += `**Files with Destructuring**: ${totalFiles}\n`;
  markdown += `**Total Destructuring Blocks**: ${totalBlocks}\n\n`;
  markdown += '---\n\n';
  
  results.forEach(result => {
    markdown += `## File: \`${result.file}\`\n\n`;
    markdown += `**Blocks found:** ${result.blocks.length}\n\n`;
    
    result.blocks.forEach((block, idx) => {
      markdown += `### Block ${idx + 1} (lines ${block.startLine}-${block.endLine})\n\n`;
      markdown += `**Source:** \`${block.source || 'unknown'}\`\n\n`;
      markdown += '```typescript\n';
      markdown += block.lines.join('\n');
      markdown += '\n```\n\n';
    });
    
    markdown += '---\n\n';
  });
  
  return markdown;
}

// Main execution
console.log('🔍 Scanning for destructuring assignments...');
const files = findTsxTsFiles(FRONTEND_SRC);
console.log(`Found ${files.length} TypeScript/TSX files`);

const results = [];
files.forEach(file => {
  const result = scanDestructuring(file);
  if (result) {
    results.push(result);
  }
});

const markdown = generateMarkdown(results);
fs.writeFileSync(OUTPUT_FILE, markdown);

console.log(`\n✅ Scan complete: ${OUTPUT_FILE}`);
console.log(`📊 Found ${results.reduce((sum, r) => sum + r.blocks.length, 0)} destructuring blocks across ${results.length} files\n`);

