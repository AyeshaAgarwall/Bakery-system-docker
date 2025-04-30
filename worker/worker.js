const amqp = require('amqplib');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'bakery_user',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'bakery_db',
  password: process.env.DB_PASSWORD || 'bakery_password',
  port: 5432,
});

async function processOrder(order) {
  console.log(`Processing order: ${order.id}`);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
  await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2',
    ['completed', order.id]
  );
  console.log(`Order ${order.id} completed`);
}

async function main() {
  const conn = await amqp.connect('amqp://rabbitmq');
  const channel = await conn.createChannel();
  const queue = 'orders';
  await channel.assertQueue(queue, { durable: true });
  
  console.log('Worker waiting for orders...');
  channel.consume(queue, async (msg) => {
    if (msg) {
      const order = JSON.parse(msg.content.toString());
      await processOrder(order);
      channel.ack(msg);
    }
  });
}

main().catch(console.error);