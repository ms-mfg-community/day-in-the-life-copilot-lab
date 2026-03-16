"""Authentication routes — sign-in, sign-out, and access denied."""
# .NET equivalent: ContosoUniversity.Web.Controllers.AccountController

from __future__ import annotations

import logging

from flask import Blueprint, current_app, redirect, render_template, url_for
from flask_login import UserMixin, current_user, login_user, logout_user

from app import login_manager

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)


class DevUser(UserMixin):
    """Development-only user with admin roles for local testing."""

    def __init__(self) -> None:
        self.id = "local-admin"
        self.name = "Test Admin"
        self.email = "admin@contosouniversity.local"
        self.roles = ["Admin", "Teacher", "Administrator"]

    def has_role(self, role: str) -> bool:
        return role in self.roles


# Singleton dev user
_dev_user = DevUser()


@login_manager.user_loader
def load_user(user_id: str) -> DevUser | None:
    """Load user by ID — returns dev user in development mode."""
    if user_id == "local-admin":
        return _dev_user
    return None


@auth_bp.route("/sign-in")
def sign_in():
    """Sign in — auto-login in development, OAuth in production."""
    if current_app.config.get("AUTO_LOGIN_ENABLED"):
        login_user(_dev_user)
        logger.info(
            "Local development: Signed in as Test Admin with roles: %s",
            ", ".join(_dev_user.roles),
        )
        return redirect(url_for("home.index"))

    # In production, redirect to OAuth provider
    return redirect(url_for("home.index"))


@auth_bp.route("/sign-out")
def sign_out():
    """Sign out the current user and redirect to home."""
    logout_user()
    return redirect(url_for("home.index"))


@auth_bp.route("/access-denied")
def access_denied():
    """Render the 403 access denied page."""
    return render_template("auth/access_denied.html"), 403
