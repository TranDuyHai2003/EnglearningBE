const { sequelize } = require("./src/config/database");
const { LiveTopic } = require("./src/models");

const listTopics = async () => {
  try {
    await sequelize.authenticate();
    const topics = await LiveTopic.findAll();
    console.log(JSON.stringify(topics, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

listTopics();
