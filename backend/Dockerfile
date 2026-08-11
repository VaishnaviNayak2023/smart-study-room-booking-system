FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

# Default listen port inside the container (override with PORT / BACKEND_PORT).
EXPOSE 5006

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm start"]
