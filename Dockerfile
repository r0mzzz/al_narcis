FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

EXPOSE 80

CMD ["npm", "run", "start:dev"]
