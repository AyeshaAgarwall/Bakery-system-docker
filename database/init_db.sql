CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    status TEXT DEFAULT 'Processing'
);

INSERT INTO products (name, price) VALUES
-- Existing
('Cookies  ', 40),
('Jeera Cookies  ', 25),
('Cake  ', 35),
('Chocolate Cake  ', 20),
('Patties  ', 28),
('Vanilla Cake  ', 45),
('Fruit Cake  ', 50),
('Cream Roll  ', 40),
('Donut  ', 22),
('Croissant  ', 70),
('Blueberry Muffin  ', 60),
('Chocolate Doughnut  ', 50),
('Apple Pie  ', 90),
('Brownie  ', 80),
('Garlic Breadsticks  ', 55),
('Cinnamon Roll  ', 75),
('Vanilla Cupcake  ', 45);