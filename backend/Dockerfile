FROM python:slim
WORKDIR /ItemsApp

COPY backend/requirements.txt requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["python3", "manage.py", "runserver", "0.0.0.0:8000"]