# app/core/dbConnection.py

from mongoengine import connect, disconnect

from app.core.config import settings


def connect_to_mongodb():
    connect(
        db=settings.MONGO_DB_NAME,
        host=settings.MONGO_URI,
        alias="default",
    )


def disconnect_from_mongodb():
    disconnect(alias="default")