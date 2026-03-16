"""Course routes — mirrors ContosoUniversity.Web.Controllers.CoursesController."""

from __future__ import annotations

import logging

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import login_required

from app import db
from app.forms.course_forms import CourseForm
from app.models.course import Course
from app.models.department import Department
from app.models.enums import EntityOperation
from app.services import notification_service, file_storage_service

logger = logging.getLogger(__name__)

courses_bp = Blueprint("courses", __name__)


def _populate_departments(form: CourseForm) -> None:
    """Populate department dropdown — mirrors .NET ViewData['DepartmentID'] SelectList."""
    departments = db.session.query(Department).all()
    form.department_id.choices = [
        (d.department_id, d.name) for d in departments
    ]


@courses_bp.route("/")
def index():
    """Course list — mirrors .NET CoursesController.Index."""
    courses = db.session.query(Course).all()
    return render_template("courses/index.html", courses=courses)


@courses_bp.route("/details/<int:id>")
def details(id: int):
    """Course details — mirrors .NET CoursesController.Details."""
    course = db.session.query(Course).filter_by(course_id=id).first()
    if course is None:
        abort(404)
    return render_template("courses/details.html", course=course)


@courses_bp.route("/create", methods=["GET", "POST"])
@login_required
def create():
    """Create course — mirrors .NET CoursesController.Create."""
    form = CourseForm()
    _populate_departments(form)

    if form.validate_on_submit():
        try:
            course = Course(
                course_id=form.course_id.data,
                title=form.title.data,
                credits=form.credits.data,
                department_id=form.department_id.data,
            )

            # Handle file upload — mirrors .NET TeachingMaterialImage handling
            if form.teaching_material_image.data:
                success, url, error = file_storage_service.upload_file(
                    form.teaching_material_image.data
                )
                if not success:
                    form.teaching_material_image.errors.append(error or "Upload failed")
                    return render_template("courses/create.html", form=form)
                course.teaching_material_image_path = url

            db.session.add(course)
            db.session.commit()

            notification_service.send_notification(
                "Course",
                str(course.course_id),
                EntityOperation.CREATE,
                entity_display_name=course.title,
            )

            return redirect(url_for("courses.index"))
        except Exception as e:
            logger.error("Error creating course: %s", e)
            db.session.rollback()
            flash("Unable to create course. Try again.", "error")

    return render_template("courses/create.html", form=form)


@courses_bp.route("/edit/<int:id>", methods=["GET", "POST"])
@login_required
def edit(id: int):
    """Edit course — mirrors .NET CoursesController.Edit."""
    course = db.session.get(Course, id)
    if course is None:
        abort(404)

    form = CourseForm(obj=course)
    _populate_departments(form)

    if request.method == "GET":
        form.course_id.data = course.course_id
        form.title.data = course.title
        form.credits.data = course.credits
        form.department_id.data = course.department_id

    if form.validate_on_submit():
        try:
            course.title = form.title.data
            course.credits = form.credits.data
            course.department_id = form.department_id.data

            # Handle file upload
            if form.teaching_material_image.data:
                if course.teaching_material_image_path:
                    file_storage_service.delete_file(course.teaching_material_image_path)

                success, url, error = file_storage_service.upload_file(
                    form.teaching_material_image.data
                )
                if not success:
                    form.teaching_material_image.errors.append(error or "Upload failed")
                    return render_template("courses/edit.html", form=form, course=course)
                course.teaching_material_image_path = url

            db.session.commit()

            notification_service.send_notification(
                "Course",
                str(course.course_id),
                EntityOperation.UPDATE,
                entity_display_name=course.title,
            )

            return redirect(url_for("courses.index"))
        except Exception as e:
            logger.error("Error updating course %d: %s", id, e)
            db.session.rollback()
            flash("Unable to save changes. Try again.", "error")

    return render_template("courses/edit.html", form=form, course=course)


@courses_bp.route("/delete/<int:id>", methods=["GET", "POST"])
@login_required
def delete(id: int):
    """Delete course — mirrors .NET CoursesController.Delete/DeleteConfirmed."""
    course = db.session.query(Course).filter_by(course_id=id).first()
    if course is None:
        abort(404)

    if request.method == "POST":
        try:
            course_title = course.title

            if course.teaching_material_image_path:
                file_storage_service.delete_file(course.teaching_material_image_path)

            db.session.delete(course)
            db.session.commit()

            notification_service.send_notification(
                "Course",
                str(id),
                EntityOperation.DELETE,
                entity_display_name=course_title,
            )

            return redirect(url_for("courses.index"))
        except Exception as e:
            logger.error("Error deleting course %d: %s", id, e)
            db.session.rollback()
            flash("Unable to delete course. Try again.", "error")
            return redirect(url_for("courses.index"))

    return render_template("courses/delete.html", course=course)
