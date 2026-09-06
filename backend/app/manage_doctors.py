"""Explicit administrative CLI for the OPD roster; never grants a role via patient input."""
import argparse
from app.core.dbConnection import connect_to_mongodb, disconnect_from_mongodb
from app.models.continuity import Doctor
from app.models.user import User


def main():
    parser = argparse.ArgumentParser(description="Provision an existing account as an OPD physician")
    parser.add_argument("user_id", help="Existing User MongoDB id; becomes the physician JWT subject")
    parser.add_argument("--department", default="General Medicine")
    parser.add_argument("--off-duty", action="store_true")
    args = parser.parse_args()
    connect_to_mongodb()
    try:
        user = User.objects(pk=args.user_id, is_active=True).first()
        if not user:
            parser.error("Active account not found")
        if user.staff_role == "lab_assistant":
            parser.error("Revoke lab access before provisioning a physician")
        Doctor.objects(pk=args.user_id).update_one(upsert=True, set__full_name=user.full_name,
                                                  set__department=args.department, set__on_duty=not args.off_duty)
        print("Physician roster updated. Sign in again to obtain the physician role.")
    finally:
        disconnect_from_mongodb()


if __name__ == "__main__":
    main()
