import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FriendsList } from '@/components/FriendsList';

const Friends: React.FC = () => {
    return (
        <MainLayout>
            <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Social</h1>
                    <p className="text-muted-foreground">
                        Manage friends, send requests, and challenge players.
                    </p>
                </div>

                <FriendsList />
            </div>
        </MainLayout>
    );
};

export default Friends;
