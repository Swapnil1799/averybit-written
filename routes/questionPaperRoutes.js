const express = require("express");
const { 
  createQuestionPaper, 
  addQuestionToPaper, 
  getAllQuestionPapers, 
  editQuestionPaper, 
  deleteQuestionPaper,
  editQuestionInPaper,
  deleteQuestionFromPaper,
  assignPapersToUser
} = require("../controllers/questionPaperController");
const router = express.Router();

// Create a new question paper
router.post("/create", createQuestionPaper);
router.post("/addQuestion", addQuestionToPaper);
router.get("/getAll", getAllQuestionPapers);
router.put("/edit", editQuestionPaper);
router.delete("/delete", deleteQuestionPaper);
router.put("/editQuestion", editQuestionInPaper);
router.delete("/deleteQuestion", deleteQuestionFromPaper);
router.post("/assignPapers", assignPapersToUser);
module.exports = router;
