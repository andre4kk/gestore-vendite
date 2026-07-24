FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Cartella per il database persistente
RUN mkdir -p /data

EXPOSE 3000

CMD ["npm", "start"]
