from datetime import datetime

from pydantic import BaseModel


class ABDMPushResponse(BaseModel):
    summary_id: str
    bundle_id: str
    status: str
    pushed_at: datetime
    mock: bool = True

