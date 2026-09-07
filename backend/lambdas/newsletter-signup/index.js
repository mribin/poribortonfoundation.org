// ============================================
// newsletter-signup Lambda
//
// Triggered by API Gateway (POST /newsletter) from the "Stay stitched in"
// form on the homepage.
//
// Kept deliberately simple: validate the email, then write-or-update a
// DynamoDB item keyed by the email address itself. Using the email as the
// partition key means a repeat signup just overwrites the same item
// (idempotent) instead of creating duplicate rows we'd have to de-dupe
// later — one less thing to get wrong.
// ============================================

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.NEWSLETTER_TABLE_NAME;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const email = (data.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: 'Invalid email address' });
  }

  await ddb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      email,
      subscribedAt: new Date().toISOString(),
    },
  }));

  return respond(200, { success: true });
};
