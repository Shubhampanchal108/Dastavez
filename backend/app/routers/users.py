from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_roles
from app.models.user import User
from app.schemas.users import UserDirectoryItem


router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/directory", response_model=list[UserDirectoryItem])
def get_user_directory(
    q: str | None = Query(default=None, min_length=1, max_length=150),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN", "INVESTIGATOR")),
):
    statement = select(User.id, User.name, User.email, User.role).where(User.is_active.is_(True))
    if q:
        search = f"%{q.strip()}%"
        statement = statement.where(
            or_(User.name.ilike(search), User.email.ilike(search), User.role.ilike(search))
        )
    rows = db.execute(statement.order_by(User.name)).mappings().all()
    return [UserDirectoryItem.model_validate(row) for row in rows]
