# Get auth token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@bigbooks.com","password":"demo123456"}' | jq -r '.token')

#echo "Token: ${TOKEN:0:20}..."
echo "Token: ${TOKEN}..."

curl -X POST http://localhost:3000/v1/bills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "deb652cb-b123-4ac3-b5ea-090b84522b11",
    "billDate": "2024-11-27",
    "dueDate": "2024-12-27",
    "lineItems": [
      {
        "accountId": "ACCOUNT_UUID",
        "description": "Test item",
        "amount": 100.00,
        "quantity": 1
      }
    ]
  }'
