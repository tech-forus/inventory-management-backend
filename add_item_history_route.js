const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'inventory.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add import for itemHistoryController after rejectedItemReportController
content = content.replace(
    "const rejectedItemReportController = require('../controllers/rejectedItemReportController');",
    "const rejectedItemReportController = require('../controllers/rejectedItemReportController');\nconst itemHistoryController = require('../controllers/itemHistoryController');"
);

// Add route after short item reports routes  
content = content.replace(
    "router.get('/short-item-reports/:id', shortItemReportController.getShortItemReportById);",
    "router.get('/short-item-reports/:id', shortItemReportController.getShortItemReportById);\n\n// Item History Routes (Unified incoming + outgoing)\nrouter.get('/items/:skuId/history', itemHistoryController.getItemHistory);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Added item history routes successfully');
