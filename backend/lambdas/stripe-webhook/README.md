# stripe-webhook

Handles `POST /stripe-webhook` — called by **Stripe**, not our frontend,
after a Checkout Session completes. Verifies the signature, then records
the donation in DynamoDB.

## Environment variables

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Same test secret key as `create-checkout-session` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this specific webhook endpoint (`whsec_...`) — generated when you register the endpoint with Stripe |
| `DONATIONS_TABLE_NAME` | DynamoDB table to record completed donations in |

## API Gateway configuration note

This route must **not** let API Gateway parse/re-serialize the JSON body —
Stripe's signature check (`stripe.webhooks.constructEvent`) is computed
over the exact raw bytes Stripe sent. If you're using an HTTP API with the
Lambda proxy integration, the raw body is passed through as `event.body`
by default, which is what this code expects.

## DynamoDB table

Partition key: `id` (String, a generated UUID — not the Stripe session ID,
so if Stripe ever retries a webhook delivery we can decide whether to
dedupe on `stripeSessionId` rather than being forced to use it as the key).

## IAM role (least privilege)

Needs `dynamodb:PutItem` scoped to the donations table ARN, read access to
the Stripe secret/webhook secret if stored in SSM/Secrets Manager, and
`AWSLambdaBasicExecutionRole` for logs. Nothing else.

## Why signature verification matters

Without verifying `stripe-signature`, anyone who finds this URL could POST
a fake "payment completed" event and get a donation logged that never
happened. `constructEvent` is what makes this endpoint trustworthy.
