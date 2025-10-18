using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FixMyShot.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShotAnalyses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserName = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AverageElbowAngle = table.Column<float>(type: "REAL", nullable: false),
                    ConsistencyScore = table.Column<float>(type: "REAL", nullable: false),
                    ShotType = table.Column<int>(type: "INTEGER", nullable: false),
                    Handedness = table.Column<int>(type: "INTEGER", nullable: false),
                    FootStance = table.Column<int>(type: "INTEGER", nullable: false),
                    ApexFrame = table.Column<int>(type: "INTEGER", nullable: true),
                    ReleaseFrame = table.Column<int>(type: "INTEGER", nullable: true),
                    ReleaseAtApex = table.Column<bool>(type: "INTEGER", nullable: false),
                    Tips = table.Column<string>(type: "TEXT", nullable: false),
                    KeypointsJson = table.Column<string>(type: "TEXT", nullable: false),
                    AnnotatedVideoUrl = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShotAnalyses", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShotAnalyses");
        }
    }
}
