FROM node:current-alpine3.22 AS build
WORKDIR /ItemsApp

COPY frontend/package*.json .
RUN npm install

COPY frontend/ .

# pruning and clearing cache is unneeded here but kept for future use
RUN npm run build && \
    npm prune --omit=dev && \
    npm cache clean --force && \
    rm -rf /root/.npm && \
    rm -rf node_modules

# only grab the needed files
FROM nginx:stable-alpine3.21-slim
COPY --from=build /ItemsApp/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
