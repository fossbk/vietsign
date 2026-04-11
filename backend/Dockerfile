FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
# Cài đặt toàn bộ dependencies bao gồm cả devDependencies (nơi chứa nodemon)
RUN npm install
# Cài thêm nodemon global để chắc chắn có thể chạy lệnh nodemon trực tiếp nếu cần
RUN npm install -g nodemon

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
