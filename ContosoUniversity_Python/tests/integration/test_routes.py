"""Integration tests — mirrors ContosoUniversity.Tests integration tests."""

from __future__ import annotations

from flask.testing import FlaskClient


class TestHomeRoutes:
    """Tests for Home routes — mirrors HomeController tests."""

    def test_index_returns_200(self, client: FlaskClient) -> None:
        response = client.get("/")
        assert response.status_code == 200
        assert b"Contoso University" in response.data

    def test_about_returns_enrollment_stats(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/about")
        assert response.status_code == 200
        assert b"Student Body Statistics" in response.data

    def test_privacy_returns_200(self, client: FlaskClient) -> None:
        response = client.get("/privacy")
        assert response.status_code == 200


class TestStudentRoutes:
    """Tests for Student routes — mirrors StudentsController tests."""

    def test_index_requires_auth(self, client: FlaskClient) -> None:
        response = client.get("/students/")
        assert response.status_code == 302  # redirect to login

    def test_index_returns_students(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/")
        assert response.status_code == 200
        assert b"Alexander" in response.data

    def test_search_filters_students(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/?searchString=Alex")
        assert response.status_code == 200
        assert b"Alexander" in response.data

    def test_details_returns_student(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/details/1")
        assert response.status_code == 200
        assert b"Alexander" in response.data or b"Carson" in response.data

    def test_details_returns_404_for_nonexistent(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/details/9999")
        assert response.status_code == 404

    def test_create_get_returns_form(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/create")
        assert response.status_code == 200
        assert b"Create" in response.data

    def test_create_post_creates_student(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.post(
            "/students/create",
            data={
                "last_name": "TestLast",
                "first_name": "TestFirst",
                "enrollment_date": "2024-01-15",
            },
            follow_redirects=True,
        )
        assert response.status_code == 200
        assert b"TestLast" in response.data

    def test_edit_get_returns_form(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/edit/1")
        assert response.status_code == 200

    def test_delete_get_returns_confirmation(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/delete/1")
        assert response.status_code == 200
        assert b"Are you sure" in response.data

    def test_sort_by_name_desc(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/?sortOrder=name_desc")
        assert response.status_code == 200

    def test_sort_by_date(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/students/?sortOrder=Date")
        assert response.status_code == 200


class TestCourseRoutes:
    """Tests for Course routes — mirrors CoursesController tests."""

    def test_index_returns_courses(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/courses/")
        assert response.status_code == 200
        assert b"Chemistry" in response.data

    def test_details_returns_course(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/courses/details/1050")
        assert response.status_code == 200
        assert b"Chemistry" in response.data

    def test_details_returns_404_for_nonexistent(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/courses/details/9999")
        assert response.status_code == 404

    def test_create_get_returns_form(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/courses/create")
        assert response.status_code == 200


class TestDepartmentRoutes:
    """Tests for Department routes — mirrors DepartmentsController tests."""

    def test_index_returns_departments(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/departments/")
        assert response.status_code == 200
        assert b"English" in response.data

    def test_details_returns_department(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/departments/details/1")
        assert response.status_code == 200

    def test_create_get_returns_form(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/departments/create")
        assert response.status_code == 200


class TestInstructorRoutes:
    """Tests for Instructor routes — mirrors InstructorsController tests."""

    def test_index_returns_instructors(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/instructors/")
        assert response.status_code == 200
        assert b"Abercrombie" in response.data

    def test_index_with_selected_instructor(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/instructors/?id=9")
        assert response.status_code == 200

    def test_details_returns_instructor(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/instructors/details/9")
        assert response.status_code == 200

    def test_create_get_returns_form(self, authenticated_client: FlaskClient) -> None:
        response = authenticated_client.get("/instructors/create")
        assert response.status_code == 200


class TestSeedData:
    """Tests that seed data matches .NET DbInitializer exactly."""

    def test_correct_number_of_students(self, app) -> None:
        from app import db
        from app.models.student import Student

        with app.app_context():
            count = db.session.query(Student).count()
            # Seed data has 8 students; other tests may add more
            assert count >= 8

    def test_correct_number_of_courses(self, app) -> None:
        from app import db
        from app.models.course import Course

        with app.app_context():
            count = db.session.query(Course).count()
            assert count == 7

    def test_correct_number_of_instructors(self, app) -> None:
        from app import db
        from app.models.instructor import Instructor

        with app.app_context():
            count = db.session.query(Instructor).count()
            assert count == 5

    def test_correct_number_of_departments(self, app) -> None:
        from app import db
        from app.models.department import Department

        with app.app_context():
            count = db.session.query(Department).count()
            assert count == 4

    def test_correct_number_of_enrollments(self, app) -> None:
        from app import db
        from app.models.enrollment import Enrollment

        with app.app_context():
            count = db.session.query(Enrollment).count()
            assert count == 11

    def test_chemistry_course_has_correct_id(self, app) -> None:
        from app import db
        from app.models.course import Course

        with app.app_context():
            course = db.session.get(Course, 1050)
            assert course is not None
            assert course.title == "Chemistry"
            assert course.credits == 3
