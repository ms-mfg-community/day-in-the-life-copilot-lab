"""Student routes — mirrors ContosoUniversity.Web.Controllers.StudentsController."""

from __future__ import annotations

import logging
from datetime import date

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import login_required

from app import db
from app.forms.student_forms import StudentForm
from app.models.enums import EntityOperation, StudentSortOption
from app.models.student import Student
from app.services.student_query_service import StudentSearchCriteria, search_students
from app.services import notification_service

logger = logging.getLogger(__name__)

students_bp = Blueprint("students", __name__)


@students_bp.route("/")
@login_required
def index():
    """Student list with search, sort, pagination — mirrors .NET StudentsController.Index."""
    sort_order = request.args.get("sortOrder")
    current_filter = request.args.get("currentFilter")
    search_string = request.args.get("searchString")
    page = request.args.get("pageNumber", 1, type=int)
    date_from = request.args.get("enrollmentDateFrom")
    date_to = request.args.get("enrollmentDateTo")

    # New search resets to page 1 — mirrors .NET logic
    if search_string is not None:
        page = 1
    else:
        search_string = current_filter

    # Parse date filters
    enrollment_date_from = None
    enrollment_date_to = None
    if date_from:
        try:
            enrollment_date_from = date.fromisoformat(date_from)
        except ValueError:
            pass
    if date_to:
        try:
            enrollment_date_to = date.fromisoformat(date_to)
        except ValueError:
            pass

    # Map sort order — mirrors .NET switch expression
    sort_option = {
        "name_desc": StudentSortOption.LAST_NAME_DESC,
        "Date": StudentSortOption.ENROLLMENT_DATE_ASC,
        "date_desc": StudentSortOption.ENROLLMENT_DATE_DESC,
    }.get(sort_order or "", StudentSortOption.LAST_NAME_ASC)

    criteria = StudentSearchCriteria(
        search_text=search_string,
        enrollment_date_from=enrollment_date_from,
        enrollment_date_to=enrollment_date_to,
        sort_option=sort_option,
        page_number=page,
        page_size=10,
    )

    result = search_students(criteria)

    # Sort toggle params — mirrors .NET NameSortParm/DateSortParm logic
    name_sort_parm = "name_desc" if not sort_order else ""
    date_sort_parm = "date_desc" if sort_order == "Date" else "Date"

    return render_template(
        "students/index.html",
        students=result.items,
        current_sort=sort_order,
        search_text=search_string,
        enrollment_date_from=date_from,
        enrollment_date_to=date_to,
        name_sort_parm=name_sort_parm,
        date_sort_parm=date_sort_parm,
        page_number=result.page_number,
        total_pages=result.total_pages,
        has_previous_page=result.has_previous_page,
        has_next_page=result.has_next_page,
    )


@students_bp.route("/details/<int:id>")
@login_required
def details(id: int):
    """Student details — mirrors .NET StudentsController.Details."""
    student = db.session.get(Student, id)
    if student is None:
        abort(404)
    return render_template("students/details.html", student=student)


@students_bp.route("/create", methods=["GET", "POST"])
@login_required
def create():
    """Create student — mirrors .NET StudentsController.Create (GET+POST)."""
    form = StudentForm()

    if form.validate_on_submit():
        try:
            student = Student(
                last_name=form.last_name.data,
                first_name=form.first_name.data,
                enrollment_date=form.enrollment_date.data,
            )
            db.session.add(student)
            db.session.commit()

            notification_service.send_notification(
                "Student",
                str(student.id),
                EntityOperation.CREATE,
                entity_display_name=f"{student.first_name} {student.last_name}",
            )

            return redirect(url_for("students.index"))
        except Exception as e:
            logger.error("Error creating student: %s", e)
            db.session.rollback()
            flash("Unable to save changes. Try again.", "error")

    return render_template("students/create.html", form=form)


@students_bp.route("/edit/<int:id>", methods=["GET", "POST"])
@login_required
def edit(id: int):
    """Edit student — mirrors .NET StudentsController.Edit (GET+POST)."""
    student = db.session.get(Student, id)
    if student is None:
        abort(404)

    form = StudentForm(obj=student)
    # Map model field names to form field names
    if request.method == "GET":
        form.last_name.data = student.last_name
        form.first_name.data = student.first_name
        form.enrollment_date.data = student.enrollment_date

    if form.validate_on_submit():
        try:
            student.last_name = form.last_name.data
            student.first_name = form.first_name.data
            student.enrollment_date = form.enrollment_date.data
            db.session.commit()

            notification_service.send_notification(
                "Student",
                str(student.id),
                EntityOperation.UPDATE,
                entity_display_name=f"{student.first_name} {student.last_name}",
            )

            return redirect(url_for("students.index"))
        except Exception as e:
            logger.error("Error editing student %d: %s", id, e)
            db.session.rollback()
            flash("Unable to save changes. Try again.", "error")

    return render_template("students/edit.html", form=form, student=student)


@students_bp.route("/delete/<int:id>", methods=["GET", "POST"])
@login_required
def delete(id: int):
    """Delete student — mirrors .NET StudentsController.Delete/DeleteConfirmed."""
    student = db.session.get(Student, id)
    if student is None:
        abort(404)

    if request.method == "POST":
        try:
            student_name = f"{student.first_name} {student.last_name}"
            db.session.delete(student)
            db.session.commit()

            notification_service.send_notification(
                "Student",
                str(id),
                EntityOperation.DELETE,
                entity_display_name=student_name,
            )

            return redirect(url_for("students.index"))
        except Exception as e:
            logger.error("Error deleting student %d: %s", id, e)
            db.session.rollback()
            flash("Unable to delete the student. Try again.", "error")
            return redirect(url_for("students.index"))

    return render_template("students/delete.html", student=student)
