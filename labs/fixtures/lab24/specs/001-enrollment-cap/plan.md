# Implementation Plan: Course enrollment cap

**Branch**: `001-enrollment-cap` | **Spec**: [spec.md](spec.md)

## Summary

Add an optional `Capacity` to `Course` and a pure `EnrollmentCapPolicy` in the
Core project that decides whether one more enrollment fits. Controllers call the
policy; the policy has no database access, so it is unit-testable in isolation.

## Technical Context

- **Language/Version**: C# on the ASP.NET Core version in `dotnet/`
- **Testing**: xUnit in `dotnet/ContosoUniversity.Tests`
- **Constraint**: no schema change beyond one nullable column

## Project Structure

```text
dotnet/ContosoUniversity.Core/Models/Course.cs                 # + Capacity
dotnet/ContosoUniversity.Core/Services/EnrollmentCapPolicy.cs   # new
dotnet/ContosoUniversity.Tests/EnrollmentCapPolicyTests.cs      # new
```
