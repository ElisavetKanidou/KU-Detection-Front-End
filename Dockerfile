FROM node:19-bullseye
WORKDIR /app
COPY . .
RUN npm i
EXPOSE 5173
CMD [ "npm", "run", "dev"]