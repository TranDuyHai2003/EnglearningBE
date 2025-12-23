require("dotenv").config();
const { faker } = require("@faker-js/faker");
const { sequelize } = require("../src/config/database");
const models = require("../src/models");
const { User, SupportTicket, SupportReply } = models;

const seedSupportTickets = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");

    // 1. Fetch Users
    const students = await User.findAll({ where: { role: 'student' }, limit: 20 });
    const instructors = await User.findAll({ where: { role: 'instructor' }, limit: 10 });
    const supportAdmin = await User.findOne({ where: { role: 'support_admin' } });
    const systemAdmin = await User.findOne({ where: { role: 'system_admin' } });

    if (!students.length || !instructors.length) {
      console.log("Not enough users found. Please run the main seed script first.");
      process.exit(1);
    }

    const potentialRequesters = [...students, ...instructors];
    const admins = [supportAdmin, systemAdmin].filter(Boolean);

    // English Support Request Templates
    const supportTemplates = [
      {
        category: "technical",
        subject: "Cannot access my course video",
        description: "Hi team, I bought the IELTS Master course yesterday but when I try to play the video for Lesson 3, it just keeps buffering. I have checked my internet connection and it is fine. Can you please help?",
        priority: "high"
      },
      {
        category: "payment",
        subject: "Double charge on my credit card",
        description: "Hello, I noticed that I was charged twice for the same course 'Business English'. Please refund the duplicate transaction. My order ID is #TRX-998877.",
        priority: "urgent"
      },
      {
        category: "content",
        subject: "Typo in quiz question",
        description: "I found a spelling mistake in the quiz for 'Grammar Essentials', Question 5. It says 'their' instead of 'there'. Just wanted to let you know.",
        priority: "low"
      },
      {
        category: "other",
        subject: "Request for certificate change",
        description: "My name on the certificate is spelled correctly, but I would like to add my middle name as well. Is it possible to regenerate the certificate? My full name is Nguyen Van A.",
        priority: "medium"
      },
      {
        category: "technical",
        subject: "Login issues on mobile",
        description: "I can login on my laptop but when I try to login on my phone using Chrome, it says 'Invalid credentials'. I am sure my password is correct.",
        priority: "high"
      },
      {
        category: "payment",
        subject: "Invoice request",
        description: "I need a VAT invoice for my company for the course I purchased last week. Can you please send it to my email?",
        priority: "medium"
      },
      {
        category: "content",
        subject: "Suggestion for new topic",
        description: "I really love the speaking course. I was wondering if you could add a section about 'Medical English' in the future? That would be very helpful for my job.",
        priority: "low"
      },
      {
        category: "technical",
        subject: "Audio not syncing",
        description: "The audio in lesson 4 of the pronunciation course is not syncing with the subtitles. It's about 2 seconds delay.",
        priority: "medium"
      },
       {
        category: "payment",
        subject: "Discount code not working",
        description: "I tried to use the code WELCOME20 but it says it is expired. The banner says it is valid until end of this month.",
        priority: "medium"
      },
      {
         category: "other",
         subject: "Delete my account",
         description: "I want to delete my account and all my personal data. Please let me know the process.",
         priority: "high"
      }
    ];

    console.log(`Creating support tickets...`);

    const tickets = [];

    for (let i = 0; i < 20; i++) {
      const requester = faker.helpers.arrayElement(potentialRequesters);
      const template = faker.helpers.arrayElement(supportTemplates);
      
      // Randomize status
      const status = faker.helpers.weightedArrayElement([
          { value: "open", weight: 3 },
          { value: "in_progress", weight: 3 },
          { value: "resolved", weight: 3 },
          { value: "closed", weight: 1 }
      ]);

      let assignedTo = null;
      let resolvedAt = null;

      if (status !== "open" && admins.length > 0) {
          assignedTo = faker.helpers.arrayElement(admins).user_id;
      }

      if (status === "resolved" || status === "closed") {
          resolvedAt = faker.date.recent({ days: 5 });
      }

      const ticket = await SupportTicket.create({
        user_id: requester.user_id,
        category: template.category,
        subject: template.subject, // Using the template subject directly or varying it slightly could be better, but this is fine for seeding.
        description: template.description,
        priority: template.priority,
        status: status,
        assigned_to: assignedTo,
        resolved_at: resolvedAt
      });
      
      tickets.push(ticket);

      // Create replies if assigned
      if (assignedTo) {
          // Admin replies
          await SupportReply.create({
              ticket_id: ticket.ticket_id,
              user_id: assignedTo,
              reply_text: "Thank you for contacting us. We are looking into your issue."
          });

          // If resolved, add closing remark
          if (status === "resolved") {
              await SupportReply.create({
                  ticket_id: ticket.ticket_id,
                  user_id: assignedTo,
                  reply_text: "We have resolved the issue. Please check again and let us know if you need further assistance."
              });
              
              // Maybe user says thanks
              if (faker.datatype.boolean()) {
                  await SupportReply.create({
                    ticket_id: ticket.ticket_id,
                    user_id: requester.user_id,
                    reply_text: "Thank you, it works now!"
                });
              }
          }
      }
    }

    console.log(`Successfully created ${tickets.length} support tickets with English content.`);
    process.exit(0);

  } catch (error) {
    console.error("Error seeding support tickets:", error);
    process.exit(1);
  }
};

seedSupportTickets();
