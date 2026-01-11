import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { GameHistory } from '@/components/GameHistory';
import { Trophy, Target, Gamepad2, Settings, Calendar, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import * as api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, isAuthenticated } = useAuth();

  const [profileData, setProfileData] = useState<api.User | null>(null);
  const [editing, setEditing] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [rank, setRank] = useState<number | null>(null);

  // Fetch user profile and rank
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const token = localStorage.getItem('auth_token');
    
    // Fetch profile
    api.getUserById(user.userId, token || '')
      .then(data => {
        setProfileData(data);
        setEmailInput(data.email);
      })
      .catch(err => console.error('[Profile] Fetch failed', err));

    // Fetch rank from leaderboard
    api.getLeaderboard('blitz', 100)
      .then(leaderboard => {
        const userRank = leaderboard.findIndex(e => e.userId === user.userId);
        if (userRank !== -1) {
          setRank(userRank + 1);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, user]);

  const handleSave = async () => {
    if (!user || !profileData) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const updated = await api.updateUser(
        user.userId,
        { email: emailInput },
        token ?? ''
      );
      setProfileData(updated);
      setEditing(false);
      toast({ title: 'Profile updated' });
    } catch (error: unknown) {
      toast({ 
        title: 'Update failed', 
        description: (error as Error).message,
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEmailInput(profileData?.email || '');
    setEditing(false);
  };

  const displayName = profileData?.username ?? 'Guest';
  const gamesPlayed = profileData?.gamesPlayed ?? 0;
  const gamesWon = profileData?.gamesWon ?? 0;
  const memberSince = profileData?.createdAt 
    ? new Date(profileData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 md:p-8 max-w-full md:max-w-4xl lg:max-w-6xl mx-auto">

        {/* Profile Header */}
        <div className="relative rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border shadow-xl">
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_70%)]"></div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-0">
            <div className="flex items-center gap-4 sm:gap-6 w-full">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/60 to-accent/60 blur-md animate-pulse"></div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 relative rounded-full bg-secondary flex items-center justify-center text-3xl sm:text-4xl border-2 border-primary/40 shadow-lg backdrop-blur-sm">
                  ♟️
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                  {profileData?.fullName || displayName}
                </h1>
                {profileData?.fullName && (
                  <p className="text-lg text-muted-foreground font-medium">@{displayName}</p>
                )}
                <p className="text-muted-foreground mt-1 text-sm sm:text-base truncate">
                  Member since {memberSince}
                </p>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4">
                  <span className="px-2 sm:px-3 py-1 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shadow-sm">
                    {profileData?.hallOfResidence || 'Hall not set'}
                  </span>
                  {rank && (
                    <span className="px-2 sm:px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm font-medium shadow-sm">
                      #{rank}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Button */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
              className="shrink-0"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit Profile
            </Button> */}
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="bg-card rounded-xl p-6 mb-6 border border-border">
            <h2 className="font-semibold mb-4">Edit Profile</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Username</label>
                <input
                  type="text"
                  value={profileData?.username || ''}
                  disabled
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">Username cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Hall of Residence</label>
                <input
                  type="text"
                  value={profileData?.hallOfResidence || ''}
                  disabled
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-foreground opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">Contact admin to change hall</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">

            {/* Rating Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
              {[
                { label: 'Bullet', rating: profileData?.bullet ?? 1200, icon: '⚡' },
                { label: 'Blitz', rating: profileData?.blitz ?? 1200, icon: '🔥' },
                { label: 'Rapid', rating: profileData?.rapid ?? 1200, icon: '⏱️' },
              ].map(item => (
                <div key={item.label} className="bg-card rounded-xl p-4 text-center hover-lift">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-2xl font-bold text-foreground">
                    {item.rating}
                  </div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>

            <GameHistory games={profileData?.gameHistory || []} />
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6 mt-6 md:mt-0">
            <div className="bg-card rounded-xl p-4 sm:p-6">
              <h2 className="font-semibold mb-4">Statistics</h2>

              <div className="space-y-4">
                <Stat icon={<Gamepad2 size={18} />} label="Games Played" value={gamesPlayed.toLocaleString()} />
                <Stat
                  icon={<Trophy size={18} />}
                  label="Wins"
                  value={`${gamesWon.toLocaleString()}${gamesPlayed > 0 ? ` (${Math.round((gamesWon / gamesPlayed) * 100)}%)` : ''}`}
                />
                <Stat icon={<Calendar size={18} />} label="Current Streak" value={`${profileData?.currentStreak ?? 0} days 🔥`} />
                <Stat icon={<Settings size={18} />} label="Leaderboard Rank" value={rank ? `#${rank}` : '-'} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
};

const Stat = ({ icon, label, value }: StatProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3 text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

export default Profile;
