const admin = require("firebase-admin");

// ---- Get all questions ----
exports.getAllQuestions = async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection("questions").get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "No questions found" });
    }

    const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---- Add one or multiple questions ----
exports.addQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !questions.length) {
      return res.status(400).json({ error: "Questions array required" });
    }

    const batch = admin.firestore().batch();
    const questionRef = admin.firestore().collection("questions");

    questions.forEach((q) => {
      const newDoc = questionRef.doc(); // auto ID
      batch.set(newDoc, {
        questionType: q.questionType,
        questionTopic: q.questionTopic,
        questionLevel: q.questionLevel,
        question: q.question,
        options: q.options || [],
        answer: q.answer || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    res.status(201).json({ message: "Questions saved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
