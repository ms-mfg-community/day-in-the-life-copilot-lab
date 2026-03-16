"""Course form with title, credits, department, and image upload validation."""
# .NET equivalent: ContosoUniversity.Web CourseViewModel

from __future__ import annotations

from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileField
from wtforms import IntegerField, SelectField, StringField
from wtforms.validators import DataRequired, Length, NumberRange


class CourseForm(FlaskForm):
    """Form for creating and editing courses with department selection and image upload."""

    course_id = IntegerField("Number", validators=[DataRequired()])
    title = StringField(
        "Title",
        validators=[DataRequired(), Length(min=3, max=50)],
    )
    credits = IntegerField(
        "Credits",
        validators=[DataRequired(), NumberRange(min=0, max=5)],
    )
    department_id = SelectField(
        "Department",
        coerce=int,
        validators=[DataRequired()],
    )
    teaching_material_image = FileField(
        "Upload Teaching Material Image",
        validators=[FileAllowed(["png", "jpg", "jpeg", "gif"], "Images only!")],
    )
