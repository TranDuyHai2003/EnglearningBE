const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Transaction = sequelize.define(
  "Transaction",
  {
    transaction_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transaction_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    final_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM(
        "bank_card",
        "e_wallet",
        "bank_transfer"
      ),
    },
    payment_gateway: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "completed",
        "failed",
        "refunded"
      ),
      defaultValue: "pending",
    },
    payment_at: {
      type: DataTypes.DATE,
    },
    refunded_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
  }
);

module.exports = Transaction;
