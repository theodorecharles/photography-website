import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'gallery.db'));

console.log('Albums in database:');
const albums = db.prepare('SELECT name, published FROM albums ORDER BY name').all();
albums.forEach(a => console.log(`  - ${a.name} (published: ${a.published})`));

console.log(`\nTotal: ${albums.length} albums in database`);
db.close();
