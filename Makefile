.PHONY: all backend frontend deploy

all: deploy

dev:
	docker compose up --build

prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build

backend:
	docker build -t itemsapp_backend_stack -f backend/Dockerfile .

frontend:
	docker build -t itemsapp_frontend_stack -f frontend/Dockerfile .

deploy: backend frontend
	docker stack deploy -c docker-stack.yml itemsapp_swarm --detach=false

down:
	docker stack rm itemsapp_swarm
	docker compose down