require("dotenv").config();
const { faker } = require("@faker-js/faker");
const { sequelize } = require("../src/config/database");
const models = require("../src/models");
const { Section, Lesson } = models;

const seedPendingLessons = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");

    // Find some sections
    const sections = await Section.findAll({ limit: 5 });

    if (sections.length === 0) {
      console.log("No sections found. Please run the main seed script first.");
      process.exit(1);
    }

    console.log(`Found ${sections.length} sections. Adding pending lessons...`);

    const pendingLessons = [];
    const lessonTypes = ["video", "document", "quiz"];

    for (const section of sections) {
      const count = 3; // Add 3 pending lessons for each of the first 5 sections
      for (let i = 0; i < count; i++) {
        const lessonType = faker.helpers.arrayElement(lessonTypes);
        
        let videoUrl = null;
        let videoDuration = 0;
        let content = null;

        if (lessonType === "video") {
           videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // Placeholder
           videoDuration = 300;
        } else {
           content = `<p>${faker.lorem.paragraphs(2)}</p>`;
        }

        const lesson = await Lesson.create({
          section_id: section.section_id,
          title: `[Pending] ${faker.company.catchPhrase()}`,
          description: faker.lorem.sentence(),
          lesson_type: lessonType,
          video_url: videoUrl,
          video_duration: videoDuration,
          content: content,
          allow_preview: false,
          display_order: 99, // Put them at the end
          approval_status: "pending",
        });
        
        pendingLessons.push(lesson);
        console.log(`Created pending lesson: ${lesson.title} (ID: ${lesson.lesson_id})`);
      }
    }

    console.log(`Successfully added ${pendingLessons.length} pending lessons.`);
    process.exit(0);

  } catch (error) {
    console.error("Error seeding pending lessons:", error);
    process.exit(1);
  }
};

seedPendingLessons();
