// ============================================
// contact-form Lambda
//
// Triggered by API Gateway (POST /contact) when a visitor submits the
// contact/volunteer form on contact.html.
//
// What it does, in order:
//   1. Validates the incoming fields (never trust the browser — someone
//      could call this API directly, skipping our client-side checks).
//   2. Writes the submission to DynamoDB, so nothing is lost even if the
//      email step below fails.
//   3. Emails a copy to the foundation's inbox via SES.
//
// Why DynamoDB *and* SES, not just email? Email can silently land in spam,
// get deleted, or fail to send. DynamoDB gives us a durable, queryable
// record of every submission regardless of what happens to the email.
// ============================================

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { randomUUID } = require('crypto');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({});

// Table and inbox come from environment variables (set in the Lambda's
// console/CLI config), never hardcoded — that keeps this code identical
// across dev/staging/prod and out of source control.
const TABLE_NAME = process.env.CONTACT_TABLE_NAME;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL; // must be SES-verified while in sandbox mode

const VALID_INTERESTS = new Set([
  'education',
  'healthcare',
  'disaster-relief',
  'community-empowerment',
  'general-volunteering',
  'donation-inquiry',
]);

// Minimal CORS headers so the browser (running on a different origin during
// local dev, and on the Amplify domain in prod) is allowed to call this API.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  // API Gateway (HTTP API / Lambda proxy integration) hands us the raw
  // request body as a string — we parse it ourselves.
  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const { name, email, phone, areaOfInterest, message } = data;

  if (!name || !email || !phone || !message) {
    return respond(400, { error: 'name, email, phone, and message are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: 'Invalid email address' });
  }
  if (areaOfInterest && !VALID_INTERESTS.has(areaOfInterest)) {
    return respond(400, { error: 'Invalid areaOfInterest' });
  }

  const submission = {
    id: randomUUID(),
    name,
    email,
    phone,
    areaOfInterest: areaOfInterest || 'general-volunteering',
    message,
    submittedAt: new Date().toISOString(),
  };

  // Step 1: persist first. If SES has a hiccup later, we still have the record.
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: submission }));

  // Step 2: email a copy. SES starts in "sandbox" mode, which can only send
  // to addresses you've manually verified in the SES console — request
  // production access before relying on this for real volunteers.
  try {
    await ses.send(new SendEmailCommand({
      Source: NOTIFY_EMAIL,
      Destination: { ToAddresses: [NOTIFY_EMAIL] },
      Message: {
        Subject: { Data: `New contact form submission: ${areaOfInterest || 'general'}` },
        Body: {
          Text: {
            Data: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nArea of interest: ${areaOfInterest}\n\nMessage:\n${message}`,
          },
        },
      },
    }));
  } catch (err) {
    // Don't fail the whole request just because email delivery failed —
    // the submission is already safely stored in DynamoDB.
    console.error('SES send failed:', err);
  }

  return respond(200, { success: true, id: submission.id });
};
