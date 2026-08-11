FROM node:22-alpine

WORKDIR /app

COPY booking-configuration/package*.json ./
RUN npm install

COPY booking-configuration/ ./

EXPOSE 9000

CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0 --port 9000"]
