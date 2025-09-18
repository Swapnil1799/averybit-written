const fetch = require("node-fetch");

exports.generateQuiz = async (req, res) => {
  try {
    const { questionType, questionTopic, questionLevel } = req.body;

    if (!questionType || !questionTopic || !questionLevel) {
      return res.status(400).json({
        error: "questionType, questionTopic, and questionLevel are required",
      });
    }

    let prompt = "";
    let schema = {};

    if (questionType.toLowerCase() === "mcq") {
      prompt = `
        Generate 5 multiple-choice questions on the topic "${questionTopic}".
        Difficulty level: ${questionLevel}.
        The response MUST be a JSON array.
      `;
      schema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING" },
            options: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            answer: { type: "STRING" }
          },
          propertyOrdering: ["question", "options", "answer"]
        }
      };
    } else if (questionType.toLowerCase() === "one line answer") {
      prompt = `
        Generate 5 one-line answer questions on the topic "${questionTopic}".
        Difficulty level: ${questionLevel}.
        The response MUST be a JSON array.
      `;
      schema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING" },
            answer: { type: "STRING" }
          },
          propertyOrdering: ["question", "answer"]
        }
      };
    } else if (questionType.toLowerCase() === "coding question") {
      prompt = `
        Generate 5 coding questions on the topic "${questionTopic}".
        Difficulty level: ${questionLevel}.
        
        For each coding question:
        - Provide only the problem statement in "question".
        - Provide the expected output of the solution in "answer" (not the full code).
        
        Example:
        {
          "question": "Write a program to add two numbers: 5 and 3.",
          "answer": "8"
        }
        
        The response MUST be a JSON array.
      `;
      schema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING" },  // problem statement
            answer: { type: "STRING" }     // only output/result
          },
          propertyOrdering: ["question", "answer"]
        }
      };
    } else {
      return res.status(400).json({
        error: "Invalid questionType. Use 'mcq', 'one line answer', or 'coding question'.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      timeout: 60000,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API call failed:", errorData);
      return res.status(response.status).json({
        error: "Failed to connect to Gemini API",
        details: errorData,
      });
    }

    const result = await response.json();
    const candidate = result?.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      console.error("Invalid API response structure:", result);
      return res.status(500).json({
        error: "Invalid response from Gemini API",
        details: result,
      });
    }

    const quizData = candidate.content.parts[0].text;
    const parsedQuiz = JSON.parse(quizData);

    res.json({
      success: true,
      quiz: parsedQuiz,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({
      error: "Failed to generate quiz",
      details: error.message,
    });
  }
};
