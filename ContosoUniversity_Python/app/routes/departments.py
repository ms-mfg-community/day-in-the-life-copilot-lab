"""Department routes — CRUD operations with administrator selection."""
# .NET equivalent: ContosoUniversity.Web.Controllers.DepartmentsController

from __future__ import annotations

import logging

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import login_required

from app import db
from app.forms.department_forms import DepartmentForm
from app.models.department import Department
from app.models.instructor import Instructor
from app.models.enums import EntityOperation
from app.services import notification_service

logger = logging.getLogger(__name__)

departments_bp = Blueprint("departments", __name__)


def _populate_instructors(form: DepartmentForm, selected_id: int | None = None) -> None:
    """Populate instructor dropdown choices for the administrator field."""
    instructors = db.session.query(Instructor).all()
    form.instructor_id.choices = [(0, "-- Select --")] + [
        (i.id, i.full_name) for i in instructors
    ]
    if selected_id is not None:
        form.instructor_id.data = selected_id


@departments_bp.route("/")
@login_required
def index():
    """List all departments."""
    departments = db.session.query(Department).all()
    return render_template("departments/index.html", departments=departments)


@departments_bp.route("/details/<int:id>")
@login_required
def details(id: int):
    """Display department details by ID."""
    department = db.session.get(Department, id)
    if department is None:
        abort(404)
    return render_template("departments/details.html", department=department)


@departments_bp.route("/create", methods=["GET", "POST"])
@login_required
def create():
    """Handle GET (render form) and POST (save) for creating a department."""
    form = DepartmentForm()
    _populate_instructors(form)

    if form.validate_on_submit():
        try:
            department = Department(
                name=form.name.data,
                budget=form.budget.data,
                start_date=form.start_date.data,
                instructor_id=form.instructor_id.data if form.instructor_id.data else None,
            )
            db.session.add(department)
            db.session.commit()

            notification_service.send_notification(
                "Department",
                str(department.department_id),
                EntityOperation.CREATE,
                entity_display_name=department.name,
            )

            return redirect(url_for("departments.index"))
        except Exception as e:
            logger.error("Error creating department: %s", e)
            db.session.rollback()
            flash("Unable to create department. Try again.", "error")

    return render_template("departments/create.html", form=form)


@departments_bp.route("/edit/<int:id>", methods=["GET", "POST"])
@login_required
def edit(id: int):
    """Handle GET (render form) and POST (save) for editing a department."""
    department = db.session.get(Department, id)
    if department is None:
        abort(404)

    form = DepartmentForm(obj=department)
    _populate_instructors(form, department.instructor_id)

    if request.method == "GET":
        form.name.data = department.name
        form.budget.data = department.budget
        form.start_date.data = department.start_date

    if form.validate_on_submit():
        try:
            department.name = form.name.data
            department.budget = form.budget.data
            department.start_date = form.start_date.data
            department.instructor_id = form.instructor_id.data if form.instructor_id.data else None
            db.session.commit()

            notification_service.send_notification(
                "Department",
                str(department.department_id),
                EntityOperation.UPDATE,
                entity_display_name=department.name,
            )

            return redirect(url_for("departments.index"))
        except Exception as e:
            logger.error("Error editing department %d: %s", id, e)
            db.session.rollback()
            flash("Unable to save changes. Try again.", "error")

    return render_template("departments/edit.html", form=form, department=department)


@departments_bp.route("/delete/<int:id>", methods=["GET", "POST"])
@login_required
def delete(id: int):
    """Handle GET (confirmation page) and POST (perform delete) for a department."""
    department = db.session.get(Department, id)
    if department is None:
        abort(404)

    if request.method == "POST":
        try:
            dept_name = department.name
            db.session.delete(department)
            db.session.commit()

            notification_service.send_notification(
                "Department",
                str(id),
                EntityOperation.DELETE,
                entity_display_name=dept_name,
            )

            return redirect(url_for("departments.index"))
        except Exception as e:
            logger.error("Error deleting department %d: %s", id, e)
            db.session.rollback()
            flash("Unable to delete department. Try again.", "error")
            return redirect(url_for("departments.index"))

    return render_template("departments/delete.html", department=department)
