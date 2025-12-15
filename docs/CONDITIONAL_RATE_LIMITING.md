# Conditional Rate Limiting

## Overview

This middleware provides **unlimited requests for authenticated users** (with valid JWT tokens) and **rate limits unauthenticated users** based on IP address.

## How It Works

### For Authenticated Users
- **Unlimited requests** as long as the JWT token is valid
- JWT tokens are valid for **12 hours** (configurable via `JWT_EXPIRE` environment variable)
- Token validation happens automatically on each request
- No rate limiting is applied

### For Unauthenticated Users
- Rate limited based on IP address
- Different limits for different endpoint types:
  - **Auth endpoints**: 5 requests per 15 minutes
  - **General API endpoints**: 100 requests per 15 minutes
  - **High-value endpoints**: 50 requests per 15 minutes

## Usage

### Basic Usage

```javascript
const { apiRateLimiter, authRateLimiter, strictRateLimiter } = require('./middlewares/conditionalRateLimit');

// For general API routes
app.use('/api/skus', apiRateLimiter, skusRoutes);

// For authentication routes
app.use('/api/auth', authRateLimiter, authRoutes);

// For high-value routes (inventory, etc.)
app.use('/api/inventory', strictRateLimiter, inventoryRoutes);
```

### Custom Rate Limiter

```javascript
const { createConditionalRateLimit } = require('./middlewares/conditionalRateLimit');

const customLimiter = createConditionalRateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 requests per window for unauthenticated users
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Custom rate limit message',
  },
});

app.use('/api/custom', customLimiter, customRoutes);
```

## Authentication

Users must include a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The middleware automatically:
1. Extracts the token from the `Authorization` header
2. Verifies the token signature and expiration
3. If valid, skips rate limiting (unlimited requests)
4. If invalid or missing, applies IP-based rate limiting

## JWT Configuration

JWT tokens are configured in `src/config/jwt.js`:

```javascript
module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRE || '12h', // 12 hours default
};
```

Set `JWT_EXPIRE` environment variable to customize token lifetime:
- `12h` - 12 hours (default)
- `24h` - 24 hours
- `7d` - 7 days
- etc.

## Pre-configured Limiters

### `apiRateLimiter`
- **Unauthenticated**: 100 requests per 15 minutes
- **Authenticated**: Unlimited
- **Use for**: General API endpoints (SKUs, library, categories)

### `authRateLimiter`
- **Unauthenticated**: 5 requests per 15 minutes
- **Authenticated**: Unlimited
- **Use for**: Authentication endpoints (login, register)

### `strictRateLimiter`
- **Unauthenticated**: 50 requests per 15 minutes
- **Authenticated**: Unlimited
- **Use for**: High-value endpoints (inventory, transactions)

## Response Format

When rate limited, the response will be:

```json
{
  "success": false,
  "error": "TOO_MANY_REQUESTS",
  "message": "Too many requests. Please authenticate or try again later."
}
```

Status code: `429 Too Many Requests`

## Example Flow

### Authenticated Request
```
1. Request arrives with: Authorization: Bearer <valid_jwt>
2. Middleware verifies JWT token
3. Token is valid → Skip rate limiting
4. Request proceeds to route handler
5. Response sent
```

### Unauthenticated Request
```
1. Request arrives without Authorization header
2. Middleware checks for token → Not found
3. Apply IP-based rate limiting
4. Check if IP has exceeded limit
5. If exceeded → Return 429
6. If not exceeded → Request proceeds to route handler
```

## Benefits

1. **Security**: Protects against abuse from unauthenticated users
2. **User Experience**: Authenticated users get unlimited access
3. **Flexibility**: Different limits for different endpoint types
4. **Automatic**: No manual token management needed
5. **Scalable**: Works with any number of authenticated users

## Testing

### Test Authenticated Request
```bash
curl -H "Authorization: Bearer <your_jwt_token>" \
     http://localhost:5000/api/skus
```

### Test Unauthenticated Request
```bash
curl http://localhost:5000/api/skus
```

### Test Rate Limiting
Make multiple unauthenticated requests quickly to see rate limiting in action.

