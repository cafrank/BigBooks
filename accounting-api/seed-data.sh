#!/bin/bash



#  -d '{"email":"demo@bigbooks.com","password":"demo123456"}' | jq -r '.token')
#


# Get auth token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r '.token')

echo "Token: ${TOKEN:0:20}..."

# Create customers
echo "Creating customers..."
CUSTOMER1=$(curl -s -X POST http://localhost:3000/v1/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"displayName":"Acme Corporation","companyName":"Acme Corp","email":"billing@acme.com","phone":"555-123-4567","paymentTerms":"net30"}' | jq -r '.id')

CUSTOMER2=$(curl -s -X POST http://localhost:3000/v1/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"displayName":"Tech Solutions Inc","companyName":"Tech Solutions Inc","email":"info@techsolutions.com","phone":"555-234-5678","paymentTerms":"net30"}' | jq -r '.id')

CUSTOMER3=$(curl -s -X POST http://localhost:3000/v1/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"displayName":"Global Services LLC","email":"hello@globalservices.com","phone":"555-345-6789","paymentTerms":"net15"}' | jq -r '.id')

echo "Created customers: $CUSTOMER1, $CUSTOMER2, $CUSTOMER3"

# Create invoices
echo "Creating invoices..."
curl -s -X POST http://localhost:3000/v1/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"customerId\":\"$CUSTOMER1\",
    \"issueDate\":\"2024-01-15\",
    \"dueDate\":\"2024-02-15\",
    \"lineItems\":[
      {\"description\":\"Web Development Services\",\"quantity\":40,\"unitPrice\":125}
    ],
    \"notes\":\"Thank you for your business\"
  }" > /dev/null

curl -s -X POST http://localhost:3000/v1/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"customerId\":\"$CUSTOMER2\",
    \"issueDate\":\"2024-01-20\",
    \"dueDate\":\"2024-02-20\",
    \"lineItems\":[
      {\"description\":\"Consulting Services\",\"quantity\":30,\"unitPrice\":150}
    ]
  }" > /dev/null

curl -s -X POST http://localhost:3000/v1/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"customerId\":\"$CUSTOMER3\",
    \"issueDate\":\"2023-12-10\",
    \"dueDate\":\"2024-01-10\",
    \"lineItems\":[
      {\"description\":\"Software License\",\"quantity\":1,\"unitPrice\":7200}
    ]
  }" > /dev/null

echo "✅ Sample data created successfully!"
