const asyncHandler = require("../../utils/asyncHandler");
const { streamLessonVideo } = require("./videos.service");

const streamLessonVideoController = asyncHandler(async (req, res) => {
  const lessonId = Number.parseInt(req.params.lessonId, 10);
  if (Number.isNaN(lessonId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid lesson id" });
  }

  await streamLessonVideo({
    req,
    res,
    user: req.user,
    lessonId,
    rangeHeader: req.headers.range,
  });
});

module.exports = {
  streamLessonVideoController,
};
