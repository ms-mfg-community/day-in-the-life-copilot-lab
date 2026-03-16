"""Department forms — mirrors .NET Department data annotations + custom validators."""

from __future__ import annotations

from datetime import date, timedelta

from flask_wtf import FlaskForm
from wtforms import DateField, DecimalField, SelectField, StringField
from wtforms.validators import DataRequired, Length, NumberRange, ValidationError

# Reserved words — mirrors .NET DepartmentNameValidationAttribute
RESERVED_WORDS = ["Test", "Demo", "Sample", "Temp"]


def validate_department_name(form: FlaskForm, field: StringField) -> None:
    """Custom validator — mirrors .NET DepartmentNameValidationAttribute."""
    name = field.data or ""
    if name and not name[0].isalpha():
        raise ValidationError("Department name must start with a letter.")
    for word in RESERVED_WORDS:
        if word.lower() in name.lower():
            raise ValidationError(f"Department name cannot contain the reserved word '{word}'.")


def validate_future_date(form: FlaskForm, field: DateField) -> None:
    """Custom validator — mirrors .NET FutureDateValidationAttribute(5)."""
    if field.data and field.data > date.today() + timedelta(days=5 * 365):
        raise ValidationError("Date cannot be more than 5 years in the future.")


class DepartmentForm(FlaskForm):
    """Form for creating/editing departments — mirrors .NET Department + custom validations."""

    name = StringField(
        "Name",
        validators=[DataRequired(), Length(min=3, max=50), validate_department_name],
    )
    budget = DecimalField(
        "Budget",
        validators=[DataRequired(), NumberRange(min=0, max=10000000)],
        places=2,
    )
    start_date = DateField(
        "Start Date",
        validators=[DataRequired(), validate_future_date],
    )
    instructor_id = SelectField(
        "Administrator",
        coerce=int,
        choices=[],
        validators=[],
    )
