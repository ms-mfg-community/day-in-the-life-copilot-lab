"""Services package — mirrors ContosoUniversity.Infrastructure.Services and ContosoUniversity.Web.Services."""

__all__ = [
    "search_students",
    "StudentSearchCriteria",
    "PagedResult",
    "send_notification",
    "receive_notification",
    "get_notifications",
    "get_unread_notifications",
    "mark_as_read",
    "mark_all_as_read",
    "upload_file",
    "delete_file",
    "allowed_file",
]

from app.services.student_query_service import (
    search_students,
    StudentSearchCriteria,
    PagedResult,
)
from app.services.notification_service import (
    send_notification,
    receive_notification,
    get_notifications,
    get_unread_notifications,
    mark_as_read,
    mark_all_as_read,
)
from app.services.file_storage_service import (
    upload_file,
    delete_file,
    allowed_file,
)
