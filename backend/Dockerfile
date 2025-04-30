FROM node:16-alpine

WORKDIR /app

# Copy package.json first
COPY package.json .

# Install dependencies (works with or without package-lock.json)
RUN npm install --production

# Copy the rest of the application
COPY . .

EXPOSE 3000

CMD ["node", "app.js"]