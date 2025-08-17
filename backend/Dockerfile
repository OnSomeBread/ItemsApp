FROM python:alpine3.22 AS build
WORKDIR /ItemsApp
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:alpine3.22
RUN apk add --no-cache bash
COPY --from=build /install /usr/local

COPY backend/ .
RUN chmod +x wait-for-it.sh

ENV TZ=UTC
EXPOSE 8000

CMD ["./wait-for-it.sh", "db:5432", "--", "./wait-for-it.sh", "redis:6379", "--", "uvicorn", "api.fastapi_views:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]