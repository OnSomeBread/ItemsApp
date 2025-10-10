all: deploy

dbs:
	docker compose -f docker-compose.dbs.yml up -d

prod:
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up --build

deploy:
	docker compose up --build

down:
	docker compose -f docker-compose.dbs.yml down
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml down
	docker compose down