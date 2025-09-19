# sqlx database create
# cargo sqlx prepare 
# both commands required before running dockerfile

FROM rust:1.89.0-slim AS builder
WORKDIR /ItemsApp
RUN rustup target add x86_64-unknown-linux-musl
COPY . .
RUN cargo install sqlx-cli --no-default-features --features postgres
ENV SQLX_OFFLINE=true
RUN cargo build --release --target x86_64-unknown-linux-musl


FROM scratch
WORKDIR /ItemsApp

COPY --from=builder /ItemsApp/target/x86_64-unknown-linux-musl/release/backend-rust .
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /ItemsApp/migrations ./migrations

CMD ["./backend-rust"]