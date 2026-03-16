"""Instructor routes — CRUD with course assignments and office assignment management."""
# .NET equivalent: ContosoUniversity.Web.Controllers.InstructorsController

from __future__ import annotations

import logging

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import login_required
from sqlalchemy.orm import selectinload

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
    """Build a list of all courses with assigned/unassigned status for checkboxes."""
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
@login_required
def index():
    """List instructors with drill-down to courses and enrollments."""
    selected_instructor_id = request.args.get("id", type=int)
    selected_course_id = request.args.get("courseID", type=int)

    instructors = (
        db.session.query(Instructor)
        .options(
            selectinload(Instructor.course_assignments)
            .selectinload(CourseAssignment.course)
        )
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
@login_required
def details(id: int):
    """Display instructor details by ID."""
    instructor = db.session.get(Instructor, id)
    if instructor is None:
        abort(404)
    return render_template("instructors/details.html", instructor=instructor)


@instructors_bp.route("/create", methods=["GET", "POST"])
@login_required
def create():
    """Handle GET (render form) and POST (save) for creating an instructor."""
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

            # Handle course assignments from checkbox selection
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
    """Handle GET (render form) and POST (save) for editing an instructor."""
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

            # Handle office assignment — clear if empty, create or update otherwise
            if form.office_location.data and form.office_location.data.strip():
                if instructor.office_assignment:
                    instructor.office_assignment.location = form.office_location.data
                else:
                    instructor.office_assignment = OfficeAssignment(
                        location=form.office_location.data,
                    )
            else:
                instructor.office_assignment = None

            # Sync course assignments with checkbox selections
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
    """Handle GET (confirmation page) and POST (perform delete) for an instructor."""
    instructor = db.session.get(Instructor, id)
    if instructor is None:
        abort(404)

    if request.method == "POST":
        try:
            instructor_name = instructor.full_name

            # Clear department administrator references before deleting
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
