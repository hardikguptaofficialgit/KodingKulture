/**
 * Script to inject Myth/Reality MCQ questions into the library
 * Run with: node scripts/injectMythRealityMCQs.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MCQ from '../models/MCQ.js';

dotenv.config();

const mythRealityQuestions = [
    {
        question: "Revenue growth is always good for a startup.",
        correctAnswer: "Reality",
        explanation: "Revenue growth without profitability, sustainability, or retention can accelerate losses and increase burn rate."
    },
    {
        question: "If customers love a product, they will naturally pay for it.",
        correctAnswer: "Myth",
        explanation: "Positive sentiment does not always translate into willingness or ability to pay."
    },
    {
        question: "A startup with no competitors can be riskier than one in a crowded market.",
        correctAnswer: "Reality",
        explanation: "Lack of competition may indicate absence of real market demand rather than a unique advantage."
    },
    {
        question: "More data can sometimes lead to worse business decisions.",
        correctAnswer: "Reality",
        explanation: "Excessive or poorly interpreted data can create confusion and delay decisive action."
    },
    {
        question: "The best marketing often feels like it isn't marketing at all.",
        correctAnswer: "Reality",
        explanation: "Authentic, value-driven communication builds trust more effectively than overt promotion."
    },
    {
        question: "Cutting prices is the fastest way to beat competitors.",
        correctAnswer: "Myth",
        explanation: "Price wars erode margins and are easily replicated by competitors."
    },
    {
        question: "Startups fail faster when they try to serve everyone.",
        correctAnswer: "Reality",
        explanation: "Lack of a clear target audience weakens product focus and messaging."
    },
    {
        question: "Customer feedback can mislead founders.",
        correctAnswer: "Reality",
        explanation: "Customers often describe problems without understanding underlying causes or viable solutions."
    },
    {
        question: "A technically inferior product can dominate a market.",
        correctAnswer: "Reality",
        explanation: "Factors such as distribution, timing, branding, and network effects can outweigh technical superiority."
    },
    {
        question: "Being profitable early can slow down innovation.",
        correctAnswer: "Reality",
        explanation: "Early comfort can reduce urgency to experiment and take calculated risks."
    },
    {
        question: "Strong brand loyalty reduces the need for constant innovation.",
        correctAnswer: "Myth",
        explanation: "Market leaders that stop innovating risk being disrupted by newer alternatives."
    },
    {
        question: "Startups should ignore competitors in their early stages.",
        correctAnswer: "Myth",
        explanation: "Understanding competitors helps identify differentiation and avoid repeated mistakes."
    },
    {
        question: "User growth without usage growth is a warning sign.",
        correctAnswer: "Reality",
        explanation: "High sign-ups with low engagement indicate weak product value or retention issues."
    },
    {
        question: "A startup's biggest risk is often internal rather than external.",
        correctAnswer: "Reality",
        explanation: "Team alignment, execution, culture, and decision-making heavily influence outcomes."
    },
    {
        question: "Adding artificial intelligence to a product automatically increases its value.",
        correctAnswer: "Myth",
        explanation: "Technology only adds value when it meaningfully solves a real user problem."
    },
    {
        question: "Consumers do not always behave rationally.",
        correctAnswer: "Reality",
        explanation: "Emotional, social, and psychological factors strongly influence purchasing decisions."
    },
    {
        question: "Fast decision-making is always better for startups.",
        correctAnswer: "Myth",
        explanation: "Speed without adequate analysis can amplify errors and poor strategic choices."
    },
    {
        question: "A startup can lose customers by improving its product.",
        correctAnswer: "Reality",
        explanation: "Changes can disrupt user habits or alienate existing customers if not managed carefully."
    },
    {
        question: "High engagement can sometimes indicate user friction rather than value.",
        correctAnswer: "Reality",
        explanation: "Users may spend more time due to confusion or difficulty rather than satisfaction."
    },
    {
        question: "Technology adoption often fails due to human psychology rather than technical performance.",
        correctAnswer: "Reality",
        explanation: "Resistance to change, habits, and trust issues frequently block adoption of superior technology."
    }
];

// Convert to MCQ format
const formatForDatabase = (questions) => {
    return questions.map((q, index) => ({
        isLibrary: true,
        isPublic: true,
        question: q.question,
        options: [
            { text: "Myth", isCorrect: q.correctAnswer === "Myth" },
            { text: "Reality", isCorrect: q.correctAnswer === "Reality" }
        ],
        correctAnswers: [q.correctAnswer === "Myth" ? 0 : 1],
        marks: 1,
        negativeMarks: 0,
        difficulty: "MEDIUM",
        category: "ENTREPRENEURSHIP",
        explanation: null, // Removed as per user request
        tags: ["myth-reality", "entrepreneurship", "startup"],
        order: index + 1
    }));
};

const injectQuestions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const formattedQuestions = formatForDatabase(mythRealityQuestions);

        console.log(`Inserting ${formattedQuestions.length} Myth/Reality MCQ questions...`);

        const result = await MCQ.insertMany(formattedQuestions);

        console.log(`✅ Successfully inserted ${result.length} questions!`);
        console.log('Sample question:', JSON.stringify(result[0], null, 2));

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

injectQuestions();
