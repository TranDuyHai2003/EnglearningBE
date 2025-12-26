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
    console.log("--- DEBUG SEED START ---");

    // 1. Packages
    console.log("Checking Packages...");
    try {
        const count = await LiveCoursePackage.count();
        console.log(`Current Packages: ${count}`);
        if (count === 0) {
            console.log("Creating Starter Pack...");
            await LiveCoursePackage.create({ name: "Starter Pack", description: "5 buổi", price: 500000, credits: 5 });
            console.log("Starter Pack created.");
        }
    } catch (e) {
        console.error("Package Error:", e);
    }

    // 2. Curriculum
    console.log("Checking Curriculum...");
    let level1;
    try {
        level1 = await LiveCurriculum.findOne({ where: { name: "Level 1: Survival English" } });
        if (!level1) {
            console.log("Creating Level 1...");
            level1 = await LiveCurriculum.create({ 
                name: "Level 1: Survival English", 
                description: "Basic",
                level_order: 1 
            });
            console.log("Level 1 created with ID:", level1.curriculum_id);
        } else {
            console.log("Level 1 found with ID:", level1.curriculum_id);
        }
    } catch (e) {
        console.error("Curriculum Error:", e);
    }

    // 3. Topics
    console.log("Checking Topics...");
    let topic1;
    if (level1) {
        try {
            topic1 = await LiveTopic.findOne({ where: { title: "Topic 1: Self Introduction" } });
            if (!topic1) {
                console.log("Creating Topic 1...");
                topic1 = await LiveTopic.create({ 
                    curriculum_id: level1.curriculum_id, 
                    title: "Topic 1: Self Introduction", 
                    description: "Intro", 
                    order_index: 1 
                });
                console.log("Topic 1 created with ID:", topic1.topic_id);
            } else {
                console.log("Topic 1 found with ID:", topic1.topic_id);
            }
        } catch (e) {
            console.error("Topic Error:", e);
        }
    }

    // 4. Instructor & Session
    console.log("Checking Instructor & Sessions...");
    if (topic1) {
        try {
            const instructor = await User.findOne();
            if (!instructor) {
                console.log("No instructor found. Skipping sessions.");
            } else {
                console.log("Instructor found:", instructor.user_id);
                const sessionCount = await LiveSession.count({ where: { topic_id: topic1.topic_id } });
                console.log(`Current Sessions for Topic 1: ${sessionCount}`);
                
                if (sessionCount === 0) {
                    console.log("Creating Session...");
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    
                    await LiveSession.create({
                        instructor_id: instructor.user_id,
                        topic_id: topic1.topic_id,
                        meeting_link: "debug-session",
                        scheduled_start: tomorrow,
                        scheduled_end: new Date(tomorrow.getTime() + 60*60*1000),
                        max_capacity: 5,
                        cost_in_credits: 1,
                        status: 'scheduled'
                    });
                    console.log("Session created.");
                }
            }
        } catch (e) {
            console.error("Session Error:", e);
        }
    }

    console.log("--- DEBUG SEED END ---");
    process.exit(0);

  } catch (err) {
    console.error("Fatal Error:", err);
    process.exit(1);
  }
}

seed();
