# needs to run before running docker file
# cargo sqlx prepare 

FROM rust:1.90.0-slim AS builder
WORKDIR /ItemsApp
COPY . .
ENV SQLX_OFFLINE=true
RUN cargo +nightly build --release

FROM debian:bookworm-slim
WORKDIR /ItemsApp

RUN apt-get update && apt-get install -y libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /ItemsApp/target/release/backend-rust .
COPY ./migrations ./migrations

EXPOSE 8000
CMD ["./backend-rust"]
