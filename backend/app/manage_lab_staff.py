"""Explicit local administration of lab permissions; no public role-registration API."""
import argparse
from app.core.dbConnection import connect_to_mongodb, disconnect_from_mongodb
from app.services.user_index_migration import migrate_optional_identity_indexes
from app.models.user import User
from app.models.continuity import Doctor


def main():
    parser = argparse.ArgumentParser(description="Grant or revoke lab access for an existing account")
    parser.add_argument("user_id")
    parser.add_argument("--revoke", action="store_true")
    args = parser.parse_args()
    connect_to_mongodb()
    try:
        migrate_optional_identity_indexes()
        user = User.objects(pk=args.user_id, is_active=True).first()
        if not user:
            parser.error("Active account not found")
        if not args.revoke and Doctor.objects(pk=args.user_id).first():
            parser.error("Remove the physician roster entry before granting a lab role")
        user.staff_role = "patient" if args.revoke else "lab_assistant"
        user.refresh_token_revoked = True
        user.save()
        print("Lab permissions updated. Sign in again to use the new role.")
    finally:
        disconnect_from_mongodb()


if __name__ == "__main__":
    main()
