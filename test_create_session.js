const { sequelize } = require("./src/config/database");
const { LiveSession, User, LiveTopic } = require("./src/models");

const testCreate = async () => {
  try {
    await sequelize.authenticate();
    
    // Get instructor
    const instructor = await User.findOne({ where: { role: 'instructor' } });
    if (!instructor) throw new Error("No instructor");

    // Get topic
    const topic = await LiveTopic.findOne();
    if (!topic) throw new Error("No topic");

    console.log("Creating 1 session...");
    const session = await LiveSession.create({
        topic_id: topic.topic_id,
        instructor_id: instructor.user_id,
        scheduled_start: new Date(),
        scheduled_end: new Date(Date.now() + 3600000),
        title: "Test Session",
        meeting_link: "https://example.com"
    });
    
    console.log("Created:", session.session_id);
    process.exit(0);
  } catch (e) {
    console.error("FULL ERROR:", e);
    process.exit(1);
  }
};

testCreate();
