# Sample Feature Story Issues

> **Purpose:** This document provides 4 ready-to-use feature story issues for the ContosoUniversity backlog. Lab 8 participants can copy/paste these directly into GitHub Issues to seed their project board and practice agentic planning workflows.

## Quick Start

1. Open the **Issues** tab in your GitHub repository
2. Click **New Issue** and select the **Feature Story** template
3. Copy/paste the **Title**, **Domain Area**, and body fields from any story below

---

## Story 1: Course Prerequisites

### Title

```
[Feature]: Add Course Prerequisites
```

### Domain Area

```
Courses
```

### Feature Description

Allow courses to define prerequisite courses that students must complete before enrolling. Administrators can configure prerequisite relationships between courses, students can see what prerequisites are required, and the enrollment system validates that prerequisites are satisfied before allowing registration.

### User Stories

- As an **administrator**, I want to define prerequisite courses for any course so that students are properly prepared before enrolling.
- As a **student**, I want to see the list of prerequisite courses on the course detail page so that I know what I need to complete first.
- As the **enrollment system**, I want to validate that a student has completed all prerequisites before allowing enrollment so that academic standards are maintained.

### Acceptance Criteria

- [ ] Administrators can add one or more prerequisite courses to any course through the course edit page
- [ ] The course detail page displays a list of prerequisite courses with links to each
- [ ] Enrollment is blocked with a clear error message when a student has not completed all prerequisites
- [ ] Circular prerequisite dependencies are detected and prevented
- [ ] Existing courses without prerequisites continue to allow unrestricted enrollment

### Suggested Branch Name

```
feature/add-course-prerequisites
```

---

## Story 2: Student GPA Calculator

### Title

```
[Feature]: Student GPA Calculator
```

### Domain Area

```
Students
```

### Feature Description

Calculate and display cumulative GPA on student detail pages based on enrollment grades. The GPA is computed from all graded enrollments using the standard 4.0 scale, giving students and advisors a quick view of academic standing.

### User Stories

- As a **student**, I want to see my cumulative GPA on my detail page so that I can track my academic progress.
- As an **academic advisor**, I want to view a student's GPA so that I can assess their academic standing and provide guidance.
- As an **administrator**, I want GPA calculations to update automatically when grades are entered or changed so that displayed values are always current.

### Acceptance Criteria

- [ ] The student detail page displays the cumulative GPA calculated from all graded enrollments
- [ ] GPA is calculated on a standard 4.0 scale (A=4.0, B=3.0, C=2.0, D=1.0, F=0.0)
- [ ] Enrollments without a grade are excluded from the GPA calculation
- [ ] GPA is displayed to two decimal places
- [ ] A student with no graded enrollments displays "N/A" instead of a numeric GPA

### Suggested Branch Name

```
feature/student-gpa-calculator
```

---

## Story 3: Instructor Office Hours

### Title

```
[Feature]: Instructor Office Hours
```

### Domain Area

```
Instructors
```

### Feature Description

Allow instructors to publish their office hours schedule, visible to enrolled students. Instructors can manage their weekly availability windows, and students can find when their instructors are available for consultations.

### User Stories

- As an **instructor**, I want to manage my weekly office hours schedule so that students know when I am available.
- As a **student**, I want to see my instructor's office hours on the instructor detail page so that I can plan visits for academic help.
- As an **administrator**, I want to view any instructor's office hours so that I can coordinate scheduling across the department.

### Acceptance Criteria

- [ ] Instructors can add, edit, and remove office hour time slots from their profile
- [ ] Each time slot includes a day of the week, start time, end time, and optional location
- [ ] The instructor detail page displays the current office hours schedule in a readable format
- [ ] Office hours are sorted by day of the week and start time
- [ ] Overlapping time slots for the same instructor are detected and prevented

### Suggested Branch Name

```
feature/instructor-office-hours
```

---

## Story 4: Department Budget Tracking

### Title

```
[Feature]: Department Budget Tracking
```

### Domain Area

```
Departments
```

### Feature Description

Track and display department budgets with spending categories and remaining balance. Administrators can manage budget allocations, and department heads can view spending breakdowns to make informed financial decisions.

### User Stories

- As an **administrator**, I want to set and update the annual budget for each department so that spending limits are clearly defined.
- As a **department head**, I want to view a breakdown of spending by category so that I can monitor how funds are being used.
- As a **department head**, I want to see the remaining balance for my department so that I can plan future expenditures.

### Acceptance Criteria

- [ ] The department detail page displays the total budget, total spent, and remaining balance
- [ ] Budget entries include a category, amount, description, and date
- [ ] Spending categories are configurable per department
- [ ] A warning is displayed when spending exceeds 90% of the allocated budget
- [ ] Budget history is preserved and viewable by fiscal year

### Suggested Branch Name

```
feature/department-budget-tracking
```

---

## Bulk Create with GitHub CLI

Use the following `gh` CLI commands to create all 4 issues at once. Run these from your repository root:

```bash
gh issue create \
  --title "[Feature]: Add Course Prerequisites" \
  --body "## Feature Description

Allow courses to define prerequisite courses that students must complete before enrolling. Administrators can configure prerequisite relationships between courses, students can see what prerequisites are required, and the enrollment system validates that prerequisites are satisfied before allowing registration.

## User Stories

- As an **administrator**, I want to define prerequisite courses for any course so that students are properly prepared before enrolling.
- As a **student**, I want to see the list of prerequisite courses on the course detail page so that I know what I need to complete first.
- As the **enrollment system**, I want to validate that a student has completed all prerequisites before allowing enrollment so that academic standards are maintained.

## Acceptance Criteria

- [ ] Administrators can add one or more prerequisite courses to any course through the course edit page
- [ ] The course detail page displays a list of prerequisite courses with links to each
- [ ] Enrollment is blocked with a clear error message when a student has not completed all prerequisites
- [ ] Circular prerequisite dependencies are detected and prevented
- [ ] Existing courses without prerequisites continue to allow unrestricted enrollment

## Suggested Branch Name

\`feature/add-course-prerequisites\`" \
  --label "feature,story"
```

```bash
gh issue create \
  --title "[Feature]: Student GPA Calculator" \
  --body "## Feature Description

Calculate and display cumulative GPA on student detail pages based on enrollment grades. The GPA is computed from all graded enrollments using the standard 4.0 scale, giving students and advisors a quick view of academic standing.

## User Stories

- As a **student**, I want to see my cumulative GPA on my detail page so that I can track my academic progress.
- As an **academic advisor**, I want to view a student's GPA so that I can assess their academic standing and provide guidance.
- As an **administrator**, I want GPA calculations to update automatically when grades are entered or changed so that displayed values are always current.

## Acceptance Criteria

- [ ] The student detail page displays the cumulative GPA calculated from all graded enrollments
- [ ] GPA is calculated on a standard 4.0 scale (A=4.0, B=3.0, C=2.0, D=1.0, F=0.0)
- [ ] Enrollments without a grade are excluded from the GPA calculation
- [ ] GPA is displayed to two decimal places
- [ ] A student with no graded enrollments displays \"N/A\" instead of a numeric GPA

## Suggested Branch Name

\`feature/student-gpa-calculator\`" \
  --label "feature,story"
```

```bash
gh issue create \
  --title "[Feature]: Instructor Office Hours" \
  --body "## Feature Description

Allow instructors to publish their office hours schedule, visible to enrolled students. Instructors can manage their weekly availability windows, and students can find when their instructors are available for consultations.

## User Stories

- As an **instructor**, I want to manage my weekly office hours schedule so that students know when I am available.
- As a **student**, I want to see my instructor's office hours on the instructor detail page so that I can plan visits for academic help.
- As an **administrator**, I want to view any instructor's office hours so that I can coordinate scheduling across the department.

## Acceptance Criteria

- [ ] Instructors can add, edit, and remove office hour time slots from their profile
- [ ] Each time slot includes a day of the week, start time, end time, and optional location
- [ ] The instructor detail page displays the current office hours schedule in a readable format
- [ ] Office hours are sorted by day of the week and start time
- [ ] Overlapping time slots for the same instructor are detected and prevented

## Suggested Branch Name

\`feature/instructor-office-hours\`" \
  --label "feature,story"
```

```bash
gh issue create \
  --title "[Feature]: Department Budget Tracking" \
  --body "## Feature Description

Track and display department budgets with spending categories and remaining balance. Administrators can manage budget allocations, and department heads can view spending breakdowns to make informed financial decisions.

## User Stories

- As an **administrator**, I want to set and update the annual budget for each department so that spending limits are clearly defined.
- As a **department head**, I want to view a breakdown of spending by category so that I can monitor how funds are being used.
- As a **department head**, I want to see the remaining balance for my department so that I can plan future expenditures.

## Acceptance Criteria

- [ ] The department detail page displays the total budget, total spent, and remaining balance
- [ ] Budget entries include a category, amount, description, and date
- [ ] Spending categories are configurable per department
- [ ] A warning is displayed when spending exceeds 90% of the allocated budget
- [ ] Budget history is preserved and viewable by fiscal year

## Suggested Branch Name

\`feature/department-budget-tracking\`" \
  --label "feature,story"
```
