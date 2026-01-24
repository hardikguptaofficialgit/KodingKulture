import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixLibraryPublicFlag() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Update all library MCQs to have isPublic: true (if not set or null)
        const mcqResult = await mongoose.connection.db.collection('mcqs').updateMany(
            { isLibrary: true },
            { $set: { isPublic: true } }
        );
        console.log('MCQs updated:', mcqResult.modifiedCount);

        // Update all library CodingProblems to have isPublic: true
        const codingResult = await mongoose.connection.db.collection('codingproblems').updateMany(
            { isLibrary: true },
            { $set: { isPublic: true } }
        );
        console.log('Coding problems updated:', codingResult.modifiedCount);

        console.log('\n✅ All existing library questions are now PUBLIC (visible to organisers)');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixLibraryPublicFlag();
