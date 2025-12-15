# Backend Structure

This document describes the organized backend structure.

## Directory Structure

```
BACKEND/
├── config/              # Configuration files
│   ├── database.js     # Database configuration
│   └── jwt.js          # JWT configuration
│
├── controllers/        # Request handlers (business logic)
│   ├── authController.js
│   ├── companyController.js
│   └── onboardingController.js
│
├── database/           # Database related files
│   ├── migrations/     # Database migration files
│   ├── seeds/          # Database seed files
│   ├── config.js       # (Legacy - use config/database.js)
│   └── migrate.js      # Migration runner
│
├── middleware/         # Express middleware
│   ├── auth.js         # Authentication middleware
│   ├── errorHandler.js # Error handling middleware
│   └── upload.js       # File upload middleware
│
├── models/             # Database models
│   └── database.js     # Database connection pool
│
├── routes/              # API route definitions
│   ├── auth.js
│   ├── companies.js
│   ├── library.js
│   ├── onboarding.js
│   └── skus.js
│
├── services/            # Business logic services (for future use)
│
├── utils/               # Utility functions
│   ├── companyIdGenerator.js
│   ├── skuIdGenerator.js
│   └── helpers.js       # General helper functions
│
└── server.js            # Main application entry point
```

## Architecture Overview

### Config (`config/`)
- **database.js**: Database connection configuration
- **jwt.js**: JWT token configuration

### Controllers (`controllers/`)
- Handle HTTP requests and responses
- Contain business logic for specific routes
- Interact with models/services

### Middleware (`middleware/`)
- **auth.js**: JWT authentication and company ID extraction
- **errorHandler.js**: Centralized error handling
- **upload.js**: File upload configuration (Multer)

### Models (`models/`)
- **database.js**: PostgreSQL connection pool singleton

### Routes (`routes/`)
- Define API endpoints
- Map routes to controllers
- Apply middleware

### Services (`services/`)
- Reserved for complex business logic
- Can be used to separate business logic from controllers

### Utils (`utils/`)
- Reusable utility functions
- ID generators
- Helper functions

## Migration Notes

### Updated Imports

**Old:**
```javascript
const dbConfig = require('../database/config');
```

**New:**
```javascript
const dbConfig = require('../config/database');
// OR
const pool = require('../models/database');
```

### Using Middleware

**Old:**
```javascript
// Manual JWT verification in routes
const token = authHeader.substring(7);
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

**New:**
```javascript
const { authenticate, getCompanyId } = require('../middleware/auth');
router.get('/protected', authenticate, controller.method);
```

### Error Handling

**Old:**
```javascript
// Manual error handling in each route
catch (error) {
  res.status(500).json({ error: error.message });
}
```

**New:**
```javascript
// Centralized error handling
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);
```

## Next Steps

1. **Refactor library.js**: Extract controllers for library routes
2. **Refactor skus.js**: Extract controllers for SKU routes
3. **Create services**: Move complex business logic to services
4. **Add validation**: Create validation middleware
5. **Add logging**: Create logging middleware

## Benefits

- **Separation of Concerns**: Clear separation between routes, controllers, and business logic
- **Reusability**: Middleware and utilities can be reused across routes
- **Maintainability**: Easier to find and modify code
- **Testability**: Controllers and services can be tested independently
- **Scalability**: Easy to add new features following the same structure


