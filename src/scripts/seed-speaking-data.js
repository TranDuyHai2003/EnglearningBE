const { 
  sequelize, 
  LiveCoursePackage, 
  LiveCurriculum, 
  LiveTopic, 
  LiveSession,
  User 
} = require("../models");

async function seed() {
  try {
    console.log("Starting Speaking Club Seeding...");
    
    // 1. Packages
    console.log("Seeding Packages...");
    const existingPackages = await LiveCoursePackage.count();
    if (existingPackages === 0) {
       await LiveCoursePackage.bulkCreate([
          { name: "Starter Pack", description: "5 buổi học Speaking 1-1", price: 500000, credits: 5 },
          { name: "Pro Master", description: "20 buổi học cam kết đầu ra", price: 1800000, credits: 20 },
       ]);
    } else {
       console.log("Packages already exist. Skipping.");
    }

    // 2. Curriculum & Topics
    console.log("Seeding Curriculum...");
    let level1 = await LiveCurriculum.findOne({ where: { name: "Level 1: Survival English" } });
    if (!level1) {
       level1 = await LiveCurriculum.create({ 
          name: "Level 1: Survival English", 
          description: "Tiếng Anh sinh tồn cho người mất gốc",
          level_order: 1 
       });
       
       await LiveTopic.bulkCreate([
          { curriculum_id: level1.curriculum_id, title: "Topic 1: Self Introduction", description: "Learn to introduce yourself.", order_index: 1 },
          { curriculum_id: level1.curriculum_id, title: "Topic 2: Family & Friends", description: "Talking about relationships.", order_index: 2 },
          { curriculum_id: level1.curriculum_id, title: "Topic 3: At the Restaurant", description: "Ordering food and drinks.", order_index: 3 },
       ]);
    }

    let level2 = await LiveCurriculum.findOne({ where: { name: "Level 2: Daily Conversation" } });
    if (!level2) {
       level2 = await LiveCurriculum.create({ 
          name: "Level 2: Daily Conversation", 
          description: "Giao tiếp hàng ngày tự tin",
          level_order: 2 
       });

       await LiveTopic.bulkCreate([
          { curriculum_id: level2.curriculum_id, title: "Topic 1: Travel Plans", description: "booking flights and hotels.", order_index: 1 },
          { curriculum_id: level2.curriculum_id, title: "Topic 2: Job Interview", description: "Common interview questions.", order_index: 2 },
       ]);
    }

    // 3. Sessions (Slots)
    console.log("Seeding Sessions...");
    // Find valid topic to link
    const topic = await LiveTopic.findOne({ where: { title: "Topic 1: Self Introduction" } });
    if (!topic) {
       throw new Error("Topic not found. Seeding failed order.");
    }

    const instructor = await User.findOne({ where: { role: 'instructor' } }) || await User.findOne();
    
    if (instructor) {
       const today = new Date();
       const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
       
       // Slot 1: Tomorrow 19:00
       const slot1Start = new Date(tomorrow); slot1Start.setHours(19, 0, 0);
       const slot1End = new Date(tomorrow); slot1End.setHours(19, 45, 0);

       // Slot 2: Tomorrow 20:00
       const slot2Start = new Date(tomorrow); slot2Start.setHours(20, 0, 0);
       const slot2End = new Date(tomorrow); slot2End.setHours(20, 45, 0);

       // Check if sessions already exist to avoid spamming
       const count = await LiveSession.count({ where: { topic_id: topic.topic_id } });
       if (count === 0) {
          await LiveSession.bulkCreate([
             {
                instructor_id: instructor.user_id,
                topic_id: topic.topic_id, 
                meeting_link: `live-session-${Date.now()}-1`, 
                scheduled_start: slot1Start,
                scheduled_end: slot1End,
                max_capacity: 5,
                cost_in_credits: 1,
                status: 'scheduled'
             },
             {
               instructor_id: instructor.user_id,
               topic_id: topic.topic_id, 
               meeting_link: `live-session-${Date.now()}-2`,
               scheduled_start: slot2Start,
               scheduled_end: slot2End,
               max_capacity: 5,
               cost_in_credits: 1,
               status: 'scheduled'
            }
          ]);
          console.log("Created 2 test sessions.");
       } else {
          console.log("Sessions already exist. Skipping.");
       }
    } else {
       console.log("Warning: No user found to assign as instructor.");
    }

    console.log("Seeding Completed Successfully!");
    process.exit(0);

  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
