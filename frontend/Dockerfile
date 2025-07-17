FROM node:20-alpine as build

WORKDIR /ItemsApp

COPY frontend/package*.json .
RUN npm install

COPY frontend/ .
RUN npm run build

FROM nginx:alpine

COPY --from=build /ItemsApp/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
