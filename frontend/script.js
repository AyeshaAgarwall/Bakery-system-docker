document.addEventListener('DOMContentLoaded', function() {
  const API_BASE_URL = 'http://backend:3000';
  
  
document.getElementById('loadProducts').addEventListener('click', async () => {
  const productsList = document.getElementById('productsList');
  const productSelect = document.getElementById('productSelect');
  
  try {
    console.log('Attempting to fetch products...'); // Debug log
    
    // Show loading state
    productsList.innerHTML = '<div class="loading">Loading products...</div>';
    
    const response = await fetch(`${API_BASE_URL}/products`);
    
    console.log('Received response:', response); // Debug log
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    const products = await response.json();
    console.log('Products data:', products); // Debug log
    
    // Clear previous content
    productsList.innerHTML = '';
    productSelect.innerHTML = '<option value="">Select a product</option>';
    
    if (!products || products.length === 0) {
      productsList.innerHTML = '<div class="no-products">No products available</div>';
      return;
    }
    
    // Populate products
    products.forEach(product => {
      // Validate product structure
      if (!product.id || !product.name || !product.price) {
        console.warn('Invalid product structure:', product);
        return;
      }
      
      // Create product display
      const productDiv = document.createElement('div');
      productDiv.className = 'product-item';
      productDiv.dataset.id = product.id;
      productDiv.innerHTML = `
        <strong>${product.name}</strong> - $${product.price.toFixed(2)}
        ${product.description ? `<br><em>${product.description}</em>` : ''}
      `;
      productsList.appendChild(productDiv);
      
      // Add to dropdown
      const option = new Option(
        `${product.name} - $${product.price.toFixed(2)}`, 
        product.id
      );
      productSelect.appendChild(option);
    });
    
  } catch (error) {
    console.error('Failed to load products:', error);
    productsList.innerHTML = `
      <div class="error">
        Error loading products: ${error.message}
        <button onclick="this.closest('.error').remove();">Dismiss</button>
      </div>
    `;
  }
});
  
  // Place Order
  document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productSelect').value;
    const quantity = document.getElementById('quantity').value;
    const customerName = document.getElementById('customerName').value;
    
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity,
          customer_name: customerName
        })
      });
      
      const order = await response.json();
      
      document.getElementById('orderResult').innerHTML = `
        <div class="order-item">
          <strong>Order Placed Successfully!</strong>
          <p>Order ID: ${order.id}</p>
          <p>Status: ${order.status}</p>
        </div>
      `;
    } catch (error) {
      console.error('Error placing order:', error);
      document.getElementById('orderResult').innerHTML = 'Error placing order';
    }
  });
  
  // Check Order Status
  document.getElementById('checkOrder').addEventListener('click', async () => {
    const orderId = document.getElementById('orderId').value;
    
    if (!orderId) {
      alert('Please enter an order ID');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
      
      if (response.status === 404) {
        document.getElementById('orderStatus').innerHTML = 'Order not found';
        return;
      }
      
      const order = await response.json();
      
      document.getElementById('orderStatus').innerHTML = `
        <div class="order-item">
          <strong>Order #${order.id}</strong>
          <p>Product ID: ${order.product_id}</p>
          <p>Quantity: ${order.quantity}</p>
          <p>Customer: ${order.customer_name}</p>
          <p>Status: ${order.status}</p>
        </div>
      `;
    } catch (error) {
      console.error('Error checking order:', error);
      document.getElementById('orderStatus').innerHTML = 'Error checking order status';
    }
  });
});