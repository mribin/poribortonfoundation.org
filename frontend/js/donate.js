// ============================================
// Poriborton Foundation — donate page interactions
// Preselects fund from ?fund=<slug>, syncs amount buttons with the
// custom-amount input, and submits to the create-checkout-session Lambda.
// ============================================

const donateForm = document.getElementById('donateForm');
const fundSelect = document.getElementById('donateFund');
const amountInput = document.getElementById('donateAmount');
const amountButtons = document.querySelectorAll('.amount-btn');

// Preselect the fund if the visitor arrived via a "Donate to <program>" link,
// e.g. donate.html?fund=education from programs.html
const params = new URLSearchParams(window.location.search);
const requestedFund = params.get('fund');
if (requestedFund && fundSelect.querySelector(`option[value="${requestedFund}"]`)) {
  fundSelect.value = requestedFund;
}

// Clicking a preset amount fills the input and highlights the button;
// typing a custom amount clears any highlighted preset.
amountButtons.forEach((button) => {
  button.addEventListener('click', () => {
    amountButtons.forEach((b) => b.classList.remove('selected'));
    button.classList.add('selected');
    amountInput.value = button.dataset.amount;
  });
});
amountInput.addEventListener('input', () => {
  amountButtons.forEach((b) => b.classList.remove('selected'));
});

donateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('donateStatus');
  const submitButton = document.getElementById('donateSubmit');

  const payload = {
    fund: fundSelect.value,
    amount: Number(amountInput.value),
    email: document.getElementById('donateEmail').value.trim(),
    currency: 'bdt',
  };

  if (typeof API_BASE_URL === 'undefined' || !API_BASE_URL) {
    status.textContent = 'Card payments aren’t connected yet — our AWS backend and Stripe test-mode checkout haven’t been deployed. Please use bank transfer or mobile banking below for now.';
    status.className = 'form-status error';
    return;
  }

  submitButton.disabled = true;
  status.textContent = 'Redirecting to secure checkout…';
  status.className = 'form-status';

  try {
    // The Lambda creates a Stripe Checkout Session (test mode) and returns
    // its hosted checkout URL — we never handle card details ourselves.
    const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Request failed');
    const { checkoutUrl } = await response.json();
    window.location.href = checkoutUrl;
  } catch (err) {
    status.textContent = 'Something went wrong starting checkout. Please try again, or use bank transfer / mobile banking below.';
    status.className = 'form-status error';
    submitButton.disabled = false;
  }
});
