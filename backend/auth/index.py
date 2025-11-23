'''
Business: User registration and authentication for chess platform
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with user data or error
'''

import json
import os
import hashlib
import secrets
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, EmailStr, ValidationError

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${pwd_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, pwd_hash = stored_hash.split('$')
        return hashlib.sha256((password + salt).encode()).hexdigest() == pwd_hash
    except:
        return False


def get_db_connection():
    if not psycopg2:
        raise Exception("psycopg2 not available")
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        raise Exception("DATABASE_URL not configured")
    
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'register':
                reg_req = RegisterRequest(**body_data)
                
                conn = get_db_connection()
                cur = conn.cursor()
                
                cur.execute(
                    "SELECT id FROM users WHERE username = %s OR email = %s",
                    (reg_req.username, reg_req.email)
                )
                existing = cur.fetchone()
                
                if existing:
                    cur.close()
                    conn.close()
                    return {
                        'statusCode': 400,
                        'headers': headers,
                        'body': json.dumps({'error': 'Username or email already exists'}),
                        'isBase64Encoded': False
                    }
                
                password_hash = hash_password(reg_req.password)
                
                cur.execute(
                    """INSERT INTO users (username, email, password_hash) 
                       VALUES (%s, %s, %s) 
                       RETURNING id, username, email, rating""",
                    (reg_req.username, reg_req.email, password_hash)
                )
                user = cur.fetchone()
                conn.commit()
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 201,
                    'headers': headers,
                    'body': json.dumps({
                        'success': True,
                        'user': dict(user)
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'login':
                login_req = LoginRequest(**body_data)
                
                conn = get_db_connection()
                cur = conn.cursor()
                
                cur.execute(
                    """SELECT id, username, email, password_hash, rating, games_played, games_won, games_drawn
                       FROM users WHERE username = %s""",
                    (login_req.username,)
                )
                user = cur.fetchone()
                
                if not user or not verify_password(login_req.password, user['password_hash']):
                    cur.close()
                    conn.close()
                    return {
                        'statusCode': 401,
                        'headers': headers,
                        'body': json.dumps({'error': 'Invalid username or password'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s",
                    (user['id'],)
                )
                conn.commit()
                
                user_data = dict(user)
                del user_data['password_hash']
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'success': True,
                        'user': user_data
                    }),
                    'isBase64Encoded': False
                }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid action'}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    except ValidationError as e:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Validation error', 'details': e.errors()}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
