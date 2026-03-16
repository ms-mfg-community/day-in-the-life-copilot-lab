"""Local file storage service for teaching material image uploads."""
# .NET equivalent: ContosoUniversity.Web.Services.LocalFileStorageService

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from flask import current_app
from werkzeug.datastructures import FileStorage

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def upload_file(file: FileStorage) -> tuple[bool, str | None, str | None]:
    """Upload a file to local storage.

    Returns:
        Tuple of (success, url_or_none, error_message_or_none).
    """
    if not file or not file.filename:
        return False, None, "No file provided"

    if not allowed_file(file.filename):
        return False, None, f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"

    # Check file size
    file.seek(0, 2)
    file_size = file.tell()
    file.seek(0)
    if file_size > MAX_FILE_SIZE:
        return False, None, f"File too large. Maximum size: {MAX_FILE_SIZE // (1024 * 1024)}MB"

    try:
        upload_folder = Path(current_app.config.get("UPLOAD_FOLDER", "app/static/uploads"))
        upload_folder.mkdir(parents=True, exist_ok=True)

        # Generate unique filename with UUID suffix
        ext = Path(file.filename).suffix
        unique_name = f"{Path(file.filename).stem}_{uuid.uuid4()}{ext}"
        file_path = upload_folder / unique_name

        file.save(str(file_path))

        url = f"/static/uploads/{unique_name}"
        logger.info("File saved locally: %s -> %s", file.filename, file_path)
        return True, url, None

    except Exception as e:
        logger.error("Error uploading file %s: %s", file.filename, e)
        return False, None, f"Error uploading file: {e}"


def delete_file(file_url: str) -> bool:
    """Delete a file from local storage by its URL path."""
    try:
        if not file_url:
            return False

        filename = Path(file_url).name
        upload_folder = Path(current_app.config.get("UPLOAD_FOLDER", "app/static/uploads"))
        file_path = upload_folder / filename

        if not file_path.exists():
            logger.warning("File not found for deletion: %s", file_path)
            return False

        file_path.unlink()
        logger.info("File deleted: %s", file_path)
        return True

    except Exception as e:
        logger.error("Error deleting file %s: %s", file_url, e)
        return False
