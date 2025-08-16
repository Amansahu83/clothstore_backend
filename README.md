# Cloth Store Backend API

Express.js backend API for the cloth store application with PostgreSQL database.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL database:
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Run the database.sql file
   \i database.sql
   ```

3. Configure environment variables in `.env`:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=clothstore
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### POST /api/auth/login
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Product Endpoints

#### GET /api/products
Get all products

#### GET /api/products/:id
Get single product by ID

#### POST /api/products (Admin only)
Create new product with image upload
- Form data with image file and product details

#### PUT /api/products/:id (Admin only)
Update product
- Form data with updated product details

#### DELETE /api/products/:id (Admin only)
Delete product

### Order Endpoints

#### POST /api/orders
Create new order
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "shipping_address": "123 Main St, City, State"
}
```

#### GET /api/orders
Get user's orders (requires authentication)