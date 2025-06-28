import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.join(__dirname, '..', 'build');

function fixImportsInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Fix relative imports to include .js extension
        content = content.replace(
            /from ['"](\.[^'"]*)['"]/g,
            (match, importPath) => {
                if (importPath.endsWith('.js')) {
                    return match;
                }
                return `from '${importPath}.js'`;
            }
        );
        
        fs.writeFileSync(filePath, content);
        console.log(`Fixed imports in: ${filePath}`);
    } catch (error) {
        console.error(`Error fixing imports in ${filePath}:`, error);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (file.endsWith('.js')) {
            fixImportsInFile(filePath);
        }
    }
}

console.log('Fixing import statements in build files...');
processDirectory(buildDir);
console.log('Import statements fixed successfully!'); 