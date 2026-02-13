const express = require('express');
const cors = require('cors');
const skuTestRoute = require('./sku_params_test_route');

const app = express();
const PORT = 5001; // Run on a different port than main app

app.use(cors());
app.use(express.json());

// Mount the test route
app.use('/api/test', skuTestRoute);

app.listen(PORT, () => {
    console.log(`Test API Server running on port ${PORT}`);
    console.log(`Endpoint available at http://localhost:${PORT}/api/test/skus`);
});
