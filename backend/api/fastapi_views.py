import os
from dotenv import load_dotenv
from django.core.asgi import get_asgi_application
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from asgiref.sync import sync_to_async
from .api_scheduler import lifespan

load_dotenv()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_django.settings')
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

@app.get('/api/health')
async def health():
    from api.models import Task, Item
    try:
        if await sync_to_async(Item.objects.count)() == 0 or await sync_to_async(Task.objects.count)() == 0:
            raise Exception('data base has not been initialized')
        return {"status":"ok"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
