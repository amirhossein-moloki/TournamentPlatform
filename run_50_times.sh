#!/bin/bash

for i in {1..50}
do
  echo "Running iteration $i"
  output=$(DB_HOST=localhost DB_USER=user DB_PASSWORD=password DB_NAME=tournament_platform_db RABBITMQ_URL=amqp://guest:guest@localhost:5672 PAYMENT_GATEWAY_API_KEY=key PAYMENT_GATEWAY_WEBHOOK_SECRET=secret AWS_ACCESS_KEY_ID=key AWS_SECRET_ACCESS_KEY=secret AWS_REGION=region AWS_S3_BUCKET_NAME=bucket ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password ZARINPAL_MERCHANT_ID=id JWT_SECRET=secret npm run start 2>&1)
  if [[ $? -ne 0 && ! $output =~ "ECONNREFUSED" ]]; then
    echo "Error on iteration $i"
    echo "$output"
    exit 1
  fi
done

echo "Successfully ran 50 times"
