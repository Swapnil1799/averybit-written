// ---- Submit Result ----
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// ---- Submit Result ----
exports.submitResult = async (req, res) => {
  try {
    const { paperId, userId, responses } = req.body;

    if (!paperId || !userId || !responses) {
      return res.status(400).json({ success: false, message: "paperId, userId and responses are required" });
    }

    const db = admin.firestore();
    
    const existingResultSnap = await db
      .collection("results")
      .where("paperId", "==", paperId)
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (!existingResultSnap.empty) {
      return res.status(200).json({ success: false, message: "you have already submit the test response" });
    }

    const questionsSnap = await db
      .collection("questionPapers")
      .doc(paperId)
      .collection("questions")
      .get();

    if (questionsSnap.empty) {
      return res.status(404).json({ success: false, message: "No questions found for this paper" });
    }

    let score = 0;
    let total = questionsSnap.size;
    let evaluatedResponses = [];

    for (let resp of responses) {
      let qDoc = questionsSnap.docs.find(q => q.id === resp.questionId);
      if (!qDoc) continue;

      let qData = qDoc.data();
      let userAns = resp.answer;
      let correctAns = qData.answer;
      let isCorrect = false;

      if (qData.questionType === "mcq") {
        if (userAns.trim().toLowerCase() === correctAns.trim().toLowerCase()) {
          isCorrect = true;
          score++;
        }
      } else if (qData.questionType === "one-line") {
        const apiKey = process.env.GEMINI_API_KEY || "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const prompt = `Question: ${qData.question}\nCorrect Answer: ${correctAns}\nUser Answer: ${userAns}\nDecide if user answer is correct. Reply only "true" or "false".`;

        const payload = { contents: [{ parts: [{ text: prompt }] }] };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          timeout: 30000,
        });

        if (response.ok) {
          const result = await response.json();
          const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
          if (aiText && aiText.includes("true")) {
            isCorrect = true;
            score++;
          }
        }
      } else if (qData.questionType === "coding") {
        if (userAns.trim() === correctAns.trim()) {
          isCorrect = true;
          score++;
        }
      }

      evaluatedResponses.push({
        questionId: resp.questionId,
        userAnswer: userAns,
        correctAnswer: correctAns,
        isCorrect,
      });
    }

    // ---- Save Result ----
    const resultRef = await db.collection("results").add({
      paperId,
      userId,
      responses: evaluatedResponses,
      score,
      total,
      createdAt: new Date(),
    });

    // ---- Update assigned paper isSubmitted = true ----
    const assignedPaperRef = db.collection("users").doc(userId).collection("assignedPapers").doc(paperId);

    await assignedPaperRef.update({
      isSubmitted: true,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: "Result submitted successfully",
      resultId: resultRef.id,
      score,
      total,
      responses: evaluatedResponses,
    });
  } catch (error) {
    console.error("Error in submitResult:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ---- Get Result ----
exports.getResult = async (req, res) => {
  try {
    const { userId, paperId } = req.params;

    if (!userId || !paperId) {
      return res.status(400).json({ success: false, message: "userId and paperId are required" });
    }

    const db = admin.firestore();
    const resultSnap = await db
      .collection("results")
      .where("userId", "==", userId)
      .where("paperId", "==", paperId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (resultSnap.empty) {
      return res.status(404).json({ success: false, message: "No result found for this user & paper" });
    }

    const result = resultSnap.docs[0].data();

    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Error in getResult:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
