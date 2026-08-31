"""Pytest configuration: initialise an in-memory MongoDB mock before any test."""

import mongoengine
import mongomock
import pytest


@pytest.fixture(autouse=True, scope="session")
def mongo_connection():
    """Connect MongoEngine to an in-memory mongomock instance for all tests."""
    mongoengine.connect(
        "testdb",
        host="mongodb://localhost",
        mongo_client_class=mongomock.MongoClient,
        uuidRepresentation="standard",
    )
    yield
    mongoengine.disconnect()
