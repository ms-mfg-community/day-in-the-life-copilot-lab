"""Notification service — mirrors ContosoUniversity.Web.Services.LocalNotificationService."""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone

from app.models.enums import EntityOperation
from app.models.notification import Notification
from app import db

logger = logging.getLogger(__name__)

# In-memory store for development — mirrors .NET static List<Notification>
_notifications: list[Notification] = []
_lock = threading.Lock()
_next_id = 1


def send_notification(
    entity_type: str,
    entity_id: str,
    operation: EntityOperation,
    entity_display_name: str | None = None,
    user_name: str | None = None,
) -> None:
    """Send a notification — mirrors .NET SendNotification/SendNotificationAsync."""
    global _next_id

    display = entity_display_name or entity_id
    message = _generate_message(entity_type, display, operation)

    notification = Notification(
        entity_type=entity_type,
        entity_id=entity_id,
        operation=operation.value,
        message=message,
        created_at=datetime.now(timezone.utc),
        created_by=user_name or "System",
        is_read=False,
    )

    with _lock:
        notification.id = _next_id
        _next_id += 1
        _notifications.append(notification)

    logger.info(
        "Local notification sent: %s %s %s",
        entity_type, entity_id, operation.value,
    )


def receive_notification() -> Notification | None:
    """Get first unread notification — mirrors ReceiveNotification."""
    with _lock:
        return next((n for n in _notifications if not n.is_read), None)


def get_notifications(count: int = 10) -> list[Notification]:
    """Get recent notifications — mirrors GetNotifications."""
    with _lock:
        return sorted(_notifications, key=lambda n: n.created_at, reverse=True)[:count]


def get_unread_notifications(count: int = 10) -> list[Notification]:
    """Get recent unread notifications — mirrors GetUnreadNotifications."""
    with _lock:
        unread = [n for n in _notifications if not n.is_read]
        return sorted(unread, key=lambda n: n.created_at, reverse=True)[:count]


def mark_as_read(notification_id: int) -> None:
    """Mark notification as read — mirrors MarkAsRead."""
    with _lock:
        for n in _notifications:
            if n.id == notification_id:
                n.is_read = True
                n.read_at = datetime.now(timezone.utc)
                logger.info("Notification %d marked as read", notification_id)
                return


def mark_all_as_read() -> None:
    """Mark all notifications as read — mirrors MarkAllAsRead."""
    with _lock:
        now = datetime.now(timezone.utc)
        for n in _notifications:
            if not n.is_read:
                n.is_read = True
                n.read_at = now
        logger.info("All notifications marked as read")


def _generate_message(entity_type: str, display_name: str, operation: EntityOperation) -> str:
    """Generate notification message — mirrors .NET GenerateMessage."""
    match operation:
        case EntityOperation.CREATE:
            return f"New {entity_type} '{display_name}' was created"
        case EntityOperation.UPDATE:
            return f"{entity_type} '{display_name}' was updated"
        case EntityOperation.DELETE:
            return f"{entity_type} '{display_name}' was deleted"
        case _:
            return f"{operation.value} operation performed on {entity_type} '{display_name}'"
