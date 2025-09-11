FROM node:current-alpine3.22 AS build
WORKDIR /ItemsApp

COPY ./package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:current-alpine3.22
WORKDIR /ItemsApp
COPY --from=build /ItemsApp/.next/standalone ./

EXPOSE 3000
CMD ["node", "server.js"]

