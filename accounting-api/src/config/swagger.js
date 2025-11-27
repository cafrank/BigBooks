// --- Add to package.json dependencies ---
/*
{
  "dependencies": {
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0",
    "yamljs": "^0.3.0"
  }
}
*/

// --- src/config/swagger.js ---
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Accounting Service API',
      version: '1.0.0',
      description: 'A comprehensive accounting API similar to QuickBooks',
      contact: {
        name: 'API Support',
        email: 'api@accounting-service.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.accounting-service.com/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Resource not found'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  msg: { type: 'string' },
                  path: { type: 'string' },
                  location: { type: 'string' }
                }
              }
            }
          }
        },
        Money: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              format: 'decimal',
              example: 1000.50
            },
            currency: {
              type: 'string',
              example: 'USD',
              default: 'USD'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              example: 100
            },
            limit: {
              type: 'integer',
              example: 25
            },
            offset: {
              type: 'integer',
              example: 0
            },
            hasMore: {
              type: 'boolean',
              example: true
            }
          }
        },
        Account: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            type: {
              type: 'string',
              enum: ['asset', 'liability', 'equity', 'income', 'expense']
            },
            accountNumber: { type: 'string' },
            description: { type: 'string' },
            parentAccountId: { type: 'string', format: 'uuid', nullable: true },
            isActive: { type: 'boolean' },
            isSystemAccount: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            displayName: { type: 'string' },
            companyName: { type: 'string', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            paymentTerms: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoiceNumber: { type: 'string' },
            customerId: { type: 'string', format: 'uuid' },
            customer: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                displayName: { type: 'string' },
                email: { type: 'string' }
              }
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'voided']
            },
            issueDate: { type: 'string', format: 'date' },
            dueDate: { type: 'string', format: 'date' },
            lineItems: {
              type: 'array',
              items: { $ref: '#/components/schemas/LineItem' }
            },
            subtotal: { $ref: '#/components/schemas/Money' },
            discountAmount: { $ref: '#/components/schemas/Money' },
            taxAmount: { $ref: '#/components/schemas/Money' },
            total: { $ref: '#/components/schemas/Money' },
            amountPaid: { $ref: '#/components/schemas/Money' },
            amountDue: { $ref: '#/components/schemas/Money' },
            notes: { type: 'string', nullable: true },
            sentAt: { type: 'string', format: 'date-time', nullable: true },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        LineItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid', nullable: true },
            productName: { type: 'string', nullable: true },
            description: { type: 'string' },
            quantity: { type: 'number' },
            unitPrice: { $ref: '#/components/schemas/Money' },
            discountPercent: { type: 'number' },
            taxAmount: { $ref: '#/components/schemas/Money' },
            amount: { $ref: '#/components/schemas/Money' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            paymentNumber: { type: 'string' },
            customerId: { type: 'string', format: 'uuid' },
            customerName: { type: 'string' },
            paymentDate: { type: 'string', format: 'date' },
            amount: { $ref: '#/components/schemas/Money' },
            paymentMethod: {
              type: 'string',
              enum: ['cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'other']
            },
            referenceNumber: { type: 'string', nullable: true },
            memo: { type: 'string', nullable: true },
            invoicesApplied: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  invoiceId: { type: 'string' },
                  invoiceNumber: { type: 'string' },
                  amount: { $ref: '#/components/schemas/Money' }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js'] // Path to route files with JSDoc comments
};

const specs = swaggerJsdoc(options);

module.exports = specs;

// --- Update src/index.js to include Swagger ---
/*
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// ... existing middleware ...

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Accounting API Documentation'
}));

// ... rest of routes ...
*/

// --- src/routes/auth.js (with Swagger annotations) ---
/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and registration
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user and organization
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - organizationName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@acmecorp.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Smith
 *               organizationName:
 *                 type: string
 *                 example: Acme Corporation
 *     responses:
 *       201:
 *         description: User and organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                 organization:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to get authentication token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@acmecorp.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// --- src/routes/invoices.js (with Swagger annotations) ---
/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management
 */

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List all invoices
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, viewed, partial, paid, overdue, voided]
 *         description: Filter by invoice status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by customer ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (issue date)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (issue date)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: List of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - lineItems
 *             properties:
 *               customerId:
 *                 type: string
 *                 format: uuid
 *               issueDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-20"
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-04-19"
 *               lineItems:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - description
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     description:
 *                       type: string
 *                       example: "Web Development Services"
 *                     quantity:
 *                       type: number
 *                       example: 40
 *                     unitPrice:
 *                       type: number
 *                       example: 150.00
 *                     discountPercent:
 *                       type: number
 *                       example: 0
 *                     taxRateId:
 *                       type: string
 *                       format: uuid
 *               discountAmount:
 *                 type: number
 *                 example: 100.00
 *               notes:
 *                 type: string
 *                 example: "Thank you for your business!"
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, sent, voided]
 *               dueDate:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 *   delete:
 *     summary: Delete an invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Invoice deleted
 *       404:
 *         description: Invoice not found
 */

/**
 * @swagger
 * /invoices/{id}/send:
 *   post:
 *     summary: Send invoice to customer
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 sentAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Cannot send voided invoice
 *       404:
 *         description: Invoice not found
 */

/**
 * @swagger
 * /invoices/{id}/pdf:
 *   get:
 *     summary: Download invoice as PDF
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Invoice not found
 */

// --- public/swagger.html (Custom UI page) ---
/*
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accounting API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css">
  <style>
    .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 36px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api-docs/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout",
        persistAuthorization: true,
        displayRequestDuration: true
      });
    };
  </script>
</body>
</html>
*/

// --- README.md (API Documentation section) ---
/*
## API Documentation

Interactive API documentation is available via Swagger UI:

- **Development**: http://localhost:3000/api-docs
- **Production**: https://api.accounting-service.com/api-docs

### Authentication

All endpoints (except /auth/register and /auth/login) require a JWT token:

```bash
# Get token
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use token in subsequent requests
curl http://localhost:3000/v1/invoices \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Quick Start Examples

#### Create an invoice
```bash
curl -X POST http://localhost:3000/v1/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-uuid",
    "lineItems": [
      {
        "description": "Consulting Services",
        "quantity": 10,
        "unitPrice": 150.00
      }
    ]
  }'
```

#### Record a paymecd accent
```bash
curl -X POST http://localhost:3000/v1/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-uuid",
    "amount": 1500.00,
    "paymentDate": "2024-03-20",
    "paymentMethod": "check",
    "invoicesApplied": [
      {"invoiceId": "invoice-uuid", "amount": 1500.00}
    ]
  }'
```
*/