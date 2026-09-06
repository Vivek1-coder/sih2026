"""Keep identity uniqueness while allowing provisional patients with one identifier."""
from mongoengine.connection import get_db


def migrate_optional_identity_indexes():
    collection = get_db()["users"]
    indexes = collection.index_information()
    for field in ("aadhaar", "mobile"):
        for name, spec in indexes.items():
            if spec["key"] == [(field, 1)] and not spec.get("sparse"):
                collection.drop_index(name)
        collection.create_index([(field, 1)], unique=True, sparse=True)
