import mongoose from 'mongoose';
import crypto from 'crypto';

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Room name is required'],
        trim: true,
        maxlength: [100, 'Room name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    shortCode: {
        type: String,
        unique: true,
        uppercase: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coOrganisers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    pendingInvites: [{
        email: { type: String, required: true },
        token: { type: String, required: true },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        expiresAt: { type: Date, required: true }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate unique short code before saving
roomSchema.pre('save', async function (next) {
    if (!this.shortCode) {
        let code;
        let isUnique = false;

        while (!isUnique) {
            // Generate 6 character alphanumeric code
            code = crypto.randomBytes(3).toString('hex').toUpperCase();
            const existingRoom = await mongoose.model('Room').findOne({ shortCode: code });
            if (!existingRoom) {
                isUnique = true;
            }
        }
        this.shortCode = code;
    }
    next();
});

// Virtual for total member count
roomSchema.virtual('memberCount').get(function () {
    return 1 + (this.coOrganisers?.length || 0) + (this.participants?.length || 0);
});

// Check if user is a member of the room
roomSchema.methods.isMember = function (userId) {
    const userIdStr = userId.toString();
    // Handle both populated and non-populated owner
    const ownerId = this.owner?._id ? this.owner._id.toString() : this.owner?.toString();
    return (
        ownerId === userIdStr ||
        this.coOrganisers.some(co => {
            const coId = co?._id ? co._id.toString() : co?.toString();
            return coId === userIdStr;
        }) ||
        this.participants.some(p => {
            const pId = p?._id ? p._id.toString() : p?.toString();
            return pId === userIdStr;
        })
    );
};

// Check if user is the owner
roomSchema.methods.isOwner = function (userId) {
    const userIdStr = userId.toString();
    // Handle both populated and non-populated owner
    const ownerId = this.owner?._id ? this.owner._id.toString() : this.owner?.toString();
    return ownerId === userIdStr;
};

// Check if user is a co-organiser
roomSchema.methods.isCoOrganiser = function (userId) {
    const userIdStr = userId.toString();
    return this.coOrganisers.some(co => {
        const coId = co?._id ? co._id.toString() : co?.toString();
        return coId === userIdStr;
    });
};

// Check if user is an organiser (owner or co-organiser)
roomSchema.methods.isOrganiser = function (userId) {
    return this.isOwner(userId) || this.isCoOrganiser(userId);
};

// Index for efficient queries
roomSchema.index({ owner: 1 });
roomSchema.index({ coOrganisers: 1 });
roomSchema.index({ participants: 1 });
roomSchema.index({ shortCode: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
