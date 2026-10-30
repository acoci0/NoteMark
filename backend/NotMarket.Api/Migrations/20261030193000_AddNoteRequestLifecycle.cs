using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NotMarket.Api.Data;

#nullable disable

namespace NotMarket.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261030193000_AddNoteRequestLifecycle")]
public partial class AddNoteRequestLifecycle : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "LifecycleStatus",
            table: "NoteRequests",
            type: "character varying(16)",
            maxLength: 16,
            nullable: false,
            defaultValue: "Active");

        migrationBuilder.CreateIndex(
            name: "IX_NoteRequests_BuyerId_LifecycleStatus",
            table: "NoteRequests",
            columns: new[] { "BuyerId", "LifecycleStatus" });

        migrationBuilder.AddCheckConstraint(
            name: "CK_NoteRequests_LifecycleStatus",
            table: "NoteRequests",
            sql: "\"LifecycleStatus\" IN ('Active', 'Paused', 'Closed', 'Deleted')");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "CK_NoteRequests_LifecycleStatus",
            table: "NoteRequests");

        migrationBuilder.DropIndex(
            name: "IX_NoteRequests_BuyerId_LifecycleStatus",
            table: "NoteRequests");

        migrationBuilder.DropColumn(
            name: "LifecycleStatus",
            table: "NoteRequests");
    }
}
