"""Home routes — mirrors ContosoUniversity.Web.Controllers.HomeController."""

from __future__ import annotations

import logging

from flask import Blueprint, render_template
from sqlalchemy import func, select

from app import db
from app.models.student import Student

logger = logging.getLogger(__name__)

home_bp = Blueprint("home", __name__)


@home_bp.route("/")
def index():
    """Home page — mirrors .NET HomeController.Index."""
    return render_template("home/index.html")


@home_bp.route("/about")
def about():
    """About page with enrollment statistics — mirrors .NET HomeController.About."""
    stats = db.session.execute(
        select(
            Student.enrollment_date,
            func.count(Student.id).label("student_count"),
        )
        .group_by(Student.enrollment_date)
        .order_by(Student.enrollment_date)
    ).all()

    return render_template("home/about.html", enrollment_stats=stats)


@home_bp.route("/privacy")
def privacy():
    """Privacy page — mirrors .NET HomeController.Privacy."""
    return render_template("home/privacy.html")
