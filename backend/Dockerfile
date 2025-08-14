FROM python:alpine
RUN apk add --no-cache bash

WORKDIR /ItemsApp

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
RUN chmod +x wait-for-it.sh

EXPOSE 8000

#CMD ["./wait-for-it.sh", "db:5432", "--", "./wait-for-it.sh", "redis:6379", "--", "python3", "manage.py", "runserver", "0.0.0.0:8000"]
CMD ["./wait-for-it.sh", "db:5432", "--", "./wait-for-it.sh", "redis:6379", "--", "uvicorn", "api.fastapi_views:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]