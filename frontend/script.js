let currentOrder = [];

// Fetch products and populate dropdown
function fetchProducts() {
  fetch('http://localhost:5000/products')
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then(data => {
      const select = document.getElementById('product-select');
      
      // Clear existing options except the first one
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add new options
      data.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id || product.name;
        option.textContent = `${product.name} - ₹${product.price}`;
        option.dataset.price = product.price;
        option.dataset.name = product.name;
        select.appendChild(option);
      });
    })
    .catch(error => {
      console.error('Error fetching products:', error);
      alert('Failed to load products. Please try again later.');
    });
}

// Add selected product to order
function addToOrder() {
  const select = document.getElementById('product-select');
  const selectedOption = select.options[select.selectedIndex];
  const quantityInput = document.getElementById('quantity');
  const quantity = parseInt(quantityInput.value);

  // Validate selection
  if (!selectedOption.value) {
    alert('Please select a product');
    return;
  }

  // Validate quantity
  if (isNaN(quantity) || quantity < 1) {
    alert('Please enter a valid quantity (minimum 1)');
    quantityInput.focus();
    return;
  }

  const existingItemIndex = currentOrder.findIndex(
    item => item.name === selectedOption.dataset.name
  );

  if (existingItemIndex >= 0) {
    // Update existing item quantity
    currentOrder[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    currentOrder.push({
      name: selectedOption.dataset.name,
      price: parseFloat(selectedOption.dataset.price),
      quantity: quantity
    });
  }

  updateOrderSummary();
  
  // Reset form
  select.selectedIndex = 0;
  quantityInput.value = 1;
}

// Update the order summary display
function updateOrderSummary() {
  const orderList = document.getElementById('order-items');
  orderList.innerHTML = '';
  
  let total = 0;

  currentOrder.forEach((item, index) => {
    const li = document.createElement('li');
    const itemTotal = item.price * item.quantity;
    
    li.innerHTML = `
      <span>${item.quantity}x ${item.name}</span>
      <span>₹${itemTotal.toFixed(2)}</span>
      <button onclick="removeItem(${index})" title="Remove">×</button>
    `;
    
    orderList.appendChild(li);
    total += itemTotal;
  });

  document.getElementById('order-total').textContent = total.toFixed(2);
  
  // Enable/disable place order button
  document.querySelector('.place-order-btn').disabled = currentOrder.length === 0;
}

// Remove item from order
function removeItem(index) {
  currentOrder.splice(index, 1);
  updateOrderSummary();
}

// Submit order to server
function placeOrder() {
  if (currentOrder.length === 0) {
    alert('Your order is empty. Please add some items.');
    return;
  }

  // Prepare order data
  const orderData = currentOrder.map(item => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity
  }));

  // Disable button during submission
  const submitBtn = document.querySelector('.place-order-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  fetch('http://localhost:5000/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  })
  .then(res => {
    if (!res.ok) throw new Error('Order submission failed');
    return res.json();
  })
  .then(data => {
    if (data.order_id) {
      alert(`Order placed successfully!\nOrder ID: ${data.order_id}\n\nPlease save this ID to check your order status.`);
      currentOrder = [];
      updateOrderSummary();
    } else {
      throw new Error('Invalid response from server');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Failed to place order. Please try again.');
  })
  .finally(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order';
  });
}

// Check order status
function checkStatus() {
  const orderId = document.getElementById('order-id-input').value.trim();
  
  if (!orderId) {
    alert('Please enter an order ID');
    return;
  }

  const statusResult = document.getElementById('status-result');
  statusResult.innerHTML = 'Checking...';
  statusResult.style.backgroundColor = '#f8f8f8';

  fetch(`http://localhost:5000/status/${orderId}`)
    .then(res => {
      if (!res.ok) throw new Error('Status check failed');
      return res.json();
    })
    .then(data => {
      if (data.status) {
        statusResult.innerHTML = `
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Status:</strong> <span class="status-${data.status.toLowerCase()}">${data.status}</span></p>
          ${data.estimated_time ? `<p><strong>Estimated Time:</strong> ${data.estimated_time}</p>` : ''}
        `;
        statusResult.style.backgroundColor = '#f0f8f0';
      } else {
        throw new Error(data.error || 'Order not found');
      }
    })
    .catch(error => {
      statusResult.innerHTML = `Error: ${error.message}`;
      statusResult.style.backgroundColor = '#fff0f0';
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  
  // Set up quantity input validation
  document.getElementById('quantity').addEventListener('change', function() {
    if (this.value < 1) this.value = 1;
  });
});