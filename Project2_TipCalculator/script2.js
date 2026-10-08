const billInput = document.querySelector('#billAmount');
const tipInput = document.querySelector('#tipPercentage');
const calculateBtn = document.querySelector('#calculateBtn');
const tipResult = document.querySelector('#tipResult');
const totalResult = document.querySelector('#totalResult');


function calculateTip() {
  const bill = parseFloat(billInput.value);
  const tipPercent = parseFloat(tipInput.value);

  
  if (isNaN(bill) || bill < 0 || isNaN(tipPercent) || tipPercent < 0) {
    tipResult.textContent = '$0.00';
    totalResult.textContent = '$0.00';
    return;
  }

  
  const tipAmount = bill * (tipPercent / 100);
  const totalAmount = bill + tipAmount;

  
  tipResult.textContent = `$${tipAmount.toFixed(2)}`;
  totalResult.textContent = `$${totalAmount.toFixed(2)}`;
}


calculateBtn.addEventListener('click', calculateTip);