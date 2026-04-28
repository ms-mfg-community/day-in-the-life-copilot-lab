# PRD: Add Course Prerequisites

**Branch:** `feature/add-course-prerequisitesv3`  
**Related Issues:** [#2 — [Feature]: Add Course Prerequisites](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/2)  
**Status:** Draft  
**Date:** 2026-02-24

---

## 1. Feature Overview

Enable courses to declare one or more prerequisite courses that students must complete before enrolling. Administrators configure prerequisite relationships via the course edit page. Students see required prerequisites on the course detail page. The enrollment system validates all prerequisites are satisfied before allowing a student to register, and the system prevents circular dependency chains.

---

## 2. User Stories

1. **As an administrator**, I want to add or remove prerequisite courses on the Course Edit page so that academic sequencing is enforced across the curriculum.
2. **As a student**, I want to see the prerequisite courses listed on the Course Details page so that I can plan my academic path before attempting enrollment.
3. **As the enrollment system**, I want to block enrollment when a student has not completed all prerequisite courses (grade A–D on each), so that academic standards are maintained automatically.

---

## 3. Acceptance Criteria

### Story 1 — Administrator manages prerequisites
- [ ] The Course Edit page (`/Courses/Edit/{id}`) displays a multi-select list of all other courses as potential prerequisites.
- [ ] Saving the form persists the selected prerequisites via a new `CoursePrerequisite` join entity.
- [ ] Circular dependency detection prevents saving a prerequisite relationship that would create a cycle (e.g., A → B → A).
- [ ] Courses with no prerequisites continue to behave as today — unrestricted enrollment.

### Story 2 — Student views prerequisites
- [ ] The Course Details page (`/Courses/Details/{id}`) renders a "Prerequisites" section listing each prerequisite course title and ID with a link to its detail page.
- [ ] If no prerequisites exist, the section displays "None."

### Story 3 — Enrollment validation
- [ ] `EnrollmentsController` (or the enrollment service) checks that the student holds a passing grade (A–D, not null) in every prerequisite course before creating an `Enrollment`.
- [ ] If one or more prerequisites are not met, enrollment is rejected with a descriptive validation message listing the missing courses.
- [ ] Existing enrollments are not retroactively affected.

---

## 4. Technical Considerations

### Affected Projects

| Project | Change |
|---|---|
| `ContosoUniversity.Core` | New `CoursePrerequisite` model; add `Prerequisites` / `DependentCourses` navigation properties to `Course` |
| `ContosoUniversity.Infrastructure` | Register `CoursePrerequisite` in `SchoolContext`; add EF Core migration; update `Repository<Course>` includes as needed |
| `ContosoUniversity.Web` | Update `CourseViewModel`; update `CoursesController.Edit`; update Details/Edit views; add prerequisite validation to enrollment flow |
| `ContosoUniversity.Tests` | New unit tests for circular-dependency detection and enrollment validation; integration tests for the edit POST endpoint |

### New Domain Model

```csharp
// ContosoUniversity.Core/Models/CoursePrerequisite.cs
public class CoursePrerequisite
{
    public int CourseID { get; init; }           // the course that has the prerequisite
    public int PrerequisiteCourseID { get; init; }  // the course that must be completed first
    public virtual Course Course { get; init; } = null!;
    public virtual Course PrerequisiteCourse { get; init; } = null!;
}
```

Add to `Course.cs`:
```csharp
public virtual ICollection<CoursePrerequisite> Prerequisites { get; set; } = new List<CoursePrerequisite>();
public virtual ICollection<CoursePrerequisite> DependentCourses { get; set; } = new List<CoursePrerequisite>();
```

### Database Changes

- New table `CoursePrerequisite` with composite PK `(CourseID, PrerequisiteCourseID)`.
- FK to `Course(CourseID)` twice; use `DeleteBehavior.Restrict` to avoid cascade delete cycles.
- Add EF Core migration: `dotnet ef migrations add AddCoursePrerequisites`.

### API / Controller Changes

- **`GET /Courses/Edit/{id}`** — populate `ViewData["AvailablePrerequisites"]` (all courses except current).
- **`POST /Courses/Edit/{id}`** — accept `int[] SelectedPrerequisiteIDs`; validate no circular deps; diff and update `CoursePrerequisite` rows.
- **Enrollment POST** — inject `IRepository<CoursePrerequisite>` or extend `IRepository<Enrollment>` query; check passed enrollments before insert.

### Views

- `Views/Courses/Edit.cshtml` — add multi-checkbox or `<select multiple>` for prerequisites (consistent with `CourseAssignment` pattern in `InstructorsController`).
- `Views/Courses/Details.cshtml` — add prerequisites list section.

---

## 5. Testing Requirements

### Unit Tests (`ContosoUniversity.Tests`)

- `DetectCircularPrerequisite_WhenCycleExists_ReturnsFalse`
- `DetectCircularPrerequisite_WhenNoCycle_ReturnsTrue`
- `ValidatePrerequisites_WhenStudentMissingPrereq_ReturnsError`
- `ValidatePrerequisites_WhenAllPrereqsPassed_ReturnsSuccess`
- `ValidatePrerequisites_WhenCourseHasNoPrereqs_ReturnsSuccess`

### Integration Tests (`ContosoUniversity.Tests/Integration`)

- `CoursesController_Edit_POST_WithPrerequisites_PersistsRelationships` (via `WebApplicationFactory`)
- `CoursesController_Edit_POST_CircularDependency_ReturnsValidationError`
- `EnrollmentsController_POST_MissingPrerequisite_BlocksEnrollment`

### E2E Tests (`ContosoUniversity.PlaywrightTests`)

- Admin adds a prerequisite to a course via UI → verifies it appears on Details page.
- Student attempts enrollment without prerequisite → verifies error message is displayed.

---

## 6. Out of Scope

- Prerequisite waiver or override by administrators.
- Nested/transitive prerequisite display (showing the full prerequisite chain beyond direct prerequisites).
- Student-facing "prerequisite progress tracker" or completion percentage.
- Notifications triggered by prerequisite changes.

---

## 7. Dependencies

- Existing `Enrollment` model must expose `Grade` (already present in `ContosoUniversity.Core/Models/Enrollment.cs`).
- EF Core migrations tooling (`dotnet-ef`) must be available in the dev environment.
- No new NuGet packages required; feature uses existing EF Core and ASP.NET Core MVC patterns already in the solution.
