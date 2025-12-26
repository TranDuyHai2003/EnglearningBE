const { 
  LiveCoursePackage, 
  UserCredit, 
  LiveCurriculum, 
  LiveTopic, 
  Booking,
  LiveSession,
  User,
  sequelize
} = require("../models");
const { Op } = require("sequelize");

// --- PACKAGES & CREDITS ---

exports.listPackages = async (req, res) => {
  try {
    const packages = await LiveCoursePackage.findAll({
      where: { is_active: true },
      order: [["price", "ASC"]]
    });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching packages", error: err.message });
  }
};

exports.buyPackage = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id;

    const pkg = await LiveCoursePackage.findByPk(packageId);
    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    // MOCK PAYMENT LOGIC
    // In real app, verify payment gateway success here.
    
    // Add Credits
    let credit = await UserCredit.findByPk(userId);
    if (!credit) {
      credit = await UserCredit.create({ user_id: userId, balance: 0 });
    }

    credit.balance += pkg.credits;
    await credit.save();

    res.json({ message: "Purchase successful", balance: credit.balance });
  } catch (err) {
    res.status(500).json({ message: "Purchase failed", error: err.message });
  }
};

exports.getMyCredit = async (req, res) => {
  try {
     const credit = await UserCredit.findByPk(req.user.id);
     res.json({ balance: credit ? credit.balance : 0 });
  } catch (err) {
     res.status(500).json({ message: "Error fetching credit" });
  }
}

// --- CURRICULUM ---

exports.listCurriculum = async (req, res) => {
  try {
    const curriculum = await LiveCurriculum.findAll({
      include: [{
        model: LiveTopic,
        as: "topics",
        order: [["order_index", "ASC"]]
      }],
      order: [["level_order", "ASC"]]
    });
    res.json(curriculum);
  } catch (err) {
    res.status(500).json({ message: "Error fetching curriculum", error: err.message });
  }
};

// --- BOOKING ---

exports.getScheduleForTopic = async (req, res) => {
  try {
    const { topicId } = req.query;
    if (!topicId) return res.status(400).json({ message: "Topic ID required" });

    // Find sessions for this topic starting in the future
    const sessions = await LiveSession.findAll({
      where: {
        topic_id: topicId,
        scheduled_start: {
          [Op.gt]: new Date()
        },
        status: "scheduled"
      },
      include: [
        { model: User, as: "instructor", attributes: ["user_id", "full_name"] },
        { model: Booking, as: "bookings" } // To count active bookings
      ],
      order: [["scheduled_start", "ASC"]]
    });

    // Calculate slots left
    const result = sessions.map(s => {
       const bookedCount = s.bookings.filter(b => b.status === "confirmed").length;
       return {
          session_id: s.session_id,
          start: s.scheduled_start,
          end: s.scheduled_end,
          instructor: s.instructor.full_name,
          capacity: s.max_capacity,
          booked: bookedCount,
          is_full: bookedCount >= s.max_capacity
       };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching schedule", error: err.message });
  }
};

exports.bookSlot = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    const result = await sequelize.transaction(async (t) => {
        // 1. Lock & Get Session (No includes to avoid FOR UPDATE join error)
        const session = await LiveSession.findByPk(sessionId, {
           lock: t.LOCK.UPDATE, 
           transaction: t
        });

        if (!session) throw new Error("Session not found");

        // 2. Check Capacity (Count separately)
        const activeBookingsCount = await Booking.count({
            where: { session_id: sessionId, status: "confirmed" },
            transaction: t
        });
        
        if (activeBookingsCount >= session.max_capacity) {
           throw new Error("Class is full");
        }

        // 3. Check existing booking
        const existing = await Booking.findOne({
           where: { session_id: sessionId, user_id: userId, status: "confirmed" },
           transaction: t
        });
        if (existing) {
           throw new Error("You already booked this class");
        }

        // 4. Check & Deduct Credits
        const userCredit = await UserCredit.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
        const cost = session.cost_in_credits || 1; 

        if (!userCredit || userCredit.balance < cost) {
           throw new Error("Insufficient credits. Please buy a package.");
        }

        userCredit.balance -= cost;
        await userCredit.save({ transaction: t });

        // 5. Create Booking
        await Booking.create({
           user_id: userId,
           session_id: sessionId,
           status: "confirmed",
           role: "speaker" 
        }, { transaction: t });

        return userCredit.balance;
    });

    res.json({ message: "Booking successful!", remaining_balance: result });

  } catch (err) {
    res.status(400).json({ message: err.message || "Booking failed" });
  }
};
// --- INSTRUCTOR ---

exports.getInstructorSchedule = async (req, res) => {
  try {
    const instructorId = req.user.id;

    const sessions = await LiveSession.findAll({
      where: {
        instructor_id: instructorId,
        status: "scheduled",
        scheduled_start: { [Op.gt]: new Date() } // Future only? Or all? Let's say details > now - 1 hour to allow joining
      },
      include: [
        { 
           model: LiveTopic, 
           as: "topic",
           include: [{ model: LiveCurriculum, as: "curriculum", attributes: ["name"] }] 
        },
        { model: Booking, as: "bookings", include: [{ model: User, as: "student", attributes: ["full_name", "avatar_url"] }] }
      ],
      order: [["scheduled_start", "ASC"]]
    });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: "Error fetching instructor schedule", error: err.message });
  }
};

// --- ADMIN ---

exports.createPackage = async (req, res) => {
  try {
    if (req.user.role !== "system_admin") {
      return res.status(403).json({ message: "Admin only" });
    }
    const { name, description, price, credits, is_active } = req.body;
    
    // Simple validation
    if (!name || !price || !credits) {
       return res.status(400).json({ message: "Missing required fields" });
    }

    const pkg = await LiveCoursePackage.create({
      name, description, price, credits, is_active: is_active ?? true
    });
    
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ message: "Error creating package", error: err.message });
  }
};

exports.createTopic = async (req, res) => {
  try {
    // Admin or Instructor (Content Creator)
    if (!["system_admin", "instructor"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { curriculumId, title, description, orderIndex, slideUrl } = req.body;
    
    if (!curriculumId || !title) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const topic = await LiveTopic.create({
      curriculum_id: curriculumId,
      title,
      description,
      order_index: orderIndex || 0,
      slide_url: slideUrl
    });

    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: "Error creating topic", error: err.message });
  }
};
