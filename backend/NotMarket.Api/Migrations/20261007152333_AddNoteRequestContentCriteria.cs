using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NotMarket.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNoteRequestContentCriteria : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdditionalNotes",
                table: "NoteRequests",
                type: "character varying(600)",
                maxLength: 600,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContentType",
                table: "NoteRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuestionCount",
                table: "NoteRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Topic",
                table: "NoteRequests",
                type: "character varying(180)",
                maxLength: 180,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_NoteRequests_PriceRange",
                table: "NoteRequests",
                sql: "\"SuggestedMinPrice\" > 0 AND \"SuggestedMaxPrice\" >= \"SuggestedMinPrice\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_NoteRequests_QuestionCount",
                table: "NoteRequests",
                sql: "(\"ContentType\" IS NULL AND \"QuestionCount\" IS NULL) OR (\"ContentType\" = 'StudyQuestions' AND \"QuestionCount\" IN (10, 15, 20, 25, 30)) OR (\"ContentType\" IN ('NoteOnly', 'DetailedSummary') AND \"QuestionCount\" IS NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_NoteRequests_PriceRange",
                table: "NoteRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_NoteRequests_QuestionCount",
                table: "NoteRequests");

            migrationBuilder.DropColumn(
                name: "AdditionalNotes",
                table: "NoteRequests");

            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "NoteRequests");

            migrationBuilder.DropColumn(
                name: "QuestionCount",
                table: "NoteRequests");

            migrationBuilder.DropColumn(
                name: "Topic",
                table: "NoteRequests");
        }
    }
}
