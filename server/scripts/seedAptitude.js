/**
 * Seed Script: Insert 10 Aptitude MCQs into the library
 * 
 * Usage: node scripts/seedAptitude.js
 * 
 * - All questions are library + public + APTITUDE category
 * - +4 marks for correct, 0 negative
 * - createdBy is set to the first ADMIN user found in the DB
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MCQ from '../models/MCQ.js';
import User from '../models/User.js';

dotenv.config();

const questions = [
    {
        question: 'A sum of money becomes ₹12,000 in 3 years and ₹16,000 in 5 years at simple interest. What is the principal?',
        options: [
            { text: '₹4,000', isCorrect: false },
            { text: '₹6,000', isCorrect: true },
            { text: '₹8,000', isCorrect: false },
            { text: '₹10,000', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: 'Increase in 2 years = 16,000 − 12,000 = 4,000\nSo yearly interest = 2,000\nIn 3 years interest = 6,000\nPrincipal = 12,000 − 6,000 = 6,000\n\nSimple interest grows linearly. That\'s the key.',
        difficulty: 'MEDIUM',
        tags: ['simple-interest', 'principal']
    },
    {
        question: 'A and B together can complete a work in 12 days. A alone can do it in 20 days. How many days will B alone take?',
        options: [
            { text: '25', isCorrect: false },
            { text: '30', isCorrect: true },
            { text: '24', isCorrect: false },
            { text: '18', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: 'A\'s 1-day work = 1/20\n(A + B)\'s 1-day work = 1/12\n\nSo B\'s 1-day work = 1/12 − 1/20\n= (5 − 3)/60\n= 2/60 = 1/30\n\nSo B takes 30 days.',
        difficulty: 'EASY',
        tags: ['time-and-work']
    },
    {
        question: 'The average of 10 numbers is 45. When one number is removed, the average becomes 42. What is the removed number?',
        options: [
            { text: '63', isCorrect: false },
            { text: '72', isCorrect: true },
            { text: '75', isCorrect: false },
            { text: '69', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: 'Total of 10 numbers = 10 × 45 = 450\nTotal of 9 numbers = 9 × 42 = 378\nRemoved number = 450 − 378 = 72\n\nAverages hide totals. Totals reveal truth.',
        difficulty: 'EASY',
        tags: ['averages']
    },
    {
        question: 'A train 150 m long crosses a pole in 10 seconds. What is its speed in km/h?',
        options: [
            { text: '45', isCorrect: false },
            { text: '54', isCorrect: true },
            { text: '60', isCorrect: false },
            { text: '72', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: 'Speed = 150 / 10 = 15 m/s\nConvert to km/h → 15 × 18/5 = 54 km/h\n\nCrossing a pole means full train length passes.',
        difficulty: 'EASY',
        tags: ['speed-distance-time', 'trains']
    },
    {
        question: 'A number is such that 40% of it is 20 more than 30% of it. What is the number?',
        options: [
            { text: '150', isCorrect: false },
            { text: '200', isCorrect: true },
            { text: '250', isCorrect: false },
            { text: '100', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: '0.40x = 0.30x + 20\n0.10x = 20\nx = 200\n\nPercent equations are just algebra in disguise.',
        difficulty: 'EASY',
        tags: ['percentages']
    },
    {
        question: 'In how many ways can 5 different books be arranged on a shelf if 2 particular books must always be together?',
        options: [
            { text: '24', isCorrect: false },
            { text: '48', isCorrect: true },
            { text: '72', isCorrect: false },
            { text: '120', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: 'Treat the 2 books as one unit.\nSo total units = 4\n\nArrangements = 4! = 24\nInside the pair they can swap → 2! = 2\n\nTotal = 24 × 2 = 48\n\nPermutation logic: compress, arrange, expand.',
        difficulty: 'MEDIUM',
        tags: ['permutations', 'combinatorics']
    },
    {
        question: 'A mixture contains milk and water in the ratio 5 : 3. If 16 litres of water are added, the ratio becomes 5 : 7. What was the original quantity of milk?',
        options: [
            { text: '16 litres', isCorrect: false },
            { text: '20 litres', isCorrect: true },
            { text: '25 litres', isCorrect: false },
            { text: '30 litres', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: 'Let original milk = 5x, water = 3x\n\nAfter adding 16 litres of water:\n5x / (3x + 16) = 5 / 7\n\nCross multiplying:\n35x = 15x + 80\n20x = 80\nx = 4\n\nMilk = 5x = 20 litres',
        difficulty: 'MEDIUM',
        tags: ['ratios', 'mixtures']
    },
    {
        question: 'If log₁₀ 2 = 0.3010, what is log₁₀ 8?',
        options: [
            { text: '0.6020', isCorrect: false },
            { text: '0.9030', isCorrect: true },
            { text: '0.9540', isCorrect: false },
            { text: '1.2040', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: '8 = 2³\n\nlog 8 = log(2³)\n= 3 log 2\n= 3 × 0.3010\n= 0.9030\n\nLogs turn powers into multiplication. Elegant trick.',
        difficulty: 'EASY',
        tags: ['logarithms']
    },
    {
        question: 'A boat goes 30 km downstream in 3 hours and returns upstream in 5 hours. What is the speed of the boat in still water?',
        options: [
            { text: '8 km/h', isCorrect: true },
            { text: '7 km/h', isCorrect: false },
            { text: '6 km/h', isCorrect: false },
            { text: '5 km/h', isCorrect: false }
        ],
        correctAnswers: [0],
        explanation: 'Downstream speed = 30 / 3 = 10\nUpstream speed = 30 / 5 = 6\n\nLet boat speed = b, stream speed = s\nb + s = 10\nb − s = 6\n\nAdd equations:\n2b = 16\nb = 8\n\nClassic symmetric system.',
        difficulty: 'MEDIUM',
        tags: ['boats-and-streams', 'speed-distance-time']
    },
    {
        question: 'How many numbers between 1 and 100 are divisible by both 3 and 5?',
        options: [
            { text: '5', isCorrect: false },
            { text: '6', isCorrect: true },
            { text: '7', isCorrect: false },
            { text: '8', isCorrect: false }
        ],
        correctAnswers: [1],
        explanation: 'Divisible by both 3 and 5 → divisible by LCM(3,5) = 15\n\nNumbers ≤ 100 divisible by 15:\n15, 30, 45, 60, 75, 90\n\nTotal = 6',
        difficulty: 'EASY',
        tags: ['number-theory', 'lcm']
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find the production admin by email
        const admin = await User.findOne({ email: 'krishnadas2806@gmail.com' });
        if (!admin) {
            console.error('❌ Admin user krishnadas2806@gmail.com not found in the database.');
            process.exit(1);
        }
        console.log(`📌 Using admin: ${admin.name} (${admin.email})`);

        const mcqDocs = questions.map((q, i) => ({
            ...q,
            isLibrary: true,
            isPublic: true,
            category: 'APTITUDE',
            marks: 4,
            negativeMarks: 0,
            createdBy: admin._id,
            order: i + 1
        }));

        const result = await MCQ.insertMany(mcqDocs);
        console.log(`\n🎉 Successfully inserted ${result.length} aptitude MCQs!\n`);

        result.forEach((mcq, i) => {
            console.log(`  ${i + 1}. ${mcq.question.substring(0, 60)}... [${mcq._id}]`);
        });

        console.log('\nDone!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seed();
