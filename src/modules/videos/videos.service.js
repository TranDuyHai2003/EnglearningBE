const { getLessonWithAccessCheck } = require("./videos.repo");
const { streamVideoFromS3, RangeNotSatisfiableError } = require("./videos.stream");

const streamLessonVideo = async ({ req, res, user, lessonId, rangeHeader }) => {
  const videoMeta = await getLessonWithAccessCheck({
    userId: user.id,
    role: user.role,
    lessonId,
  });

  try {
    await streamVideoFromS3({
      req,
      res,
      bucket: videoMeta.bucket,
      key: videoMeta.objectKey,
      mimeType: videoMeta.mimeType,
      rangeHeader,
    });
  } catch (error) {
    if (error instanceof RangeNotSatisfiableError) {
      res.set({ "Accept-Ranges": "bytes" });
      throw error;
    }
    throw error;
  }
};

module.exports = {
  streamLessonVideo,
};
