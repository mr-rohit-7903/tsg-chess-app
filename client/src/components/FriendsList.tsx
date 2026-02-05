import React, { useState, useEffect } from "react";
import { Search, UserPlus, Users, Check, X, Swords, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import * as api from '@/lib/api';
import { useAuthContext } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { ChallengeModal } from "@/components/ChallengeModal";
import { useNavigate } from "react-router-dom";

export const FriendsList: React.FC = () => {
    const { token, user } = useAuthContext();
    const { socket } = useSocket();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [friends, setFriends] = useState<api.Friend[]>([]);
    const [requests, setRequests] = useState<api.FriendRequest[]>([]);
    const [searchResults, setSearchResults] = useState<api.UserSearchResult[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("friends");
    const [isLoading, setIsLoading] = useState(false);

    // Challenge State
    const [challengeModalOpen, setChallengeModalOpen] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState<api.Friend | null>(null);

    // Confirmation State
    const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
    const [friendToRemove, setFriendToRemove] = useState<api.Friend | null>(null);

    // Challenges State
    const [challenges, setChallenges] = useState<api.FriendlyChallenge[]>([]);

    useEffect(() => {
        if (token) {
            loadFriends();
            loadRequests();
            loadChallenges();
        }
    }, [token]);

    const loadFriends = async () => {
        try {
            if (!token) return;
            const data = await api.getFriends(token);
            setFriends(data);
        } catch (error) {
            console.error("Failed to load friends", error);
        }
    };

    const loadRequests = async () => {
        try {
            if (!token) return;
            const data = await api.getFriendRequests(token);
            setRequests(data);
        } catch (error) {
            console.error("Failed to load requests", error);
        }
    };

    const loadChallenges = async () => {
        try {
            if (!token) return;
            const data = await api.getPendingChallenges(token);
            setChallenges(data);
        } catch (error) {
            console.error("Failed to load challenges", error);
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            loadChallenges();
            loadRequests();
        };

        socket.on('challenge_received', handleUpdate);
        socket.on('challenge_declined', handleUpdate);
        socket.on('challenge_accepted', handleUpdate);
        socket.on('friend_request_received', loadRequests);

        return () => {
            socket.off('challenge_received', handleUpdate);
            socket.off('challenge_declined', handleUpdate);
            socket.off('challenge_accepted', handleUpdate);
            socket.off('friend_request_received', loadRequests);
        };
    }, [socket, token]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !token) return;

        setIsLoading(true);
        try {
            const results = await api.searchUsers(searchQuery, token);
            setSearchResults(results);
        } catch (error) {
            toast({
                title: "Search failed",
                description: "Could not search for users",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const sendFriendRequest = async (userId: string) => {
        if (!token) return;
        try {
            await api.sendFriendRequest(userId, token);
            // Update local state to reflect sent request
            setSearchResults(prev => prev.map(u =>
                u.userId === userId ? { ...u, hasPendingRequest: true } : u
            ));
        } catch (error) {
            toast({
                title: "Failed to send request",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };

    const acceptRequest = async (requestId: string) => {
        if (!token) return;
        try {
            await api.acceptFriendRequest(requestId, token);
            toast({
                title: "Friend added",
                description: "You are now friends!",
            });
            loadRequests();
            loadFriends();
        } catch (error) {
            toast({
                title: "Action failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };

    const declineRequest = async (requestId: string) => {
        if (!token) return;
        try {
            await api.declineFriendRequest(requestId, token);
            toast({
                title: "Request declined",
            });
            loadRequests();
        } catch (error) {
            toast({
                title: "Action failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };

    const handleAcceptChallenge = async (challenge: api.FriendlyChallenge) => {
        if (!token) return;
        try {
            const data = await api.acceptChallenge(challenge.id, token);
            toast({
                title: "Challenge accepted",
                description: "Game starting...",
            });

            if (data.gameId) {
                navigate(`/game/${data.gameId}`);
            }
        } catch (error) {
            toast({
                title: "Action failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };

    const handleDeclineChallenge = async (challengeId: string) => {
        if (!token) return;
        try {
            await api.declineChallenge(challengeId, token);
            toast({
                title: "Challenge declined",
            });
            loadChallenges();
        } catch (error) {
            toast({
                title: "Action failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };

    const confirmRemoveFriend = (friend: api.Friend) => {
        setFriendToRemove(friend);
        setConfirmRemoveOpen(true);
    };

    const handleRemoveFriend = async () => {
        if (!token || !friendToRemove) return;
        try {
            await api.removeFriend(friendToRemove.userId, token);
            toast({
                title: "Friend removed",
                description: `${friendToRemove.username} has been removed from your friends list`,
            });
            loadFriends();
        } catch (error) {
            toast({
                title: "Action failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setConfirmRemoveOpen(false);
            setFriendToRemove(null);
        }
    };

    const openChallengeModal = (friend: api.Friend) => {
        setSelectedFriend(friend);
        setChallengeModalOpen(true);
    };

    const handleSendChallenge = async (timeControl: string) => {
        if (!token || !selectedFriend) return;
        try {
            await api.sendChallenge(selectedFriend.userId, timeControl, token);
            toast({
                title: "Challenge sent!",
                description: `Waiting for ${selectedFriend.username} to accept...`,
            });
        } catch (error) {
            toast({
                title: "Failed to send challenge",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Friends & Community
                </CardTitle>
                <CardDescription>
                    Connect with other players and challenge them to friendly games
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={(val) => {
                    setActiveTab(val);
                    if (val === 'challenges') loadChallenges();
                    if (val === 'requests') loadRequests();
                }} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 h-auto">
                        <TabsTrigger value="friends" className="gap-2">
                            Friends
                            {friends.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{friends.length}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="challenges" className="gap-2">
                            Challenges
                            {challenges.length > 0 && <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs animate-pulse bg-orange-500">{challenges.length}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="gap-2">
                            Requests
                            {requests.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{requests.length}</Badge>}
                        </TabsTrigger>
                        <TabsTrigger value="search">Find</TabsTrigger>
                    </TabsList>

                    {/* Friends List Tab */}
                    <TabsContent value="friends" className="space-y-4">
                        {friends.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>You haven't added any friends yet.</p>
                                <Button variant="link" onClick={() => setActiveTab("search")}>
                                    Find people to play with
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {friends.map((friend) => (
                                    <div key={friend.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card transition-colors gap-3 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                                            <div>
                                                <div className="font-semibold">{friend.username}</div>
                                                <div className="text-xs text-muted-foreground flex gap-2">
                                                    <span>Blitz: {friend.ratings.blitz}</span>
                                                    <span>Rapid: {friend.ratings.rapid}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                className="bg-primary hover:bg-primary/90 gap-1 flex-1 sm:flex-initial"
                                                onClick={() => openChallengeModal(friend)}
                                                disabled={!friend.isOnline}
                                            >
                                                <Swords className="h-3 w-3" />
                                                Challenge
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={() => confirmRemoveFriend(friend)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Challenges Tab */}
                    <TabsContent value="challenges" className="space-y-4">
                        {challenges.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Swords className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                <p>No active challenges.</p>
                                <Button variant="link" onClick={() => setActiveTab("friends")}>
                                    Challenge a friend
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {challenges.map((challenge) => (
                                    <div key={challenge.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card border-orange-200 dark:border-orange-900/50 gap-3 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-full">
                                                <Swords className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div>
                                                <div className="font-semibold flex items-center gap-2">
                                                    {challenge.challengerUsername}
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {challenge.timeControlKey}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Expires in {Math.max(0, Math.ceil((new Date(challenge.expiresAt).getTime() - Date.now()) / 60000))} mins
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                                            <Button size="sm" onClick={() => handleAcceptChallenge(challenge)} className="gap-1 bg-primary hover:bg-primary/90 flex-1 sm:flex-initial">
                                                <Check className="h-3 w-3" /> Accept
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleDeclineChallenge(challenge.id)} className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 flex-1 sm:flex-initial">
                                                <X className="h-3 w-3" /> Decline
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Requests Tab */}
                    <TabsContent value="requests" className="space-y-4">
                        {requests.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No pending friend requests.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {requests.map((req) => (
                                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card gap-3 sm:gap-0">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-full">
                                                <UserPlus className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-semibold">{req.senderUsername}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Sent on {new Date(req.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                                            <Button size="sm" onClick={() => acceptRequest(req.id)} className="gap-1 bg-primary hover:bg-primary/90 flex-1 sm:flex-initial">
                                                <Check className="h-3 w-3" /> Accept
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => declineRequest(req.id)} className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 flex-1 sm:flex-initial">
                                                <X className="h-3 w-3" /> Decline
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Search Tab */}
                    <TabsContent value="search" className="space-y-4">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by username..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Searching..." : "Search"}
                            </Button>
                        </form>

                        <div className="space-y-2 mt-4">
                            {searchResults.length > 0 ? (
                                searchResults.map((userResult) => (
                                    <div key={userResult.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3 sm:gap-0">
                                        <div>
                                            <div className="font-semibold">{userResult.username}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Rating: {userResult.ratings.blitz} (Blitz)
                                            </div>
                                        </div>

                                        <div className="w-full sm:w-auto flex justify-end">
                                            {userResult.isFriend ? (
                                                <Badge variant="secondary" className="w-full sm:w-auto justify-center">
                                                    Friends
                                                </Badge>
                                            ) : userResult.hasPendingRequest ? (
                                                <Badge variant="outline" className="text-muted-foreground w-full sm:w-auto justify-center">
                                                    Request Sent
                                                </Badge>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="gap-1 w-full sm:w-auto"
                                                    onClick={() => sendFriendRequest(userResult.userId)}
                                                >
                                                    <UserPlus className="h-3 w-3" /> Add Friend
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : searchQuery && !isLoading && (
                                <div className="text-center py-4 text-muted-foreground">
                                    No users found matching "{searchQuery}"
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>

            <ChallengeModal
                isOpen={challengeModalOpen}
                onClose={() => setChallengeModalOpen(false)}
                friend={selectedFriend}
                onSendChallenge={handleSendChallenge}
            />

            <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove {friendToRemove?.username} from your friends list?
                            You won't be able to challenge them easily anymore.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveFriend} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};
