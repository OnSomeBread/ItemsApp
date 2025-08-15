<p>first with docker installed</p>
<p>run for the dev server</p>
<p>docker compose up --build</p>
<p>then go to localhost:5173</p><br>

<p>for the production server run</p>
<p>docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build</p>
<p>then go to localhost:5172</p><br>

all data is pulled using a GraphQL api from [`tarkov-api`](https://github.com/the-hideout/tarkov-api)

<h2>DisplayItems Page</h2>
<img src=".\image previews\DisplayItems_example.png">
<h2>ItemView Page</h2>
<img src=".\image previews\ItemView_example.png">
<h2>DisplayTasks Page</h2>
<img src=".\image previews\DisplayTasks_example.png">
<h2>TaskView Page</h2>
<img src=".\image previews\TaskView_example.png">
