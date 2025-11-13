#!/usr/bin/env node
/**
 * Interface Scanner
 * Finds all interface definitions in TypeScript/TSX files
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_SRC = path.join(__dirname, 'frontend/src');
const OUTPUT_FILE = path.join(__dirname, 'INTERFACE_SCAN.md');

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

function scanInterfaces(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(__dirname, filePath);
  const lines = content.split('\n');
  const interfaces = [];
  
  let inInterface = false;
  let currentInterface = {
    name: '',
    startLine: 0,
    endLine: 0,
    lines: [],
    exported: false,
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Start of interface: interface Name or export interface Name
    const interfaceMatch = trimmed.match(/^(export\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    
    if (interfaceMatch && !inInterface) {
      inInterface = true;
      currentInterface = {
        name: interfaceMatch[2],
        startLine: i + 1,
        endLine: i + 1,
        lines: [line],
        exported: !!interfaceMatch[1],
      };
      
      // Check if it's a single-line interface (rare but possible)
      if (trimmed.includes('{') && trimmed.includes('}')) {
        interfaces.push({ ...currentInterface });
        inInterface = false;
      }
    } else if (inInterface) {
      currentInterface.lines.push(line);
      currentInterface.endLine = i + 1;
      
      // Check for end of interface
      // Simple heuristic: line starts with } (accounting for indentation)
      if (trimmed === '}' || trimmed.startsWith('}')) {
        interfaces.push({ ...currentInterface });
        inInterface = false;
      }
    }
  }
  
  return interfaces.length > 0 ? {
    file: relativePath,
    interfaces: interfaces
  } : null;
}

function categorizeInterfaces(results) {
  const categories = {
    types: [],        // Already in types.ts files
    props: [],        // Component props interfaces
    state: [],        // State/data interfaces
    api: [],          // API response interfaces
    util: [],         // Utility interfaces
    misc: [],         // Miscellaneous
  };
  
  results.forEach(result => {
    result.interfaces.forEach(iface => {
      const entry = {
        name: iface.name,
        file: result.file,
        startLine: iface.startLine,
        endLine: iface.endLine,
        exported: iface.exported,
        lineCount: iface.lines.length,
      };
      
      // Categorize based on file path and interface name
      if (result.file.includes('types.ts')) {
        categories.types.push(entry);
      } else if (iface.name.endsWith('Props')) {
        categories.props.push(entry);
      } else if (iface.name.includes('State') || iface.name.includes('Config')) {
        categories.state.push(entry);
      } else if (iface.name.includes('Response') || iface.name.includes('Request') || iface.name.includes('Data')) {
        categories.api.push(entry);
      } else if (result.file.includes('utils/') || result.file.includes('helpers/')) {
        categories.util.push(entry);
      } else {
        categories.misc.push(entry);
      }
    });
  });
  
  return categories;
}

function generateMarkdown(results, categories) {
  let markdown = '# Interface Scan Report\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  
  const totalFiles = results.length;
  const totalInterfaces = results.reduce((sum, r) => sum + r.interfaces.length, 0);
  
  markdown += `**Files with Interfaces**: ${totalFiles}\n`;
  markdown += `**Total Interfaces Found**: ${totalInterfaces}\n\n`;
  
  markdown += '## Summary by Category\n\n';
  markdown += `- **Already in types.ts files**: ${categories.types.length}\n`;
  markdown += `- **Component Props**: ${categories.props.length}\n`;
  markdown += `- **State/Config**: ${categories.state.length}\n`;
  markdown += `- **API/Data**: ${categories.api.length}\n`;
  markdown += `- **Utilities**: ${categories.util.length}\n`;
  markdown += `- **Miscellaneous**: ${categories.misc.length}\n\n`;
  
  markdown += '---\n\n';
  
  // Detailed breakdown by category
  Object.entries(categories).forEach(([category, interfaces]) => {
    if (interfaces.length === 0) return;
    
    const categoryNames = {
      types: 'Already in types.ts Files',
      props: 'Component Props Interfaces',
      state: 'State/Config Interfaces',
      api: 'API/Data Interfaces',
      util: 'Utility Interfaces',
      misc: 'Miscellaneous Interfaces',
    };
    
    markdown += `## ${categoryNames[category]} (${interfaces.length})\n\n`;
    
    interfaces.forEach(iface => {
      markdown += `### \`${iface.name}\` ${iface.exported ? '(exported)' : '(local)'}\n`;
      markdown += `- **File**: \`${iface.file}\`\n`;
      markdown += `- **Lines**: ${iface.startLine}-${iface.endLine} (${iface.lineCount} lines)\n`;
      markdown += '\n';
    });
    
    markdown += '---\n\n';
  });
  
  // Detailed file-by-file breakdown
  markdown += '## Detailed File-by-File Breakdown\n\n';
  
  results.sort((a, b) => a.file.localeCompare(b.file)).forEach(result => {
    markdown += `### File: \`${result.file}\`\n\n`;
    markdown += `**Interfaces found:** ${result.interfaces.length}\n\n`;
    
    result.interfaces.forEach((iface, idx) => {
      markdown += `#### ${idx + 1}. \`${iface.name}\` ${iface.exported ? '✓ exported' : '✗ local'}\n`;
      markdown += `Lines ${iface.startLine}-${iface.endLine}\n\n`;
      markdown += '```typescript\n';
      markdown += iface.lines.join('\n');
      markdown += '\n```\n\n';
    });
    
    markdown += '---\n\n';
  });
  
  return markdown;
}

// Main execution
console.log('🔍 Scanning for interface definitions...');
const files = findTsxTsFiles(FRONTEND_SRC);
console.log(`Found ${files.length} TypeScript/TSX files`);

const results = [];
files.forEach(file => {
  const result = scanInterfaces(file);
  if (result) {
    results.push(result);
  }
});

const categories = categorizeInterfaces(results);
const markdown = generateMarkdown(results, categories);
fs.writeFileSync(OUTPUT_FILE, markdown);

const totalInterfaces = results.reduce((sum, r) => sum + r.interfaces.length, 0);
console.log(`\n✅ Scan complete: ${OUTPUT_FILE}`);
console.log(`📊 Found ${totalInterfaces} interfaces across ${results.length} files\n`);
console.log('Category breakdown:');
console.log(`  - Already in types.ts: ${categories.types.length}`);
console.log(`  - Component Props: ${categories.props.length}`);
console.log(`  - State/Config: ${categories.state.length}`);
console.log(`  - API/Data: ${categories.api.length}`);
console.log(`  - Utilities: ${categories.util.length}`);
console.log(`  - Miscellaneous: ${categories.misc.length}\n`);

