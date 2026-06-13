const form = document.querySelector('.waitlist-form');
const statusMessage = document.querySelector('.form-note');
const emailInput = document.querySelector('#email');
const productButtons = document.querySelectorAll('[data-product]');

let selectedProduct = 'DropViral launch catalog';

productButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedProduct = button.dataset.product || selectedProduct;
    if (statusMessage) {
      statusMessage.textContent = `Selected: ${selectedProduct}. Add your email and we will notify you when links are approved.`;
    }
    window.setTimeout(() => emailInput?.focus(), 250);
  });
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!emailInput?.checkValidity()) {
    emailInput?.reportValidity();
    return;
  }

  statusMessage.textContent = `Thanks — ${emailInput.value.trim()} is queued for ${selectedProduct} updates. Connect an email provider before production launch.`;
  form.reset();
});
