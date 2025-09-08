FROM node:current-alpine3.22 AS build
WORKDIR /ItemsApp

COPY ./package*.json ./
RUN npm ci

COPY . .

# pruning and clearing cache is unneeded here but kept for future use
RUN npm run build

# RUN npm run build && \
#     npm prune --omit=dev && \
#     npm cache clean --force && \
#     rm -rf /root/.npm && \
#     rm -rf node_modules

FROM node:current-alpine3.22
WORKDIR /ItemsApp

COPY --from=build ./ItemsApp/.next ./.next
COPY --from=build ./ItemsApp/public ./public
COPY --from=build ./ItemsApp/package.json ./package.json
COPY --from=build ./ItemsApp/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]

