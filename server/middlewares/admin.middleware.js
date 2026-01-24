import Contest from '../models/Contest.js';

// Admin only middleware
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
};

// Admin or Organiser middleware
export const adminOrOrganiser = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'ORGANISER')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Organiser privileges required.'
    });
  }
};

// Contest owner middleware - checks if user owns the contest OR is admin
// Also prevents organisers from editing APPROVED contests
export const contestOwner = async (req, res, next) => {
  try {
    const contestId = req.params.id || req.params.contestId;

    if (!contestId) {
      return res.status(400).json({
        success: false,
        message: 'Contest ID required'
      });
    }

    // Admin has access to all contests
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const contest = await Contest.findById(contestId);

    if (!contest) {
      return res.status(404).json({
        success: false,
        message: 'Contest not found'
      });
    }

    // Check if organiser owns this contest
    if (req.user.role === 'ORGANISER' && contest.createdBy.toString() === req.user._id.toString()) {
      // Organisers cannot EDIT approved PUBLIC contests, but CAN edit their own ROOM contests
      // Room contests are auto-approved but should still be editable by room organisers
      if (contest.verificationStatus === 'APPROVED' && req.method !== 'GET' && !contest.roomId) {
        return res.status(403).json({
          success: false,
          message: 'Public contest is approved. Only admin can make changes.'
        });
      }
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own contests.'
    });
  } catch (error) {
    console.error('Contest owner middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking contest ownership'
    });
  }
};
