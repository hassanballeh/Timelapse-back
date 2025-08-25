function errorHandler(error, req, res, next) {
  console.error("Global error:", error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ success: false, error: "File size too large (max 100MB)" });
  }

  res.status(500).json({
    success: false,
    error: error.message || "Internal server error",
  });
}

module.exports = errorHandler;
