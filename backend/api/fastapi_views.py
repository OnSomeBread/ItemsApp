from django.core.asgi import get_asgi_application
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api_scheduler import lifespan
from dotenv import load_dotenv
import os

load_dotenv()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backendDjango.settings')
django_app = get_asgi_application()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ['ALLOWED_ORIGINS'].split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/django", django_app)

# this import needs to be after django gets mounted otherwise creates uninitalized settings error
from api.routers import token, items, tasks, pastApi
app.include_router(token.router)
app.include_router(items.router)
app.include_router(tasks.router)
app.include_router(pastApi.router)
