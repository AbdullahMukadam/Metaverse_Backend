import { Server, Socket } from "socket.io";
import { config } from "../config/config";
import HouseRoomClass from "../clases/HouseRoom";

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
    roomId?: string;
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
const DEFAULT_HOUSE_ROOM_ID = config.DEFAULT_HOUSE_ROOM_ID

const SocketConnection = (socket: Socket, io: Server) => {

    let currentSpace: string | null = null;
    let currentUserId: string | null = null;


    socket.on("JoinSpace", (data: UserData) => {
        try {
            currentSpace = data.roomId || DEFAULT_SPACE_ID;
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

    socket.on("enteredHouseRoom", (data: UserData) => {
        const userSpaceId = data.roomId || DEFAULT_SPACE_ID;
        
        if (currentUserId && currentSpace) {
            spaceManager.leaveSpace(currentSpace, currentUserId);
            socket.leave(currentSpace);
            socket.to(currentSpace).emit("UserLeft", { userId: currentUserId }); 
        }

        currentSpace = `${userSpaceId}-house`;
        currentUserId = data.userId;
        socket.join(currentSpace);

        const otherUsersInHouse = HouseRoomClass.joinSpace(
            currentSpace,
            { ...data, direction: 'down', isMoving: false },
            socket.id
        );

        socket.emit("HouseRoomJoined", { UsersArr: otherUsersInHouse });
        socket.to(currentSpace).emit("HouseUserJoined", { 
            userId: data.userId,
            UserName: data.UserName,
            positions: data.positions,
            selectedCharacter: data.selectedCharacter,
        });

        console.log(`User ${data.UserName} moved from space ${userSpaceId} to house room ${currentSpace}`);
    });

    socket.on("UpdateHousePosition", (data: ClientMovementData) => {
        if (!currentSpace || !currentUserId || !currentSpace.includes('-house')) return;

        
        const updated = HouseRoomClass.updatePosition(currentSpace, currentUserId, data);

        if (updated) {
            socket.to(currentSpace).emit("HouseUserMoved", { 
                userId: currentUserId,
                positions: data.positions,
                direction: data.direction,
                isMoving: data.isMoving,
            });
        }
    });

    socket.on("LeaveHouseMethod", async (data: { userId: string; roomId?: string }) => {
        if (!currentSpace || !currentSpace.includes('-house') || !data.userId) return;

       
        const leftUser = HouseRoomClass.leaveSpace(currentSpace, data.userId);

        if (leftUser) {
            socket.leave(currentSpace); 
            
            socket.to(currentSpace).emit("LeaveHouse", { userId: data.userId });
            console.log(`User ${leftUser.UserName} left house room ${currentSpace}`);
        }

        
        const mainSpaceId = data.roomId || DEFAULT_SPACE_ID;
        currentSpace = mainSpaceId; 
        currentUserId = data.userId; 

        const mainWorldPositions = { X: 570, Y: 325 }; 
        const userToRejoinMain : UserData = {
            userId: data.userId,
            UserName: leftUser?.UserName || '', 
            positions: mainWorldPositions,
            selectedCharacter: leftUser?.selectedCharacter || '', 
            direction: 'down',
            isMoving: false,
            roomId: mainSpaceId
        };

        const otherUsersInMain = spaceManager.joinSpace(
            currentSpace,
            userToRejoinMain,
            socket.id
        );

        socket.join(currentSpace);   
        socket.emit("SpaceJoined", { UsersArr: otherUsersInMain });
        socket.to(currentSpace).emit("UserJoined", {
            userId: userToRejoinMain.userId,
            UserName: userToRejoinMain.UserName,
            socketId: socket.id,
            positions: userToRejoinMain.positions,
            selectedCharacter: userToRejoinMain.selectedCharacter
        });

        console.log(`User ${userToRejoinMain.UserName} rejoined space ${currentSpace}`);
    });


    socket.on("disconnection", () => {
        if (currentSpace && currentUserId) {
            let leftUser;
            if (currentSpace.includes('-house')) {
                leftUser = HouseRoomClass.leaveSpace(currentSpace, currentUserId);
            } else {
                leftUser = spaceManager.leaveSpace(currentSpace, currentUserId);
            }

            if (leftUser) {
                socket.to(currentSpace).emit("UserLeft", { userId: leftUser.userId });
                console.log(`User ${leftUser.UserName} disconnected from ${currentSpace}`);
            }
        }
    });


    socket.on("disconnect", () => {
        if (currentSpace && currentUserId) {
            let leftUser;
            if (currentSpace.includes('-house')) {
                leftUser = HouseRoomClass.leaveSpace(currentSpace, currentUserId);
            } else {
                leftUser = spaceManager.leaveSpace(currentSpace, currentUserId);
            }

            if (leftUser) {
                socket.to(currentSpace).emit("UserLeft", { userId: leftUser.userId });
                console.log(`User ${leftUser.UserName} disconnected from ${currentSpace}`);
            }
        }
    });
};

export { SocketConnection };
