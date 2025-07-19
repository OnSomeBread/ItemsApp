FROM python:slim
WORKDIR /ItemsApp

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
RUN chmod +x wait-for-it.sh

EXPOSE 8000
CMD ["./wait-for-it.sh", "db:5432", "--", "./wait-for-it.sh", "redis:6379", "--", "gunicorn", "backendDjango.wsgi:application", "--bind", "0.0.0.0:8000"]