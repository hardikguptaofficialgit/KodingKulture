import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Inline MongoDB URI
const MONGO_URI = 'mongodb+srv://ritamvaskar0:ritam2005@cluster0.jrenkys.mongodb.net/';

// Admin details
const ADMIN_NAME = 'Admin User';
const ADMIN_EMAIL = 'admin@kodingkulture.com';
const ADMIN_PASSWORD = 'Admin@123';

// User schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'USER' },
    college: String,
    phone: String,
    contestsRegistered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contest' }],
    contestsCompleted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contest' }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

        if (existingAdmin) {
            console.log('⚠️ Admin already exists');

            if (existingAdmin.role !== 'ADMIN') {
                existingAdmin.role = 'ADMIN';
                await existingAdmin.save();
                console.log('✅ Role updated to ADMIN');
            }
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

            await User.create({
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                password: hashedPassword,
                role: 'ADMIN',
                college: 'Koding Kulture',
                phone: ''
            });

            console.log('✅ Admin created');
            console.log(`Email: ${ADMIN_EMAIL}`);
            console.log(`Password: ${ADMIN_PASSWORD}`);
        }

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createAdmin();