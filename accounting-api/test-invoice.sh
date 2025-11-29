#!/bin/bash

# Get auth token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r '.token')

echo "Token: ${TOKEN:0:20}..."

# Get auth token
#echo "Getting auth token..."
#TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
#  -H "Content-Type: application/json" \
#  -d '{"email":"demo@bigbooks.com","password":"demo123456"}' | jq -r '.token')
#
#echo "Token: ${TOKEN:0:20}..."

# Create invoice
echo -e "\nCreating invoice..."
curl -v -X POST http://localhost:3000/v1/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "6ce69d15-5e12-4b57-bad6-3ff52e3aa0eb",
    "issueDate": "2024-11-29",
    "dueDate": "2024-12-29",
    "lineItems": [
      {
        "description": "Test Service",
        "quantity": 1,
        "unitPrice": 100,
        "taxRate": 8.5
      }
    ],
    "notes": "Test invoice from script"
  }'

# Retrieve invoice
echo -e "\nRetrieve invoice..."
curl -v -X GET http://localhost:3000/v1/invoices/d6680ba7-d3fe-4225-95c9-3cd2db6ee64e \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq

echo -e "\n\nDone"
