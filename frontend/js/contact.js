// ============================================
// Poriborton Foundation — contact / volunteer form
// Submits to the contact-form Lambda (SES email + DynamoDB record).
// ============================================

const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('contactStatus');
  const submitButton = document.getElementById('contactSubmit');

  const payload = {
    name: document.getElementById('contactName').value.trim(),
    email: document.getElementById('contactEmail').value.trim(),
    phone: document.getElementById('contactPhone').value.trim(),
    areaOfInterest: document.getElementById('contactInterest').value,
    message: document.getElementById('contactMessage').value.trim(),
  };

  if (typeof API_BASE_URL === 'undefined' || !API_BASE_URL) {
    status.textContent = 'This form isn’t connected yet — our AWS backend hasn’t been deployed. Please email info@poribortonfoundation.org directly for now.';
    status.className = 'form-status error';
    return;
  }

  submitButton.disabled = true;
  status.textContent = 'Sending…';
  status.className = 'form-status';

  try {
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Request failed');
    status.textContent = 'Thanks — we’ll be in touch within 24 hours.';
    status.className = 'form-status success';
    contactForm.reset();
  } catch (err) {
    status.textContent = 'Something went wrong. Please try again, or email us directly at info@poribortonfoundation.org.';
    status.className = 'form-status error';
  } finally {
    submitButton.disabled = false;
  }
});
