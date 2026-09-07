# contact-form

Handles `POST /contact` from `contact.html`. Validates input, writes the
submission to DynamoDB, and emails a copy via SES.

## Environment variables

| Variable | Purpose |
|---|---|
| `CONTACT_TABLE_NAME` | DynamoDB table to write submissions to |
| `NOTIFY_EMAIL` | Inbox to send a copy to (must be SES-verified while in sandbox mode) |

## DynamoDB table

Partition key: `id` (String). On-demand billing is fine here — contact
form traffic is low and spiky, and on-demand avoids paying for idle
provisioned capacity.

## IAM role (least privilege — do not reuse across Lambdas)

This function needs exactly:
- `dynamodb:PutItem` scoped to the one contact-submissions table ARN
- `ses:SendEmail` and `ses:SendRawEmail` scoped to the verified sender identity ARN
- The standard `AWSLambdaBasicExecutionRole` managed policy, for CloudWatch Logs

It does **not** need read access to DynamoDB, access to any other table, or
any S3/other service permissions — resist the urge to attach
`AmazonDynamoDBFullAccess` or similar broad policies "to save time."

## Why SES sandbox matters

New SES accounts start in sandbox mode: you can only send *to* addresses
you've manually verified in the SES console, even though you can send
*from* your verified domain/address freely. That's fine for testing (verify
your own inbox), but you'll need to request production access from AWS
before this can actually notify arbitrary volunteers.
