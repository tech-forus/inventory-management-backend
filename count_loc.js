const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
                walk(filepath, callback);
            }
        } else if (file.match(/\.(js|ts|tsx|jsx)$/)) {
            callback(filepath);
        }
    }
};

const frontendDir = 'c:/Users/tech/Desktop/ForusBiz 2.1.1.1/inventory-management-fe/frontend/src';
const backendDir = 'c:/Users/tech/Desktop/ForusBiz 2.1.1.1/inventory-management-backend/src';

console.log('--- FRONTEND FILES > 500 LINES ---');
try {
    walk(frontendDir, (filepath) => {
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n').length;
        if (lines > 500) {
            console.log(`${path.relative(frontendDir, filepath)}: ${lines}`);
        }
    });
} catch (e) { console.error(e); }

console.log('\n--- BACKEND FILES > 500 LINES ---');
try {
    walk(backendDir, (filepath) => {
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.split('\n').length;
        if (lines > 500) {
            console.log(`${path.relative(backendDir, filepath)}: ${lines}`);
        }
    });
} catch (e) { console.error(e); }
