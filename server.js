const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config();


admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const app = express();
app.use(express.json());
app.use(cors());


// Routes
const quizRoutes = require("./routes/quizRoutes");
const userRoutes = require('./routes/UserRoutes');
const questionRoutes = require("./routes/questionRoutes");
const questionPaperRoutes = require("./routes/questionPaperRoutes");
const resultRoutes = require("./routes/resultRoutes");
app.use('/api/users', userRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/questionPaper", questionPaperRoutes);
app.use("/api/result", resultRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on:`);
});