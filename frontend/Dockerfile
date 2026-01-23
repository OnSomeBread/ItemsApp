FROM oven/bun:1.3.6-alpine AS build
WORKDIR /frontend

COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build
FROM oven/bun:1.3.6-alpine
WORKDIR /frontend

COPY --from=build /frontend/.next/standalone ./
COPY --from=build /frontend/.next/static ./.next/static
COPY --from=build /frontend/public ./public

EXPOSE 3000
CMD ["bun", "server.js"]
