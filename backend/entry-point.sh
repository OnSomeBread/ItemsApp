# postgresql wait
./wait-for-it.sh db:5432 --timeout=30 --strict

# redis wait
./wait-for-it.sh redis:6379 --timeout=30 --strict

exec "$@"