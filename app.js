const express = require("express");
const cors = require("cors");
const { createDirectories } = require("./src/utils/directories");
const errorHandler = require("./src/middlewares/errorHandler");
const uploadRoutes = require("./src/routes/upload");
const downloadRoutes = require("./src/routes/download");
const videoRoutes = require("./src/routes/videos");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use("/api", uploadRoutes);
app.use("/api", downloadRoutes);
app.use("/api", videoRoutes);

app.use(errorHandler);

createDirectories().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // generateSimpleSequence();
  });
});
