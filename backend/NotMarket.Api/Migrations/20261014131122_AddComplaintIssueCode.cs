using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NotMarket.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddComplaintIssueCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IssueCode",
                table: "Complaints",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IssueCode",
                table: "Complaints");
        }
    }
}
