const express = require("express");
const router = express.Router();

const curriculumRoutes = require("./routes/curriculum.routes");

router.use("/", curriculumRoutes);

module.exports = router;
