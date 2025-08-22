.PHONY: all backend_stack frontend_stack deploy

all: deploy

dev:
	docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up --build

prod:
	docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up --build

backend_stack:
	docker build -t itemsapp_backend_stack -f backend/Dockerfile .

frontend_stack:
	docker build -t itemsapp_frontend_stack -f frontend/Dockerfile .

deploy: backend_stack frontend_stack
	docker stack deploy -c docker-stack.yml itemsapp_stack --detach=false

down:
	docker stack rm itemsapp_stack
	docker compose down