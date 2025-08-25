FROM python:alpine3.22 AS build
WORKDIR /ItemsApp
COPY ./requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:alpine3.22
COPY --from=build /install /usr/local

WORKDIR /ItemsApp
COPY . .
COPY ./wait-for /usr/local/bin/wait-for
RUN chmod +x /usr/local/bin/wait-for

ENV TZ=UTC
EXPOSE 8000

CMD ["wait-for", "db:5432", "--", "wait-for", "redis:6379", "--", "uvicorn", "api.fastapi_views:app", "--host", "0.0.0.0", "--port", "8000"]