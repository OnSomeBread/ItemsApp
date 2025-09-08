from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 2)
    host = "http://localhost:3000"

    def on_start(self):
        self.client.headers.update({"Connection": "close"})

    @task
    def visit_display_items(self):
        with self.client.get('/items', catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Failed with status {response.status_code}")

    @task
    def visit_display_tasks(self):
        with self.client.get('/tasks', catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Failed with status {response.status_code}")

    @task
    def visit_display_task_tree(self):
        with self.client.get('/task_tree', catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"Failed with status {response.status_code}")
