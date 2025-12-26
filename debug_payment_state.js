const { sequelize } = require("./src/config/database");
const { Transaction, UserCredit, TransactionDetail, LiveCoursePackage } = require("./src/models");

const checkState = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB Connected");

    const userId = 3; // From user request

    // 1. Check Credits
    const credit = await UserCredit.findByPk(userId);
    console.log("Current Credit Balance:", credit ? credit.balance : "No record");

    // 2. Check Recent Transactions
    const transactions = await Transaction.findAll({
      where: { student_id: userId },
      include: [
        { 
          model: TransactionDetail, 
          as: "details",
          include: [{ model: LiveCoursePackage, as: "package" }]
        }
      ],
      order: [["created_at", "DESC"]],
      limit: 5
    });

    const result = transactions.map(t => ({
      id: t.transaction_id,
      code: t.transaction_code,
      status: t.status,
      amount: t.final_amount,
      packageId: t.details[0]?.package_id,
      packageName: t.details[0]?.package?.name,
      packageCredits: t.details[0]?.package?.credits,
      session: t.stripe_session_id
    }));
    
    const fs = require('fs');
    fs.writeFileSync('debug_output.json', JSON.stringify({
        currentBalance: credit ? credit.balance : 0,
        transactions: result
    }, null, 2));
    console.log("Debug output written to debug_output.json");

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

checkState();
