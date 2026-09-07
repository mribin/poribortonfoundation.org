// ============================================
// create-checkout-session Lambda
//
// Triggered by API Gateway (POST /create-checkout-session) from donate.html.
//
// Per CLAUDE.md's payments rule: we NEVER handle card numbers ourselves.
// This function's only job is to ask Stripe to create a Checkout Session
// (Stripe's own hosted payment page) and hand back its URL. The browser
// then redirects there — card entry happens entirely on Stripe's domain.
//
// Stripe Test Mode only, for now: Stripe doesn't yet support payouts to
// Bangladesh-registered businesses, so this can't take real money. It's
// wired up so the donation *flow* (fund selection → checkout → webhook →
// record) works end-to-end, ready to swap in a local gateway (SSLCommerz
// is the current candidate) later without changing this shape much.
// ============================================

const Stripe = require('stripe');

// The secret key lives in an environment variable, set on the Lambda itself
// (ideally via SSM Parameter Store / Secrets Manager, not typed into the
// console by hand) — it must never appear in this source file or in git.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SITE_URL = process.env.SITE_URL; // e.g. https://poribortonfoundation.org

const VALID_FUNDS = new Set([
  'general',
  'education',
  'healthcare',
  'mosque-building',
  'zakat',
  'qurbani',
  'skill-development',
  'disaster-relief',
]);

const FUND_LABELS = {
  general: 'General Fund',
  education: 'Education',
  healthcare: 'Healthcare',
  'mosque-building': 'Mosque Building',
  zakat: 'Zakat Distribution',
  qurbani: 'Qurbani',
  'skill-development': 'Skill Development',
  'disaster-relief': 'Disaster Relief',
};

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

  const { fund, amount, email } = data;

  if (!VALID_FUNDS.has(fund)) {
    return respond(400, { error: 'Invalid fund' });
  }
  // Stripe amounts are in the smallest currency unit — for BDT (no minor
  // unit like cents), that's just whole taka, so no *100 conversion here.
  const wholeAmount = Number(amount);
  if (!Number.isInteger(wholeAmount) || wholeAmount < 50) {
    return respond(400, { error: 'Amount must be a whole number of at least 50 BDT' });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email || undefined,
    line_items: [{
      price_data: {
        currency: 'bdt',
        unit_amount: wholeAmount,
        product_data: {
          name: `Donation — ${FUND_LABELS[fund]}`,
        },
      },
      quantity: 1,
    }],
    // Stripe fills {CHECKOUT_SESSION_ID} in for us on redirect.
    success_url: `${SITE_URL}/donate.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/donate.html?status=cancelled`,
    metadata: { fund }, // read back by the webhook to know which fund to credit
  });

  return respond(200, { checkoutUrl: session.url });
};
