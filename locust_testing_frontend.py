from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)
    host = "http://localhost:5173"

    def on_start(self):
        self.client.headers.update({"Connection": "close"})

    @task
    def visit_display_items(self):
        self.client.get('')

    @task
    def visit_display_tasks(self):
        self.client.get('/tasks')
