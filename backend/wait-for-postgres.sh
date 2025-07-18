set -e

host="$1"
shift
cmd="$@"

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' > /dev/null 2>&1; do
  echo "Waiting for Postgres at $host..."
  sleep 1
done

echo "Postgres is ready. Running command: $cmd"
exec $cmd
