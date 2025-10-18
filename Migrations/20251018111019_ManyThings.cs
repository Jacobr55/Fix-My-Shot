using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FixMyShot.Migrations
{
    /// <inheritdoc />
    public partial class ManyThings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnnotatedVideoUrl",
                table: "ShotAnalyses");

            migrationBuilder.DropColumn(
                name: "ApexFrame",
                table: "ShotAnalyses");

            migrationBuilder.DropColumn(
                name: "FootStance",
                table: "ShotAnalyses");

            migrationBuilder.DropColumn(
                name: "Handedness",
                table: "ShotAnalyses");

            migrationBuilder.DropColumn(
                name: "KeypointsJson",
                table: "ShotAnalyses");

            migrationBuilder.DropColumn(
                name: "ReleaseAtApex",
                table: "ShotAnalyses");

            migrationBuilder.DropColumn(
                name: "ReleaseFrame",
                table: "ShotAnalyses");

            migrationBuilder.DropColumn(
                name: "ShotType",
                table: "ShotAnalyses");

            migrationBuilder.RenameColumn(
                name: "ConsistencyScore",
                table: "ShotAnalyses",
                newName: "AverageFeetDistance");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "AverageFeetDistance",
                table: "ShotAnalyses",
                newName: "ConsistencyScore");

            migrationBuilder.AddColumn<string>(
                name: "AnnotatedVideoUrl",
                table: "ShotAnalyses",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ApexFrame",
                table: "ShotAnalyses",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FootStance",
                table: "ShotAnalyses",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Handedness",
                table: "ShotAnalyses",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "KeypointsJson",
                table: "ShotAnalyses",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "ReleaseAtApex",
                table: "ShotAnalyses",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ReleaseFrame",
                table: "ShotAnalyses",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ShotType",
                table: "ShotAnalyses",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
