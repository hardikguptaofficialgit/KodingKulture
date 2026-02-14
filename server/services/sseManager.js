/**
 * SSE Connection Manager
 * 
 * Tracks active SSE connections per user. When an admin changes a user's role,
 * this manager pushes the update instantly to all of that user's active connections
 * (they may have multiple tabs/devices).
 * 
 * For offline users: When they reconnect (open the app/tab), the SSE endpoint
 * sends the current role immediately on connection, so they always get the
 * latest role without needing a separate API call.
 */

// Map of userId -> Set of response objects (one user can have multiple tabs/devices)
const connections = new Map();

/**
 * Register a new SSE connection for a user
 * @param {string} userId 
 * @param {object} res - Express response object (kept open for SSE)
 */
export const addConnection = (userId, res) => {
    const id = userId.toString();
    if (!connections.has(id)) {
        connections.set(id, new Set());
    }
    connections.get(id).add(res);

    // Clean up when connection closes (user closes tab, network drops, etc.)
    res.on('close', () => {
        const userConns = connections.get(id);
        if (userConns) {
            userConns.delete(res);
            if (userConns.size === 0) {
                connections.delete(id);
            }
        }
    });
};

/**
 * Send an SSE event to a specific user (all their connections)
 * @param {string} userId
 * @param {string} event - Event name (e.g., 'role-update')
 * @param {object} data - JSON data to send
 */
export const sendToUser = (userId, event, data) => {
    const id = userId.toString();
    const userConns = connections.get(id);

    if (userConns && userConns.size > 0) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        userConns.forEach(res => {
            try {
                res.write(payload);
            } catch (err) {
                // Connection already closed, clean up
                userConns.delete(res);
            }
        });
        return true; // User was online, event delivered
    }
    return false; // User was offline, no active connections
};

/**
 * Send an SSE event to ALL connected users (broadcast)
 * Useful for system-wide announcements
 * @param {string} event
 * @param {object} data
 */
export const broadcast = (event, data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    connections.forEach((userConns) => {
        userConns.forEach(res => {
            try {
                res.write(payload);
            } catch (err) {
                userConns.delete(res);
            }
        });
    });
};

/**
 * Get count of connected users (for monitoring/debugging)
 */
export const getConnectionCount = () => {
    let total = 0;
    connections.forEach(userConns => {
        total += userConns.size;
    });
    return { users: connections.size, connections: total };
};

export default { addConnection, sendToUser, broadcast, getConnectionCount };
