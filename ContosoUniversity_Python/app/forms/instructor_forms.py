"""Instructor form with name, hire date, and office location validation."""
# .NET equivalent: ContosoUniversity.Web Instructor data annotations

from __future__ import annotations

from flask_wtf import FlaskForm
from wtforms import DateField, StringField
from wtforms.validators import DataRequired, Length, Optional


class InstructorForm(FlaskForm):
    """Form for creating/editing instructors."""

    last_name = StringField(
        "Last Name",
        validators=[DataRequired(), Length(min=1, max=50)],
    )
    first_name = StringField(
        "First Name",
        validators=[DataRequired(), Length(min=1, max=50)],
    )
    hire_date = DateField(
        "Hire Date",
        validators=[DataRequired()],
    )
    office_location = StringField(
        "Office Location",
        validators=[Optional(), Length(max=50)],
    )
