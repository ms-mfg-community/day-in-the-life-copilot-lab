---
description: "Razor view conventions for ContosoUniversity"
applyTo: '**/*.cshtml'
---

# Razor View Guidelines

- Use Tag Helpers (`asp-for`, `asp-action`) instead of HTML helpers (`@Html.`).
- Always include `asp-validation-for` next to form inputs.
- Use `asp-validation-summary="ModelOnly"` at the top of forms.
- Display student names as "LastName, FirstMidName" using `@($"{item.LastName}, {item.FirstMidName}")`.
- Include `@section Scripts { @{await Html.RenderPartialAsync("_ValidationScriptsPartial");} }` in form pages.
- Use Bootstrap 5 CSS classes for layout and styling.
