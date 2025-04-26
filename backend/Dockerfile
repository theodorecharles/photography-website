FROM node:20-slim

# Install ImageMagick and other dependencies
RUN apt-get update && apt-get install -y \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

ENV PORT=8080
ENV PHOTOS_DIR=/photos

EXPOSE 8080

CMD ["npm", "start"] 