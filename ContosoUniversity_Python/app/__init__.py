"""ContosoUniversity Flask application factory."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect

# Extensions initialized without app — bound in create_app
db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()

logger = logging.getLogger(__name__)


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask application.

    Mirrors .NET Program.cs / WebApplication.CreateBuilder pattern.

    Args:
        config_name: Configuration to use (development/testing/production).
            Defaults to FLASK_ENV environment variable or 'development'.
    """
    app = Flask(
        __name__,
        template_folder="templates",
        static_folder="static",
    )

    # Load configuration
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    from config import config as config_map

    app.config.from_object(config_map[config_name])

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)

    login_manager.login_view = "auth.sign_in"
    login_manager.login_message_category = "info"

    # Ensure upload directory exists
    upload_path = Path(app.config.get("UPLOAD_FOLDER", "app/static/uploads"))
    upload_path.mkdir(parents=True, exist_ok=True)

    # Register blueprints (routes)
    _register_blueprints(app)

    # Initialize database
    with app.app_context():
        _init_database(app)

    logger.info("ContosoUniversity Flask app created with config: %s", config_name)
    return app


def _register_blueprints(app: Flask) -> None:
    """Register all route blueprints — mirrors .NET MapControllerRoute."""
    from app.routes.home import home_bp
    from app.routes.students import students_bp
    from app.routes.courses import courses_bp
    from app.routes.departments import departments_bp
    from app.routes.instructors import instructors_bp
    from app.routes.auth import auth_bp

    app.register_blueprint(home_bp)
    app.register_blueprint(students_bp, url_prefix="/students")
    app.register_blueprint(courses_bp, url_prefix="/courses")
    app.register_blueprint(departments_bp, url_prefix="/departments")
    app.register_blueprint(instructors_bp, url_prefix="/instructors")
    app.register_blueprint(auth_bp, url_prefix="/account")


def _init_database(app: Flask) -> None:
    """Initialize database and seed data — mirrors .NET DbInitializer.InitializeAsync."""
    from app.models import import_all_models
    from app.seed import seed_database

    import_all_models()
    db.create_all()
    seed_database(db)
    logger.info("Database initialized")
