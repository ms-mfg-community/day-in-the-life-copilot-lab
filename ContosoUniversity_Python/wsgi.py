"""WSGI entry point for production deployment.

Usage with gunicorn:
    gunicorn -w 4 -b 0.0.0.0:8000 wsgi:app

Usage with waitress:
    waitress-serve --port=8000 wsgi:app
"""

from app import create_app

app = create_app()
