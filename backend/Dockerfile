FROM messense/rust-musl-cross:x86_64-musl as chef
ENV SQLX_OFFLINE=true
RUN cargo install cargo-chef
WORKDIR /backend

FROM chef AS planner
COPY . .
# Generate info for caching dependencies
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /backend/recipe.json recipe.json
# Build & cache dependencies
RUN cargo chef cook --release --target x86_64-unknown-linux-musl --recipe-path recipe.json
COPY . .

# Build
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM scratch
COPY --from=builder /backend/target/x86_64-unknown-linux-musl/release/backend /backend
COPY ./migrations ./migrations

ENTRYPOINT ["/backend"]
EXPOSE 8000
