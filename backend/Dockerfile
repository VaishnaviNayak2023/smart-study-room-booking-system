FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ ./

EXPOSE 5000

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm start"]
