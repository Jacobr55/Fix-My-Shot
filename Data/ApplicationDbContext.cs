using Microsoft.EntityFrameworkCore;
using FixMyShot.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace FixMyShot.Data
{
    public class ApplicationDbContext : DbContext
    {

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
          : base(options)
        {
        }

        public DbSet<ShotAnalysis> ShotAnalyses { get; set; }


    }
}
