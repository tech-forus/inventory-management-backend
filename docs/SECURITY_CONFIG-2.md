# Security Configuration Guide

## Environment Variables

### Required for Production

```env
# CORS Configuration
# Comma-separated list of allowed origins
# Example: http://localhost:3000,https://yourdomain.com,https://app.yourdomain.com
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://inventory-management-frontend-1ip7hw67t-tech-forus-projects.vercel.app

# Node Environment
NODE_ENV=production
```

### Development

In development, if `CORS_ORIGINS` is not set or empty, all origins are allowed for easier development.

In production, `CORS_ORIGINS` must be configured or the server will reject all requests.

## Security Features

### 1. Helmet.js
- Automatically sets security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security` (HSTS)
  - And more...

### 2. CORS Configuration
- **Development**: Allows all origins if `CORS_ORIGINS` is not set
- **Production**: Only allows origins specified in `CORS_ORIGINS`
- Supports credentials (cookies, authorization headers)

### 3. Rate Limiting

#### Authentication Endpoints (`/api/auth`)
- **Limit**: 5 requests per 15 minutes per IP
- **Purpose**: Prevent brute force attacks on login

#### High-Value Endpoints
- `/api/inventory` - Inventory operations
- `/api/skus` - SKU management
- `/api/library` - Library operations
- `/api/categories` - Category management
- **Limit**: 100 requests per 15 minutes per IP

### 4. Error Handling
- CORS errors are properly handled and return 403 Forbidden
- Rate limit errors return standardized error format with `TOO_MANY_REQUESTS` code

## Setup Instructions

1. Create `.env` file in the backend root:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# CORS (comma-separated, no spaces)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

2. For production, update:
```env
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Testing

### Test CORS
```bash
# Should work (if origin is in CORS_ORIGINS)
curl -H "Origin: http://localhost:3000" http://localhost:5000/api/health

# Should fail (if origin not in CORS_ORIGINS)
curl -H "Origin: http://malicious.com" http://localhost:5000/api/health
```

### Test Rate Limiting
```bash
# Make 6 requests quickly to /api/auth/login
# 6th request should return 429 Too Many Requests
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"companyId":"TEST","email":"test@test.com","password":"test"}'
done
```

