"""Model tests — mirrors ContosoUniversity.Tests model validation tests."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.models.enrollment import Grade
from app.models.enums import EntityOperation, StudentSortOption


class TestGradeEnum:
    """Tests for Grade enum — mirrors .NET Grade enum values."""

    def test_grade_a_has_value_zero(self) -> None:
        assert Grade.A == 0

    def test_grade_f_has_value_four(self) -> None:
        assert Grade.F == 4

    def test_grade_values_match_dotnet(self) -> None:
        expected = {"A": 0, "B": 1, "C": 2, "D": 3, "F": 4}
        for name, value in expected.items():
            assert Grade[name] == value


class TestEntityOperation:
    """Tests for EntityOperation enum."""

    def test_create_value(self) -> None:
        assert EntityOperation.CREATE.value == "Create"

    def test_delete_value(self) -> None:
        assert EntityOperation.DELETE.value == "Delete"


class TestStudentSortOption:
    """Tests for StudentSortOption enum."""

    def test_all_options_exist(self) -> None:
        options = [
            StudentSortOption.LAST_NAME_ASC,
            StudentSortOption.LAST_NAME_DESC,
            StudentSortOption.ENROLLMENT_DATE_ASC,
            StudentSortOption.ENROLLMENT_DATE_DESC,
        ]
        assert len(options) == 4


class TestPersonModel:
    """Tests for Person base model — full_name computed property."""

    def test_full_name_format(self, app) -> None:
        from app.models.student import Student

        with app.app_context():
            student = Student(first_name="Carson", last_name="Alexander")
            assert student.full_name == "Alexander, Carson"

    def test_full_name_with_empty_strings(self, app) -> None:
        from app.models.student import Student

        with app.app_context():
            student = Student(first_name="", last_name="")
            assert student.full_name == ", "


class TestStudentModel:
    """Tests for Student model — inherits Person via TPH."""

    def test_student_polymorphic_identity(self, app) -> None:
        from app.models.student import Student

        with app.app_context():
            student = Student(
                first_name="Test",
                last_name="Student",
                enrollment_date=date(2024, 1, 1),
            )
            assert student.type == "Student"

    def test_student_enrollment_date(self, app) -> None:
        from app.models.student import Student

        with app.app_context():
            student = Student(
                first_name="Test",
                last_name="Student",
                enrollment_date=date(2010, 9, 1),
            )
            assert student.enrollment_date == date(2010, 9, 1)


class TestCourseModel:
    """Tests for Course model — user-supplied PK."""

    def test_course_id_not_auto_generated(self, app) -> None:
        from app.models.course import Course

        with app.app_context():
            course = Course(
                course_id=9999,
                title="Test Course",
                credits=3,
                department_id=1,
            )
            assert course.course_id == 9999
