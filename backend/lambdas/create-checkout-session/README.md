# create-checkout-session

Handles `POST /create-checkout-session` from `donate.html`. Creates a
Stripe Checkout Session in **test mode** and returns its URL for the
browser to redirect to. No card data ever touches our own code.

## Environment variables

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe **test** secret key (`sk_test_...`). Store via SSM Parameter Store (SecureString) or Secrets Manager, referenced by the Lambda — never typed directly as a plain env var value in the console if you can avoid it, and never committed to git. |
| `SITE_URL` | Base URL to redirect back to after checkout, e.g. the Amplify domain |

## IAM role (least privilege)

This function makes an outbound HTTPS call to Stripe's API — it does **not**
need any AWS service permissions beyond `AWSLambdaBasicExecutionRole` for
logs, and (if you store the key in SSM/Secrets Manager) read access scoped
to that one parameter/secret ARN.

## Why Stripe Test Mode only

Stripe doesn't currently support payouts to Bangladesh-registered
businesses, so this can never move real money — it exists so the *shape*
of the donation flow (fund → checkout → webhook → record) is built and
testable now. `stripe-webhook` is the other half of this flow. When a
local gateway (SSLCommerz is the current candidate) is integrated for
real donations, this Lambda is the one to swap out — the frontend and
webhook-recording logic should barely need to change.
