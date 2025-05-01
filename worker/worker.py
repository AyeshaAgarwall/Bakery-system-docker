import json
import os
import pika
import psycopg2
import time
import logging

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

# PostgreSQL configuration
DB_HOST = os.environ.get("DB_HOST", "database")
DB_NAME = os.environ.get("POSTGRES_DB", "bakery_db")
DB_USER = os.environ.get("POSTGRES_USER", "postgres_user")
DB_PASS = os.environ.get("POSTGRES_PASSWORD", "postgres_password")

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

def callback(ch, method, properties, body):
    logging.info("Received order message")
    order = json.loads(body)
    order_id = order['order_id']

    # Simulate order processing time
    time.sleep(5)

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE orders SET status = 'Confirmed' WHERE id = %s", (order_id,))
        conn.commit()
        cur.close()
        conn.close()
        logging.info(f"Order #{order_id} status updated to Confirmed")
    except Exception as e:
        logging.error(f"Failed to update order #{order_id}: {e}")

def main():
    logging.info("Worker waiting for messages...")
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
    channel = connection.channel()

    channel.queue_declare(queue='orders')
    channel.basic_consume(queue='orders', on_message_callback=callback, auto_ack=True)

    channel.start_consuming()

if __name__ == '__main__':
    main()
