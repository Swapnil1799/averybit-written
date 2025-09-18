const express = require("express");
const { addQuestions,getAllQuestions } = require("../controllers/questionController");

const router = express.Router();

router.get("/getAllQuestions", getAllQuestions); 
router.post("/addQuestions", addQuestions);

module.exports = router;
