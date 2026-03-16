"""Student forms — mirrors .NET Student data annotations."""

from __future__ import annotations

from datetime import date

from flask_wtf import FlaskForm
from wtforms import DateField, StringField
from wtforms.validators import DataRequired, Length


class StudentForm(FlaskForm):
    """Form for creating/editing students — mirrors .NET [Bind] attributes."""

    last_name = StringField(
        "Last Name",
        validators=[DataRequired(), Length(min=1, max=50)],
    )
    first_name = StringField(
        "First Name",
        validators=[DataRequired(), Length(min=1, max=50)],
    )
    enrollment_date = DateField(
        "Enrollment Date",
        validators=[DataRequired()],
        default=date.today,
    )
