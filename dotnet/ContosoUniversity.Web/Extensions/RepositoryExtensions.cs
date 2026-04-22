using ContosoUniversity.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace ContosoUniversity.Web.Extensions
{
    public static class RepositoryExtensions
    {
        /// <summary>
        /// Extension method to provide a queryable collection from the repository asynchronously
        /// </summary>
        /// <typeparam name="T">The entity type</typeparam>
        /// <param name="repository">The repository instance</param>
        /// <returns>Task with IEnumerable of entities</returns>
        public static Task<IEnumerable<T>> GetAllAsync<T>(this IRepository<T> repository) where T : class
        {
            return repository.GetAllAsync();
        }

        /// <summary>
        /// Extension method to provide a filtered collection from the repository asynchronously
        /// </summary>
        /// <typeparam name="T">The entity type</typeparam>
        /// <param name="repository">The repository instance</param>
        /// <param name="predicate">The filter predicate</param>
        /// <returns>Task with IEnumerable of filtered entities</returns>
        public static Task<IEnumerable<T>> FindAsync<T>(this IRepository<T> repository, Expression<Func<T, bool>> predicate) where T : class
        {
            return repository.FindAsync(predicate);
        }
    }
}
