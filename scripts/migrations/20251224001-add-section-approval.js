"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper to check if column exists
    const tableInfo = await queryInterface.describeTable("sections");
    
    if (!tableInfo.approval_status) {
      await queryInterface.addColumn("sections", "approval_status", {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
        allowNull: false,
      });
      
      // Update existing records to 'approved' so current courses don't break
      await queryInterface.sequelize.query(
        `UPDATE sections SET approval_status = 'approved'`
      );
    }
    
    if (!tableInfo.rejection_reason) {
      await queryInterface.addColumn("sections", "rejection_reason", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("sections");
    
    if (tableInfo.rejection_reason) {
      await queryInterface.removeColumn("sections", "rejection_reason");
    }
    
    if (tableInfo.approval_status) {
      await queryInterface.removeColumn("sections", "approval_status");
      // Note: We might want to remove the ENUM type too if it was created custom, 
      // but Sequelize usually handles ENUMs as inline checks in Postgres 
      // or creates a type. Dropping the type is safer if we knew its name using raw SQL.
      // For now, removing column is sufficient for rollback.
    }
  },
};
