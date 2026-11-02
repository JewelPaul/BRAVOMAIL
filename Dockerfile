FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY server/package.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/src ./src

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["node", "src/index.js"]
