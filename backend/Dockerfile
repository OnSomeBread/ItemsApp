FROM clux/muslrust:1.95.0-nightly-2026-01-21 AS chef
RUN cargo install cargo-chef
WORKDIR /backend
ENV SQLX_OFFLINE=true

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /backend/recipe.json recipe.json
RUN cargo +nightly chef cook --release --target x86_64-unknown-linux-musl --recipe-path recipe.json
COPY . .
RUN cargo +nightly build --release --target x86_64-unknown-linux-musl --bin backend

FROM scratch
COPY --from=builder /backend/target/x86_64-unknown-linux-musl/release/backend /backend
COPY ./migrations ./migrations

ENTRYPOINT ["/backend"]
EXPOSE 8000
