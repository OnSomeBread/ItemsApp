first install docker then run for the dev server<br>
docker compose up<br><br>

for the production server run<br>
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build<br><br>

then go to localhost:5173 for dev server or localhost:3000 for prod server

all data is pulled using a GraphQL api from [`tarkov-api`](https://github.com/the-hideout/tarkov-api)

<img src=".\image previews\example0.png">
<img src=".\image previews\example1.png">
