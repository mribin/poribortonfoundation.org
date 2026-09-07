# newsletter-signup

Handles `POST /newsletter` from the homepage signup card.

## Environment variables

| Variable | Purpose |
|---|---|
| `NEWSLETTER_TABLE_NAME` | DynamoDB table to store subscriber emails |

## DynamoDB table

Partition key: `email` (String) — using the email itself as the key makes
repeat signups idempotent (an overwrite, not a duplicate row).

## IAM role (least privilege)

Needs only `dynamodb:PutItem` scoped to this one table's ARN, plus the
standard `AWSLambdaBasicExecutionRole` for logs. Nothing else.

## Later: actually sending a newsletter

This function only *collects* addresses — it doesn't send anything. When
you're ready to mail subscribers, keep the SES sandbox-mode sending limits
in mind, or consider a purpose-built list tool (e.g. SES contact lists) once
you have production SES access.
