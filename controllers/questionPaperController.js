const admin = require("firebase-admin");

// ---- Get all question papers with their questions ----
exports.getAllQuestionPapers = async (req, res) => {
  try {
    const papersSnapshot = await admin.firestore().collection("questionPapers").get();

    if (papersSnapshot.empty) {
      return res.status(404).json({ message: "No question papers found", papers: [] });
    }

    const papers = [];

    for (const paperDoc of papersSnapshot.docs) {
      const paperData = paperDoc.data();
      const questionsSnapshot = await paperDoc.ref.collection("questions").get();
      const questions = questionsSnapshot.docs.map(qDoc => ({ id: qDoc.id, ...qDoc.data() }));

      papers.push({
        id: paperDoc.id,
        paperName: paperData.paperName,
        duration: paperData.duration,
        numOfQuestions: paperData.numOfQuestions,
        createdAt: paperData.createdAt,
        questions
      });
    }

    res.status(200).json({ papers });
  } catch (error) {
    res.status(500).json({ message: error.message, papers: [] });
  }
};

// ---- Create a new question paper ----
exports.createQuestionPaper = async (req, res) => {
  try {
    const { paperName, duration, numOfQuestions } = req.body;

    if (!paperName || !duration || !numOfQuestions) {
      return res.status(400).json({ error: "paperName, duration, numOfQuestions required" });
    }

    const paperRef = await admin.firestore().collection("questionPapers").add({
      paperName,
      duration,
      numOfQuestions,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      message: "Question paper created successfully",
      paperId: paperRef.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---- Add single or multiple questions to existing paper ----
exports.addQuestionToPaper = async (req, res) => {
  try {
    const { paperId, questionIds } = req.body; 
    // questionIds = array of questionId(s)

    if (!paperId || !questionIds || !questionIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: "paperId and questionIds array required", 
        addedCount: 0 
      });
    }

    const paperRef = admin.firestore().collection("questionPapers").doc(paperId);
    const paperDoc = await paperRef.get();

    if (!paperDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: "Question paper not found", 
        addedCount: 0 
      });
    }

    const paperData = paperDoc.data();
    const maxQuestions = paperData.numOfQuestions;

    const paperQuestionsRef = paperRef.collection("questions");
    const snapshot = await paperQuestionsRef.get();
    const currentCount = snapshot.size;

    let addedCount = 0;
    const batch = admin.firestore().batch();

    for (const qid of questionIds) {
      if (currentCount + addedCount >= maxQuestions) break; // exceed check

      const questionDoc = await admin.firestore().collection("questions").doc(qid).get();
      if (!questionDoc.exists) continue;

      const paperQuestionDoc = await paperQuestionsRef.doc(qid).get();
      if (!paperQuestionDoc.exists) {
        batch.set(paperQuestionsRef.doc(qid), questionDoc.data());
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await batch.commit();
      const success = currentCount + addedCount <= maxQuestions;
      return res.status(200).json({
        success: true,
        message: "Questions added successfully",
        addedCount
      });
    } else {
      const msg = currentCount >= maxQuestions ? 
                  "Maximum questions added to paper" : 
                  "Unable to add questions to paper";
      return res.status(400).json({
        success: false,
        message: msg,
        addedCount: 0
      });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message, addedCount: 0 });
  }
};

// ---- Edit a question paper ----
exports.editQuestionPaper = async (req, res) => {
  try {
    const { paperId, paperName, duration, numOfQuestions } = req.body;

    if (!paperId || !paperName || !duration || !numOfQuestions) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const paperRef = admin.firestore().collection("questionPapers").doc(paperId);
    const paperDoc = await paperRef.get();

    if (!paperDoc.exists) {
      return res.status(404).json({ success: false, message: "Question paper not found" });
    }

    await paperRef.update({
      paperName,
      duration,
      numOfQuestions
    });

    res.status(200).json({ success: true, message: "Question paper updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- Delete a question paper ----
exports.deleteQuestionPaper = async (req, res) => {
  try {
    const { paperId } = req.body;

    if (!paperId) {
      return res.status(400).json({ success: false, message: "paperId required" });
    }

    const paperRef = admin.firestore().collection("questionPapers").doc(paperId);
    const paperDoc = await paperRef.get();

    if (!paperDoc.exists) {
      return res.status(404).json({ success: false, message: "Question paper not found" });
    }

    // Delete all questions in subcollection
    const questionsSnapshot = await paperRef.collection("questions").get();
    const batch = admin.firestore().batch();
    questionsSnapshot.forEach((qDoc) => batch.delete(qDoc.ref));

    batch.delete(paperRef); // delete paper itself
    await batch.commit();

    res.status(200).json({ success: true, message: "Question paper deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// ---- Edit a question inside a paper ----
exports.editQuestionInPaper = async (req, res) => {
  try {
    const { paperId, questionId, question, options, answer, questionType, questionTopic, questionLevel } = req.body;

    if (!paperId || !questionId || !question) {
      return res.status(400).json({ success: false, message: "paperId, questionId and question required" });
    }

    const questionRef = admin.firestore()
      .collection("questionPapers")
      .doc(paperId)
      .collection("questions")
      .doc(questionId);

    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      return res.status(404).json({ success: false, message: "Question not found in paper" });
    }

    await questionRef.update({
      question,
      options: options || [],
      answer: answer || null,
      questionType: questionType || questionDoc.data().questionType,
      questionTopic: questionTopic || questionDoc.data().questionTopic,
      questionLevel: questionLevel || questionDoc.data().questionLevel,
    });

    res.status(200).json({ success: true, message: "Question updated successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- Delete a question from a paper ----
exports.deleteQuestionFromPaper = async (req, res) => {
  try {
    const { paperId, questionId } = req.body;

    if (!paperId || !questionId) {
      return res.status(400).json({ success: false, message: "paperId and questionId required" });
    }

    const questionRef = admin.firestore()
      .collection("questionPapers")
      .doc(paperId)
      .collection("questions")
      .doc(questionId);

    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      return res.status(404).json({ success: false, message: "Question not found in paper" });
    }

    await questionRef.delete();

    res.status(200).json({ success: true, message: "Question deleted successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- Assign Question Papers to a User ----
exports.assignPapersToUser = async (req, res) => {
  try {
    const { userId, paperIds } = req.body; // paperIds = array of paperId(s)

    if (!userId || !paperIds || !Array.isArray(paperIds) || paperIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userId and paperIds array required",
        assignedCount: 0,
        skipped: []
      });
    }

    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        assignedCount: 0,
        skipped: []
      });
    }

    const assignedRef = userRef.collection("assignedPapers");

    let assignedCount = 0;
    let skipped = [];
    const batch = admin.firestore().batch();

    for (const pid of paperIds) {
      // check if paper exists
      const paperDoc = await admin.firestore().collection("questionPapers").doc(pid).get();
      if (!paperDoc.exists) {
        skipped.push({ paperId: pid, reason: "Paper not found" });
        continue;
      }

      // check if already assigned
      const assignedDoc = await assignedRef.doc(pid).get();
      if (assignedDoc.exists) {
        skipped.push({ paperId: pid, reason: "Already assigned" });
        continue;
      }

      // assign new
      batch.set(assignedRef.doc(pid), {
        paperId: pid,
        assignedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      assignedCount++;
    }

    if (assignedCount > 0) {
      await batch.commit();
    }

    return res.status(200).json({
      success: assignedCount > 0,
      message: assignedCount > 0 ? "Papers assigned successfully" : "No new papers assigned",
      assignedCount,
      skipped
    });

  } catch (error) {
    console.error("Error in assignPapersToUser:", error);
    res.status(500).json({ success: false, message: error.message, assignedCount: 0, skipped: [] });
  }
};
