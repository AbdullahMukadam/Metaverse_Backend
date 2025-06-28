import { Server, Socket } from "socket.io";
import { config } from "../config/config";

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


class SpaceManager {
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

const spaceManager = new SpaceManager();
const DEFAULT_SPACE_ID = config.DEFAULT_SPACE_ID

const SocketConnection = (socket: Socket, io: Server) => {

    let currentSpace: string | null = null;
    let currentUserId: string | null = null;


    socket.on("JoinSpace", (data: UserData) => {
        try {
            currentSpace = DEFAULT_SPACE_ID;
            currentUserId = data.userId;

            const otherUsers = spaceManager.joinSpace(
                currentSpace,
                {
                    ...data,
                    direction: 'down',
                    isMoving: false
                },
                socket.id

            );

            socket.join(currentSpace);


            socket.emit("SpaceJoined", {
                UsersArr: otherUsers
            });


            socket.to(currentSpace).emit("UserJoined", {
                userId: data.userId,
                UserName: data.UserName,
                socketId: socket.id,
                positions: data.positions,
                selectedCharacter: data.selectedCharacter
            });

            console.log(`User ${data.UserName} joined space ${currentSpace}`);
        } catch (error) {
            console.error("JoinSpace error:", error);
            socket.emit("SpaceError", { message: "Failed to join space" });
        }
    });


    socket.on("UpdatePosition", (data: ClientMovementData) => {
        if (!currentSpace || !currentUserId) return;

        const updated = spaceManager.updatePosition(
            currentSpace,
            currentUserId,
            data
        );

        if (updated) {
            const user = spaceManager.getUserData(currentSpace, currentUserId);
            socket.to(currentSpace).emit("UserMoved", {
                userId: currentUserId,
                positions: data.positions,
                direction: data.direction,
                isMoving: data.isMoving,
                UserName: user?.UserName || '',
                selectedCharacter: user?.selectedCharacter || ''
            });
        }
    });

    socket.on("rawAudio", (data: { data: number[], userId: string }) => {
        if (!currentSpace) return;
        //console.log("Received raw Audio :", data.data)

        if (!Array.isArray(data.data) || data.data.length === 0) {
            throw new Error("Invalid audio data format");
        }

        socket.to(currentSpace).emit("incomingAudio", {
            userId: data.userId,
            audioData: data.data,
            timestamp: Date.now()
        })
    })


    socket.on("disconnection", (data: { userId: string }) => {
        if (!currentSpace) return;


        const leftUser = spaceManager.leaveSpace(currentSpace, data.userId);
        if (leftUser) {
            socket.to(currentSpace).emit("UserLeft", {
                userId: leftUser.userId,
                socketId: leftUser.socketId
            });
            console.log(`User ${leftUser.UserName} left space ${currentSpace}`);
        }
    });


    socket.on("disconnect", () => {
        if (currentSpace && currentUserId) {
            const leftUser = spaceManager.leaveSpace(currentSpace, currentUserId);
            if (leftUser) {
                socket.to(currentSpace).emit("UserLeft", {
                    userId: leftUser.userId,
                    socketId: leftUser.socketId
                });
                console.log(`User ${leftUser.UserName} disconnected`);
            }
        }
    });
};

export { SocketConnection };