
interface UserData {
    userId: string;
    UserName: string;
    positions: {
        X: number;
        Y: number;
    };
    selectedCharacter: string;
    direction?: 'up' | 'down' | 'left' | 'right';
    isMoving?: boolean;
}

interface ClientMovementData {
    positions: {
        X: number;
        Y: number;
    };
    direction: 'up' | 'down' | 'left' | 'right';
    isMoving: boolean;
}

interface SpaceUser extends UserData {
    socketId: string;
    lastUpdated?: number;
    direction: 'up' | 'down' | 'left' | 'right';
    isMoving: boolean;
}

type SpaceType = Record<string, SpaceUser[]>;

export class HouseRoom {
    private spaces: SpaceType = {};
    private readonly CLEANUP_INTERVAL = 300000;

    constructor() {
        setInterval(this.cleanupInactiveUsers.bind(this), this.CLEANUP_INTERVAL);
    }

    public joinSpace(spaceId: string, user: UserData, socketId: string): SpaceUser[] {
        if (!this.spaces[spaceId]) {
            this.spaces[spaceId] = [];
        }

        const existingUserIndex = this.spaces[spaceId].findIndex(u => u.userId === user.userId);
        const now = Date.now();

        const spaceUser: SpaceUser = {
            ...user,
            socketId,
            lastUpdated: now,
            direction: user.direction || 'down',
            isMoving: user.isMoving || false
        };

        if (existingUserIndex === -1) {
            this.spaces[spaceId].push(spaceUser);
        } else {
            this.spaces[spaceId][existingUserIndex] = spaceUser;
        }

        return this.spaces[spaceId].filter(u => u.userId !== user.userId);
    }

    public getUserData(spaceId: string, userId: string): SpaceUser | undefined {
        return this.spaces[spaceId]?.find(u => u.userId === userId);
    }

    public leaveSpace(spaceId: string, userId: string): SpaceUser | null {
        if (!this.spaces[spaceId]) return null;

        const index = this.spaces[spaceId].findIndex(u => u.userId === userId);
        if (index === -1) return null;

        return this.spaces[spaceId].splice(index, 1)[0];
    }

    public updatePosition(spaceId: string,
        userId: string,
        data: ClientMovementData): boolean {
        const user = this.spaces[spaceId]?.find(u => u.userId === userId);
        if (!user) return false;

        user.positions = data.positions;
        user.direction = data.direction;
        user.isMoving = data.isMoving;
        user.lastUpdated = Date.now();
        return true;
    }

    private cleanupInactiveUsers() {
        const now = Date.now();
        const INACTIVITY_THRESHOLD = 60000;

        for (const spaceId in this.spaces) {
            this.spaces[spaceId] = this.spaces[spaceId].filter(user => {
                return (now - (user.lastUpdated || 0)) < INACTIVITY_THRESHOLD;
            });

            if (this.spaces[spaceId].length === 0) {
                delete this.spaces[spaceId];
            }
        }
    }
}

const HouseRoomClass = new HouseRoom()
export default HouseRoomClass
