## **Bakery Management System**

A containerized full-stack bakery ordering platform demonstrating Docker orchestration with PostgreSQL, Flask, Redis, and RabbitMQ.

## **System Architecture**  
The system follows a microservices architecture with five core components:  
```

├───────────────────┬───────────────────┬───────────────────────────────┤
│    [Frontend]     │     [Backend]     │         [Services]            │
│  HTML/CSS/JS      │  Node.js          │                               │
│                   │                   │  ┌────────────┐  ┌──────────┐ │
│                   │                   │  │  PostgreSQL│  │  Redis   │ │
│  http://localhost:│  http://localhost:│  │  Database  │  │  Cache   │ │
│  8080             │  5000             │  └──────┬─────┘  └────┬─────┘ │
└──────────┬────────┴─────────┬─────────┘         │              │       │
           |                                                     │       │
           |  HTTP Requests                       │              │       │
           ├─────────────────►   ┌───────────────┐│              │       │
                                 │ Data Storage  ├┤              │       │
                                 │ & Retrieval   ││              │       │
                                 └───────────────┘│              │       │
                                                  │              │       │
                                 ┌───────────────┐│  ┌───────────┴─────┐ │
                                 │ Order         ├┼──► RabbitMQ        │ │
                                 │ Processing    ││  │ Message Queue   │ │
                                 └───────────────┘│  └─────────────────┘ │
                       │
                                                                          │
           ◄──────────────────┴───────────────────────────────────────────┤
│                        Docker Network                                  │
└───────────────────────────────────────────────────────────────────────┘
```
1. **Frontend Service**: HTML/CSS/JS files  
2. **Backend Service**: Handling business logic  
3. **Database Service**: PostgreSQL for persistent order storage  
4. **Cache Service**: Redis for product catalog caching  
5. **Message Broker**: RabbitMQ for asynchronous order processing  

Services communicate through Docker's internal network while remaining isolated. The frontend connects to the backend API, which in turn interacts with the database, cache, and message queue.

---

## **Setup & Deployment**  

### **Requirements**  
- Docker Desktop   

### **Installation Steps**  
1. Create project directory:  
   `mkdir bakery-system && cd bakery-system`  

2. Build containers:  
   `docker compose up --build`  

### **Access Points**  
- **Website**: http://localhost:8080  
- **Backend API**: http://localhost:5000  
- **RabbitMQ Management**: http://localhost:15672 (username: guest, password: guest)  

---

## **API Reference**  

### **Product Endpoints**  
**GET /products**  
Returns all available bakery products with prices.  

**Example Response**:  
```json
[
  {"id": 1, "name": "Croissant", "price": 50},
  {"id": 2, "name": "Baguette", "price": 50}
]
```

### **Order Endpoints**  
**POST /order**  
Accepts JSON array of product items. Publishes to RabbitMQ queue.  

**Required Format**:  
```json
[{"product_id": 1, "quantity": 2}]
```

**GET /status/<order_id>**  
Returns current status of specified order.  
 

---

## **Technical Implementation**  

### **Key Design Choices**  
1. **Database**: PostgreSQL ensures ACID for order transactions  
2. **Caching**: Redis reduces database load for frequent product queries  
3. **Messaging**: RabbitMQ enables scalable order processing  
4. **Isolation**: Docker networks separate frontend/backend traffic  

### **Database Schema**  
The system uses two primary tables:  
- `products`   
- `order` 


---

## **System Verification**  

1. **Check running containers**:  
   `docker ps`  

2. **Inspect database**:  
   `docker exec -it bakery_db psql -U postgres -d bakery_db`  
   Then run SQL queries like:  
   `SELECT * FROM orders;`  

3. **View service logs**:  
   `docker compose logs -f backend`  

4. **Inspecting health of containers**
   `docker ps --format "table {{.Names}}\t{{.Status}}"`
---

## **Development Notes**  

The implementation includes:  
- Comprehensive health checks for services  
- Persistent Docker volumes for database storage  

This documentation demonstrates a complete containerized system built.
