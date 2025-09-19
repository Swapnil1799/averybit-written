const express = require("express");
const { 
  createQuestionPaper, 
  addQuestionToPaper, 
  getAllQuestionPapers, 
  editQuestionPaper, 
  deleteQuestionPaper,
  editQuestionInPaper,
  deleteQuestionFromPaper,
  assignPapersToUser,
  getQuestionPaperById 
} = require("../controllers/questionPaperController");
const router = express.Router();

// Create a new question paper
router.post("/create", createQuestionPaper);
router.post("/addQuestion", addQuestionToPaper);
router.get("/getAll", getAllQuestionPapers);
router.get("/getQuestion/:id", getQuestionPaperById); 
router.put("/edit", editQuestionPaper);
router.delete("/delete", deleteQuestionPaper);
router.put("/editQuestion", editQuestionInPaper);
router.delete("/deleteQuestion", deleteQuestionFromPaper);
router.post("/assignPapers", assignPapersToUser);
module.exports = router;
