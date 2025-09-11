FROM node:current-alpine3.22 AS build
WORKDIR /ItemsApp

COPY ./package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:current-alpine3.22
WORKDIR /ItemsApp
COPY --from=build /ItemsApp/.next/standalone ./
COPY --from=build /ItemsApp/.next/static ./.next/static
COPY --from=build /ItemsApp/public ./public

EXPOSE 3000
CMD ["node", "server.js"]

