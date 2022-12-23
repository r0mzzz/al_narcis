FROM node:16-alpine

WORKDIR /app

COPY . .

RUN npm install


EXPOSE 5100

CMD ["npm", "run", "start:dev"]
