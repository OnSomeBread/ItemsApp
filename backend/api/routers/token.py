from fastapi import APIRouter, Depends, HTTPException
from ..auth import create_access_token, create_refresh_token, get_user_data, decode_token
from django.contrib.auth import authenticate, get_user_model
from asgiref.sync import sync_to_async

router = APIRouter(prefix='/token', tags=['token'])

User = get_user_model()

@router.post('/signup')
async def signup(user_data: dict):
    email = user_data['email']
    password = user_data.get('password')

    # check if email already in the db
    if await sync_to_async(User.objects.filter(email=email).exists)():
        raise HTTPException(status_code=400, detail='Email already registered')

    user = User(email=email, preferences_tasks=user_data.get('preferences_tasks'), preferences_items=user_data.get('preferences_items'))
    user.set_password(password)
    await sync_to_async(user.save)()

    token = create_access_token(data={'userid': str(user.id), 'type': 'access'})
    return {
        'access_token': token, 
        'token_type':'bearer'
    }

@router.post('/login')
async def login(user_data:dict):
    email = user_data['email']
    password = user_data['password']
    user = await sync_to_async(authenticate)(username=email, password=password)
    if not user:
        raise HTTPException(status_code=400, detail='Incorrect email or password')
    access_token = create_access_token(data={'userid': str(user.id), 'type': 'access'})
    refresh_token = create_refresh_token(data={'userid': str(user.id), 'type': 'refresh'})
    return {'access_token': access_token, 'refresh_token': refresh_token, 'token_type':'bearer'}

@router.post('/refresh')
async def refresh(refresh_token: str):
    payload = decode_token(refresh_token)
    if not payload or payload['type'] != 'refresh':
        return HTTPException(status_code=401, detail='invalid refresh token')
    
    access_token = create_access_token(data={'userid': payload['userid'], 'type': 'access'})
    return {'access_token': access_token, 'token_type':'bearer'}

@router.get('/me')
async def get_user_me(current_user=Depends(get_user_data)):
    if type(current_user) == HTTPException:
        return current_user
    return {'id':current_user.id, 'email':current_user.email}

# get preferences for a page
@router.get('/pref')
async def get_user_pref(preferences:dict, current_user=Depends(get_user_data)):
    page = preferences['page'].pop()
    if page == 'tasks':
        {'preferences_tasks':current_user.preferences_tasks}
    elif page == 'items':
        {'preferences_items':current_user.preferences_items}
    return {}

# replaces preferences
@router.post('/change_pref')
async def change_user_pref(preferences:dict, current_user=Depends(get_user_data)):
    page = preferences['page'].pop()
    if page == 'tasks':
        current_user.preferences_tasks = preferences
    elif page == 'items':
        current_user.preferences_items = preferences

    await sync_to_async(current_user.save)()
    return {}

# only creates keys
@router.post('/add_pref')
async def add_user_pref(preferences:dict, current_user=Depends(get_user_data)):
    page = preferences['page'].pop()
    if page == 'tasks':
        prefs = current_user.preferences_tasks
    elif page == 'items':
        prefs = current_user.preferences_items

    for key, value in preferences.items():
        prefs[key] = value

    await sync_to_async(current_user.save)()
    return {}

# only removes keys
@router.post('/remove_pref')
async def remove_user_pref(preferences:dict, current_user=Depends(get_user_data)):
    page = preferences['page'].pop()
    if page == 'tasks':
        prefs = current_user.preferences_tasks
    elif page == 'items':
        prefs = current_user.preferences_items

    for key, value in preferences.items():
        del prefs[key]

    await sync_to_async(current_user.save)()
    return {}

# deletes preferences for the select page
@router.post('/clear_preferences')
async def change_user_pref_items(preferences:dict, current_user=Depends(get_user_data)):
    page = preferences['page'].pop()
    if page == 'tasks':
        current_user.preferences_tasks = {}
    elif page == 'items':
        current_user.preferences_items = {}
    await sync_to_async(current_user.save)()

    return {}