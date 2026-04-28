using System.ComponentModel.DataAnnotations;

namespace ContosoUniversity.Core.Validation
{
    /// <summary>
    /// Validates that a future date is not more than a specified number of years in the future.
    /// </summary>
    public class FutureDateValidationAttribute : ValidationAttribute
    {
        private readonly int _maxYearsInFuture;

        public FutureDateValidationAttribute(int maxYearsInFuture)
        {
            _maxYearsInFuture = maxYearsInFuture;
            ErrorMessage = $"Date cannot be more than {_maxYearsInFuture} years in the future.";
        }

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is DateTime dateValue)
            {
                var maxDate = DateTime.Now.AddYears(_maxYearsInFuture);
                if (dateValue > maxDate)
                {
                    return new ValidationResult(ErrorMessage);
                }
            }

            return ValidationResult.Success;
        }
    }

    /// <summary>
    /// Validates that a budget value is within a reasonable range for the department type.
    /// </summary>
    public class DepartmentBudgetValidationAttribute : ValidationAttribute
    {
        private readonly string _departmentTypePropertyName;
        private readonly Dictionary<string, (decimal Min, decimal Max)> _budgetRanges;

        public DepartmentBudgetValidationAttribute(string departmentTypePropertyName)
        {
            _departmentTypePropertyName = departmentTypePropertyName;
            _budgetRanges = new Dictionary<string, (decimal, decimal)>
            {
                { "Academic", (50000, 5000000) },
                { "Administrative", (100000, 10000000) },
                { "Research", (200000, 20000000) }
            };
        }

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is decimal budget)
            {
                // Get the property value for department type
                var typeProperty = validationContext.ObjectType.GetProperty(_departmentTypePropertyName);
                if (typeProperty == null)
                {
                    return new ValidationResult($"Unknown property: {_departmentTypePropertyName}");
                }

                var departmentType = typeProperty.GetValue(validationContext.ObjectInstance) as string;
                if (string.IsNullOrEmpty(departmentType) || !_budgetRanges.ContainsKey(departmentType))
                {
                    return new ValidationResult($"Invalid department type: {departmentType}");
                }

                var (min, max) = _budgetRanges[departmentType];
                if (budget < min || budget > max)
                {
                    return new ValidationResult($"Budget for {departmentType} department must be between {min:C0} and {max:C0}");
                }
            }

            return ValidationResult.Success;
        }
    }

    /// <summary>
    /// Validates that the name follows the required pattern and doesn't contain reserved words.
    /// </summary>
    public class DepartmentNameValidationAttribute : ValidationAttribute
    {
        private readonly string[] _reservedWords = { "Test", "Demo", "Sample", "Temp" };

        public DepartmentNameValidationAttribute()
        {
            ErrorMessage = "Department name cannot contain reserved words and must start with a letter.";
        }

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is string name)
            {
                // Check if name starts with a letter
                if (!char.IsLetter(name[0]))
                {
                    return new ValidationResult("Department name must start with a letter.");
                }

                // Check for reserved words
                foreach (var word in _reservedWords)
                {
                    if (name.Contains(word, StringComparison.OrdinalIgnoreCase))
                    {
                        return new ValidationResult($"Department name cannot contain the reserved word '{word}'.");
                    }
                }
            }

            return ValidationResult.Success;
        }
    }
}
