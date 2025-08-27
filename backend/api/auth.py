from os import environ
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
from jwt import encode, decode

JWT_SECRET = environ['SECRET_KEY']
JWT_ALGORITHM = "HS256"
ACCESS_EXPIRE_MINUTES = 30
REFRESH_EXPIRE_DAYS = 7

def create_token(data:dict, expire_minutes):
    to_encode = data.copy()
    to_encode['expire'] = (datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)).isoformat()
    return encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_access_token(data:dict):
    return create_token(data, ACCESS_EXPIRE_MINUTES)

def create_refresh_token(data:dict):
    return create_token(data, REFRESH_EXPIRE_DAYS * 60 * 24)

def decode_token(token:str):
    try:
        decoded = decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if datetime.fromisoformat(decoded['expire']) < datetime.now(timezone.utc):
            return None
        return decoded
    except Exception as e:
        print(e)
        return None

oauth2_schema = OAuth2PasswordBearer(tokenUrl='token')
User = get_user_model()

async def get_user_data(token: str = Depends(oauth2_schema)):
    payload = decode_token(token)
    if not payload:
        return HTTPException(status_code=401, detail='Invalid token')

    try:
        return await sync_to_async(User.objects.get)(id=payload['userid'])
    except Exception as exc:
        raise HTTPException(status_code=404, detail='User not found') from exc
