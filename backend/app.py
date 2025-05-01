from flask import Flask, request, jsonify
from flask_cors import CORS

import psycopg2
import os
import redis
import json
import pika
import logging
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')


app = Flask(__name__)
CORS(app)

# DB config
DB_HOST = os.environ.get("DB_HOST", "database")
DB_NAME = os.environ.get("POSTGRES_DB", "bakery_db")
DB_USER = os.environ.get("POSTGRES_USER", "postgres_user")
DB_PASS = os.environ.get("POSTGRES_PASSWORD", "postgres_password")


def get_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS
        )
        print(f"[DB LOG], Connected to PostgreSQL at {DB_HOST} as {DB_USER}")
        return conn
    except Exception as e:
        print(f"[DB ERROR], Failed to connect to PostgreSQL: {e}")
        raise



REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
r = redis.Redis(host=REDIS_HOST, port=6379, db=0)

@app.route('/products', methods=['GET'])
def get_products():
    cached = r.get('products')
    if cached:
        logging.info("Served products from Redis cache")
        return jsonify(json.loads(cached))

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, price FROM products")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    products = [{"id": r[0], "name": r[1], "price": r[2]} for r in rows]
    r.setex('products', 60, json.dumps(products))  # 60 sec TTL
    logging.info("Products served from DB and cached")
    return jsonify(products)


def publish_order(order):
    conn = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
    channel = conn.channel()
    channel.queue_declare(queue='orders')
    channel.basic_publish(exchange='', routing_key='orders', body=json.dumps(order))
    conn.close()
    logging.info("Order sent to RabbitMQ")

@app.route('/order', methods=['POST'])
def place_order():
    items = request.json
    total = sum([item['price'] for item in items])
    items_str = ", ".join([item['name'] for item in items])

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO orders (items, total) VALUES (%s, %s) RETURNING id", (items_str, total))
    order_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    publish_order({"order_id": order_id, "items": items, "total": total})
    return jsonify({"message": "Order placed successfully", "order_id": order_id})


@app.route('/status/<int:order_id>', methods=['GET'])
def check_status(order_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT status FROM orders WHERE id = %s", (order_id,))
    result = cur.fetchone()
    cur.close()
    conn.close()
    if result:
        return jsonify({"order_id": order_id, "status": result[0]})
    return jsonify({"error": "Order not found"}), 404


@app.route('/health', methods=['GET'])
def health_check():
    try:
        get_connection().close()
        r.ping()
        pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq")).close()
        return jsonify({"status": "healthy"})
    except Exception as e:
        logging.error(f"Health check failed: {e}")
        return jsonify({"status": "unhealthy"}), 500




if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
