const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");

// ---- Routes ----
router.post("/submit", resultController.submitResult);
router.get("/:userId/:paperId", resultController.getResult);
router.get("/:resultId", resultController.getResultById);

module.exports = router;
