const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Booking = sequelize.define(
  "Booking",
  {
    booking_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("confirmed", "attended", "cancelled", "no_show"),
      defaultValue: "confirmed",
    },
    role: {
      type: DataTypes.ENUM("speaker", "observer"),
      defaultValue: "speaker",
    },
    notes: {
      type: DataTypes.TEXT, // Instructor feedback
    },
  },
  {
    tableName: "bookings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = Booking;
