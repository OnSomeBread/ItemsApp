FROM python:slim
WORKDIR /ItemsApp

COPY backend/requirements.txt requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["gunicorn", "backendDjango.wsgi:application", "--bind", "0.0.0.0:8000"]