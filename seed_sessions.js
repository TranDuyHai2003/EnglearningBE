const { sequelize } = require("./src/config/database");
const { LiveSession, User, LiveTopic } = require("./src/models");
const bcrypt = require("bcryptjs");

const seedSessions = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB Connected");

    // 1. Get or Create Instructor
    let instructor = await User.findOne({ where: { role: 'instructor' } });
    if (!instructor) {
       console.log("Creating dummy instructor...");
       const hashedPassword = await bcrypt.hash("password123", 10);
       instructor = await User.create({
          email: "teacher@engbreaking.com",
          password: hashedPassword,
          full_name: "Teacher John",
          role: "instructor",
          status: "active"
       });
    }
    console.log("Instructor ID:", instructor.user_id);

    // 2. Get Topics
    const topics = await LiveTopic.findAll();
    if (topics.length === 0) {
       console.log("No topics found! Seed topics first.");
       process.exit(1);
    }
    console.log(`Found ${topics.length} topics.`);

    // 3. Create Sessions for next 3 days
    const sessionsToCreate = [];
    const now = new Date();

    // Create 3 slots per day for the first 2 topics
    for (let i = 0; i < 3; i++) { // Days
       const date = new Date(now);
       date.setDate(date.getDate() + i);
       
       // Slots: 10:00, 14:00, 20:00
       const hours = [10, 14, 20];

       for (const h of hours) {
          // Topic A
          if (topics[0]) {
              const start = new Date(date);
              start.setHours(h, 0, 0, 0);
              const end = new Date(start);
              end.setMinutes(end.getMinutes() + 45); // 45 min session

              sessionsToCreate.push({
                  topic_id: topics[0].topic_id,
                  instructor_id: instructor.user_id,
                  scheduled_start: start,
                  scheduled_end: end,
                  max_capacity: 1, // 1-on-1
                  status: 'scheduled',
                  meeting_link: `https://meet.jit.si/engbreaking-${Date.now()}-${h}`,
                  cost_in_credits: 1,
                  title: `Practice: ${topics[0].name || topics[0].title}`
              });
          }
          
          // Topic B (if exists) - varied time
          if (topics[1]) {
              const start = new Date(date);
              start.setHours(h + 1, 0, 0, 0); // 1 hour later
              const end = new Date(start);
              end.setMinutes(end.getMinutes() + 45);

              sessionsToCreate.push({
                  topic_id: topics[1].topic_id,
                  instructor_id: instructor.user_id,
                  scheduled_start: start,
                  scheduled_end: end,
                  max_capacity: 1,
                  status: 'scheduled',
                  meeting_link: `https://meet.jit.si/engbreaking-${Date.now()}-B-${h}`,
                  cost_in_credits: 1,
                  title: `Practice: ${topics[1].name || topics[1].title}`
              });
          }
       }
    }

    await LiveSession.bulkCreate(sessionsToCreate);
    console.log(`Successfully created ${sessionsToCreate.length} sessions.`);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

seedSessions();
