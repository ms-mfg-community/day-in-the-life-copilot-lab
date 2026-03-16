"""Instructor routes — mirrors ContosoUniversity.Web.Controllers.InstructorsController."""

from __future__ import annotations

import logging

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import login_required

from app import db
from app.forms.instructor_forms import InstructorForm
from app.models.instructor import Instructor
from app.models.course import Course
from app.models.course_assignment import CourseAssignment
from app.models.department import Department
from app.models.office_assignment import OfficeAssignment
from app.models.enums import EntityOperation
from app.services import notification_service

logger = logging.getLogger(__name__)

instructors_bp = Blueprint("instructors", __name__)


def _get_assigned_courses(instructor: Instructor) -> list[dict]:
    """Build assigned course data — mirrors .NET PopulateAssignedCourseDataAsync."""
    all_courses = db.session.query(Course).all()
    instructor_course_ids = {ca.course_id for ca in instructor.course_assignments}
    return [
        {
            "course_id": c.course_id,
            "title": c.title,
            "assigned": c.course_id in instructor_course_ids,
        }
        for c in all_courses
    ]


@instructors_bp.route("/")
def index():
    """Instructor list with drill-down — mirrors .NET InstructorsController.Index."""
    selected_instructor_id = request.args.get("id", type=int)
    selected_course_id = request.args.get("courseID", type=int)

    instructors = (
        db.session.query(Instructor)
        .order_by(Instructor.last_name)
        .all()
    )

    courses = []
    enrollments = []

    if selected_instructor_id:
        instructor = next((i for i in instructors if i.id == selected_instructor_id), None)
        if instructor:
            courses = [ca.course for ca in instructor.course_assignments]

    if selected_course_id:
        selected_course = next((c for c in courses if c.course_id == selected_course_id), None)
        if selected_course:
            enrollments = selected_course.enrollments

    return render_template(
        "instructors/index.html",
        instructors=instructors,
        courses=courses,
        enrollments=enrollments,
        selected_instructor_id=selected_instructor_id,
        selected_course_id=selected_course_id,
    )


@instructors_bp.route("/details/<int:id>")
def details(id: int):
    """Instructor details — mirrors .NET InstructorsController.Details."""
    instructor = db.session.get(Instructor, id)
    if instructor is None:
        abort(404)
    return render_template("instructors/details.html", instructor=instructor)


@instructors_bp.route("/create", methods=["GET", "POST"])
@login_required
def create():
    """Create instructor — mirrors .NET InstructorsController.Create."""
    form = InstructorForm()
    assigned_courses = _get_assigned_courses(Instructor())

    if form.validate_on_submit():
        try:
            instructor = Instructor(
                last_name=form.last_name.data,
                first_name=form.first_name.data,
                hire_date=form.hire_date.data,
            )

            # Handle office assignment
            if form.office_location.data:
                instructor.office_assignment = OfficeAssignment(
                    location=form.office_location.data,
                )

            # Handle course assignments — mirrors selectedCourses parameter
            selected_courses = request.form.getlist("selectedCourses")
            for course_id_str in selected_courses:
                instructor.course_assignments.append(
                    CourseAssignment(course_id=int(course_id_str))
                )

            db.session.add(instructor)
            db.session.commit()

            notification_service.send_notification(
                "Instructor",
                str(instructor.id),
                EntityOperation.CREATE,
                entity_display_name=instructor.full_name,
            )

            return redirect(url_for("instructors.index"))
        except Exception as e:
            logger.error("Error creating instructor: %s", e)
            db.session.rollback()
            flash("Unable to create instructor. Try again.", "error")

    return render_template(
        "instructors/create.html",
        form=form,
        assigned_courses=assigned_courses,
    )


@instructors_bp.route("/edit/<int:id>", methods=["GET", "POST"])
@login_required
def edit(id: int):
    """Edit instructor — mirrors .NET InstructorsController.Edit."""
    instructor = db.session.get(Instructor, id)
    if instructor is None:
        abort(404)

    form = InstructorForm(obj=instructor)
    if request.method == "GET":
        form.last_name.data = instructor.last_name
        form.first_name.data = instructor.first_name
        form.hire_date.data = instructor.hire_date
        form.office_location.data = (
            instructor.office_assignment.location if instructor.office_assignment else ""
        )

    assigned_courses = _get_assigned_courses(instructor)

    if form.validate_on_submit():
        try:
            instructor.last_name = form.last_name.data
            instructor.first_name = form.first_name.data
            instructor.hire_date = form.hire_date.data

            # Handle office assignment — mirrors .NET null-clearing logic
            if form.office_location.data and form.office_location.data.strip():
                if instructor.office_assignment:
                    instructor.office_assignment.location = form.office_location.data
                else:
                    instructor.office_assignment = OfficeAssignment(
                        location=form.office_location.data,
                    )
            else:
                instructor.office_assignment = None

            # Update course assignments — mirrors .NET UpdateInstructorCoursesAsync
            selected_courses = set(request.form.getlist("selectedCourses"))
            current_courses = {str(ca.course_id) for ca in instructor.course_assignments}

            # Add new
            for course_id_str in selected_courses - current_courses:
                instructor.course_assignments.append(
                    CourseAssignment(
                        instructor_id=instructor.id,
                        course_id=int(course_id_str),
                    )
                )

            # Remove old
            for ca in list(instructor.course_assignments):
                if str(ca.course_id) not in selected_courses:
                    instructor.course_assignments.remove(ca)

            db.session.commit()

            notification_service.send_notification(
                "Instructor",
                str(instructor.id),
                EntityOperation.UPDATE,
                entity_display_name=instructor.full_name,
            )

            return redirect(url_for("instructors.index"))
        except Exception as e:
            logger.error("Error editing instructor %d: %s", id, e)
            db.session.rollback()
            flash("Unable to save changes. Try again.", "error")

        assigned_courses = _get_assigned_courses(instructor)

    return render_template(
        "instructors/edit.html",
        form=form,
        instructor=instructor,
        assigned_courses=assigned_courses,
    )


@instructors_bp.route("/delete/<int:id>", methods=["GET", "POST"])
@login_required
def delete(id: int):
    """Delete instructor — mirrors .NET InstructorsController.Delete/DeleteConfirmed."""
    instructor = db.session.get(Instructor, id)
    if instructor is None:
        abort(404)

    if request.method == "POST":
        try:
            instructor_name = instructor.full_name

            # Clear department administrator references — mirrors .NET logic
            departments = db.session.query(Department).filter_by(instructor_id=id).all()
            for dept in departments:
                dept.instructor_id = None

            db.session.delete(instructor)
            db.session.commit()

            notification_service.send_notification(
                "Instructor",
                str(id),
                EntityOperation.DELETE,
                entity_display_name=instructor_name,
            )

            return redirect(url_for("instructors.index"))
        except Exception as e:
            logger.error("Error deleting instructor %d: %s", id, e)
            db.session.rollback()
            flash("Unable to delete instructor. Try again.", "error")
            return redirect(url_for("instructors.index"))

    return render_template("instructors/delete.html", instructor=instructor)
