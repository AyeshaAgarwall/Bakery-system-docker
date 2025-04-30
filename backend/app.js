const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('redis');
const amqp = require('amqplib/callback_api');

// Initialize Express app
const app = express();

// ======================
// Database Configuration
// ======================
const pool = new Pool({
  user: process.env.DB_USER || 'bakery_user',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'bakery_db',
  password: process.env.DB_PASSWORD || 'bakery_password',
  port: 5432
});

// =================
// Redis Connection
// =================
let redisClient;

async function connectRedis() {
  redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`,
    password: process.env.REDIS_PASSWORD || undefined
  });

  redisClient.on('error', (err) => console.error('Redis error:', err));
  await redisClient.connect();
  console.log('Connected to Redis');
  return redisClient;
}

// ==============
// RabbitMQ Setup
// ==============
let rabbitChannel;

function connectRabbitMQ() {
  return new Promise((resolve, reject) => {
    amqp.connect(`amqp://${process.env.RABBITMQ_HOST || 'rabbitmq'}`, (err, conn) => {
      if (err) return reject(err);
      conn.createChannel((err, ch) => {
        if (err) return reject(err);
        rabbitChannel = ch;
        console.log('Connected to RabbitMQ');
        resolve();
      });
    });
  });
}

// ==============
// Middleware
// ==============
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://frontend:80',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// ==============
// API Endpoints
// ==============

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: "Bakery API Service",
    endpoints: {
      health: "/health",
      products: "/products",
      orders: "/orders"
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await Promise.all([
      pool.query('SELECT 1'),
      redisClient.PING(),
      new Promise((resolve, reject) => {
        rabbitChannel ? resolve() : reject(new Error('RabbitMQ not connected'));
      })
    ]);
    res.json({ status: 'OK', services: ['PostgreSQL', 'Redis', 'RabbitMQ'] });
  } catch (err) {
    res.status(503).json({ 
      status: 'Service Unavailable',
      error: err.message 
    });
  }
});

// Products endpoint with caching
app.get('/products', async (req, res) => {
  try {
    // Try cache first
    const cached = await redisClient.get('products');
    if (cached) return res.json(JSON.parse(cached));

    // Database fallback
    const result = await pool.query('SELECT * FROM products');
    await redisClient.setEx('products', 3600, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/orders', async (req, res) => {
  // Validate input
  if (!req.body.product_id || !req.body.quantity || !req.body.customer_name) {
    return res.status(400).json({ 
      error: 'Missing required fields: product_id, quantity, customer_name' 
    });
  }

  try {
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Check product exists
      const productCheck = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [req.body.product_id]
      );
      
      if (productCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }

      // 2. Create order
      const orderResult = await client.query(
        `INSERT INTO orders(product_id, quantity, customer_name, status) 
         VALUES($1, $2, $3, 'processing') 
         RETURNING *`,
        [req.body.product_id, req.body.quantity, req.body.customer_name]
      );

      // 3. Publish to RabbitMQ (if available)
      if (rabbitChannel) {
        rabbitChannel.sendToQueue(
          'order_processing',
          Buffer.from(JSON.stringify(orderResult.rows[0])),
          { persistent: true } // Ensure message survives broker restart
        );
      }

      await client.query('COMMIT');
      
      res.status(201).json(orderResult.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Order creation failed:', err);
    
    // Specific error messages
    if (err.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid product_id' });
    } else if (err.code === '23502') { // Not null violation
      res.status(400).json({ error: 'Missing required fields' });
    } else {
      res.status(500).json({ error: 'Failed to create order' });
    }
  }
});

async function updateOrderStatus(orderId, newStatus) {
  await pool.query(
    'INSERT INTO order_status_history(order_id, status) VALUES($1, $2)',
    [orderId, newStatus]
  );
}

// Call this function whenever status changes

// Update order status (for admin/internal use)
app.patch('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Publish status update to RabbitMQ
    rabbitChannel.sendToQueue(
      'status_updates',
      Buffer.from(JSON.stringify({
        orderId: id,
        newStatus: status,
        updatedAt: new Date()
      }))
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==============
// Server Startup
// ==============
async function startServer() {
  try {
    await Promise.all([
      connectRedis(),
      connectRabbitMQ()
    ]);
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`
      Server running on port ${PORT}
      Connected to:
      - PostgreSQL: ${pool.options.host}
      - Redis: ${redisClient.options.url}
      - RabbitMQ: amqp://${process.env.RABBITMQ_HOST || 'rabbitmq'}
      `);
    });
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}

startServer();