from typing import List, Optional
import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.notification import Notification, NotificationType


async def create_notification(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.SYSTEM,
    reference_id: Optional[uuid.UUID] = None,
) -> Notification:
    """Dispatches and persists an in-app notification record."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=reference_id,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif


class NotificationService:
    """Business logic service for user notifications."""

    @staticmethod
    async def list_notifications(
        db: AsyncSession,
        user_id: uuid.UUID,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Notification]:
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .order_by(Notification.created_at.desc())
        )
        if unread_only:
            query = query.where(Notification.is_read == False)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: uuid.UUID) -> int:
        from sqlalchemy import func
        query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id, Notification.is_read == False
        )
        return (await db.execute(query)).scalar() or 0

    @staticmethod
    async def mark_read(
        db: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID
    ) -> Notification:
        query = select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
        notif = (await db.execute(query)).scalar_one_or_none()
        if not notif:
            raise NotFoundException("Notification", str(notification_id))

        notif.is_read = True
        await db.commit()
        await db.refresh(notif)
        return notif

    @staticmethod
    async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> None:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        await db.execute(stmt)
        await db.commit()
