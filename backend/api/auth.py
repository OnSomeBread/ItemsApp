from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
import jwt
import os

JWT_SECRET = os.environ['SECRET_KEY']
JWT_ALGORITHM = os.environ['ALGORITHM']
EXPIRE_TIME_MINUTES = 30

def create_access_token(data:dict):
    to_encode = data.copy()
    to_encode['expire'] = datetime.now(datetime.timezone.utc) + (EXPIRE_TIME_MINUTES * 60)
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token:str):
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithm=JWT_ALGORITHM)
        if decoded['expire'] < datetime.now(datetime.timezone.utc):
            return None
        return decoded
    except Exception:
        return None
    
oauth2_schema = OAuth2PasswordBearer(tokenUrl='token')
User = get_user_model()

async def get_user_data(token: str = Depends(oauth2_schema)):
    payload = decode_token(token)
    if not payload:
        return HTTPException(status_code=401, detail='Invalid token')
    
    try:
        return await sync_to_async(User.objects.get)(id=payload['userid'])
    except Exception:
        raise HTTPException(status_code=404, detail='User not found')