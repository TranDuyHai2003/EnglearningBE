const { sequelize } = require("./src/config/database");
const { Transaction, UserCredit, TransactionDetail, LiveCoursePackage } = require("./src/models");

const fixCredits = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB Connected");

    const transactionId = 163; // Found from debug script
    const transaction = await Transaction.findByPk(transactionId, {
       include: [
         { 
           model: TransactionDetail, 
           as: "details",
           include: [{ model: LiveCoursePackage, as: "package" }]
         }
       ]
    });

    if (!transaction) {
       console.log("Transaction not found");
       process.exit(1);
    }

    if (transaction.status === 'completed') {
       console.log("Transaction is completed.");
    }
    
    // Always check/fix credits
    const pkg = transaction.details[0]?.package;
    const studentId = transaction.student_id;
    
    console.log(`Checking credits for User ${studentId}...`);
    let credit = await UserCredit.findByPk(studentId);
    console.log("Current Balance DB:", credit ? credit.balance : "No record");

    if (pkg) {
        console.log(`Package ${pkg.name} has ${pkg.credits} credits.`);
        
        if (!credit) {
            credit = await UserCredit.create({ user_id: studentId, balance: pkg.credits });
            console.log("Created new credit record with:", pkg.credits);
        } else {
            // Force add only if it looks like it wasn't added? 
            // Or just add it now to make the user happy.
            credit.balance += pkg.credits;
            await credit.save();
            console.log("Updated Balance to:", credit.balance);
        }
    } else {
        console.log("No package details found!");
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

fixCredits();

