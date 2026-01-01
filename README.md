# Inventory Management Backend

Complete PERN stack backend for inventory management system.

## Tech Stack

- **Node.js** + **Express** - REST API server
- **PostgreSQL** - Database
- **JWT** - Authentication & Authorization
- **Multer** - File uploads (Excel)
- **XLSX** - Excel parsing
- **Jest** - Testing framework

## Features

### Core Modules

- **Authentication & Authorization**
  - JWT-based auth
  - Role-based access control
  - Company-based data isolation

- **Category Management**
  - Product/Item/Sub categories
  - GET by ID endpoints for editing
  - Hierarchical structure
  - Excel bulk upload

- **Inventory Management**
  - Incoming inventory tracking
  - Outgoing inventory tracking
  - Rejected item reports
  - Short item reports
  - Real-time stock updates

- **SKU Management**
  - SKU creation and tracking
  - Current stock calculation
  - Price history
  - Category classification

- **Library Management**
  - Vendors
  - Brands
  - Customers
  - Teams
  - Transporters

## Recent Updates

### Category Edit Feature (Latest)
- Added `getProductCategoryById()`, `getItemCategoryById()`, `getSubCategoryById()` to CategoryModel
- Updated controllers to handle GET requests with ID parameter
- Enables reliable category editing without blank fields
- Backend is single source of truth for form data

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middlewares/     # Auth, validation, error handling
│   ├── utils/           # Helper functions
│   ├── config/          # Configuration
│   └── server.js        # Entry point
├── scripts/
│   └── database/        # Migrations & seeds
├── tests/               # Test files
└── package.json
```

## Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Environment Variables

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/inventory_db
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## API Endpoints

### Categories
```
GET    /yourproductcategories      - Get all product categories
GET    /yourproductcategories/:id  - Get single product category
POST   /yourproductcategories      - Create product category
PUT    /yourproductcategories/:id  - Update product category
DELETE /yourproductcategories/:id  - Delete product category

GET    /youritemcategories         - Get all item categories
GET    /youritemcategories/:id     - Get single item category
POST   /youritemcategories         - Create item category
PUT    /youritemcategories/:id     - Update item category
DELETE /youritemcategories/:id     - Delete item category

GET    /yoursubcategories          - Get all sub categories
GET    /yoursubcategories/:id      - Get single sub category
POST   /yoursubcategories          - Create sub category
PUT    /yoursubcategories/:id      - Update sub category
DELETE /yoursubcategories/:id      - Delete sub category
```

### Authentication
```
POST /auth/register    - Register new company
POST /auth/login       - Login user
POST /auth/logout      - Logout user
```

### Inventory
```
GET  /inventory/incoming     - Get incoming inventory
POST /inventory/incoming     - Create incoming record
PUT  /inventory/incoming/:id - Update incoming record

GET  /inventory/outgoing     - Get outgoing inventory
POST /inventory/outgoing     - Create outgoing record
```

### SKUs
```
GET    /skus           - Get all SKUs
GET    /skus/:id       - Get single SKU
POST   /skus           - Create SKU
PUT    /skus/:id       - Update SKU
DELETE /skus/:id       - Delete SKU
```

## Database

### Migrations

```bash
# Run all pending migrations
npm run migrate

# Create new migration
npm run migrate:create <migration-name>
```

### Seeds

```bash
# Seed database with test data
npm run seed
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Security Features

- JWT authentication
- Password hashing (bcrypt)
- Rate limiting
- Input validation
- SQL injection prevention (parameterized queries)
- Company data isolation
- Role-based access control

## Error Handling

Centralized error handling with custom error classes:
- `NotFoundError` - 404 errors
- `ValidationError` - 400 errors
- `UnauthorizedError` - 401 errors

## License

Proprietary - All rights reserved

## Support

For issues and questions, contact the development team.
