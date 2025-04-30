CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO products (name, description, price) VALUES
('Croissant', 'Buttery flaky pastry', 2.99),
('Baguette', 'Traditional French bread', 3.50),
('Chocolate Chip Cookie', 'Classic cookie with chocolate chips', 1.50),
('Apple Pie', 'Homemade apple pie', 12.99);

INSERT INTO orders (product_id, quantity, customer_name, customer_email, status) VALUES
(1, 3, 'John Smith', 'john@example.com', 'completed'),
(3, 12, 'Sarah Johnson', 'sarah@example.com', 'processing'),
(4, 1, 'Michael Brown', 'michael@example.com', 'pending'),
(2, 5, 'Emily Davis', 'emily@example.com', 'completed'),
(5, 2, 'David Wilson', 'david@example.com', 'shipped'),
(1, 6, 'Jessica Lee', 'jessica@example.com', 'pending');

CREATE TABLE order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN status VARCHAR(20) DEFAULT 'processing';
-- Optional: Create an index for better order lookup performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_product_id ON orders(product_id);