const path = require("path");
const { sequelize } = require(path.join(__dirname, "../src/config/database"));
const { DataTypes } = require("sequelize");

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log("Starting Week 5 migration...");

    // 1. Update qa_discussions table
    console.log("Updating qa_discussions table...");
    const qaDiscussionsInfo = await queryInterface.describeTable("qa_discussions");
    
    if (!qaDiscussionsInfo.title) {
      await queryInterface.addColumn("qa_discussions", "title", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Untitled Question",
      });
      console.log("✅ Added title column to qa_discussions");
    }
    
    if (qaDiscussionsInfo.question) {
      await queryInterface.renameColumn("qa_discussions", "question", "content");
      console.log("✅ Renamed question to content in qa_discussions");
    }
    
    if (!qaDiscussionsInfo.is_resolved) {
      await queryInterface.addColumn("qa_discussions", "is_resolved", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      });
      console.log("✅ Added is_resolved column to qa_discussions");
    }

    // 2. Update qa_replies table
    console.log("Updating qa_replies table...");
    const qaRepliesInfo = await queryInterface.describeTable("qa_replies");
    
    if (qaRepliesInfo.reply_text) {
      await queryInterface.renameColumn("qa_replies", "reply_text", "content");
      console.log("✅ Renamed reply_text to content in qa_replies");
    }
    
    if (!qaRepliesInfo.is_helpful) {
      await queryInterface.addColumn("qa_replies", "is_helpful", {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      });
      console.log("✅ Added is_helpful column to qa_replies");
    }

    // 3. Update reviews table
    console.log("Updating reviews table...");
    const reviewsInfo = await queryInterface.describeTable("reviews");
    
    if (reviewsInfo.status) {
      await queryInterface.removeColumn("reviews", "status");
      console.log("✅ Removed status column from reviews");
    }
    
    // Add unique constraint
    try {
      await queryInterface.addConstraint("reviews", {
        fields: ["student_id", "course_id"],
        type: "unique",
        name: "unique_student_course",
      });
      console.log("✅ Added unique constraint to reviews");
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        console.log("⚠️  Unique constraint already exists");
      } else {
        throw error;
      }
    }

    // 4. Create content_reports table
    console.log("Creating content_reports table...");
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes("content_reports")) {
      await queryInterface.createTable("content_reports", {
        report_id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        reporter_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onDelete: "CASCADE",
        },
        content_type: {
          type: DataTypes.ENUM("discussion", "reply", "review"),
          allowNull: false,
        },
        content_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("pending", "reviewed", "resolved"),
          defaultValue: "pending",
        },
        admin_note: {
          type: DataTypes.TEXT,
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      });
      console.log("✅ Created content_reports table");
    } else {
      console.log("⚠️  content_reports table already exists");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

migrate();
