const express = require("express");
const { generateQuiz } = require("../controllers/quizController");

const router = express.Router();

router.post("/generate", generateQuiz);

module.exports = router;
