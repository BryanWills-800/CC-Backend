FROM node:26-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

COPY backend/src/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./

EXPOSE 3000

CMD ["node", "index.js"]
