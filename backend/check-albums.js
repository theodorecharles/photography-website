const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../gallery.db'));

console.log('Albums in database:');
const albums = db.prepare('SELECT name, published FROM albums ORDER BY name').all();
albums.forEach(a => console.log(`  - ${a.name} (published: ${a.published})`));

console.log(`\nTotal: ${albums.length} albums in database`);
db.close();
