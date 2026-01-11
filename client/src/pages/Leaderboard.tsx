import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import * as api from '@/lib/api';

const TIME_CONTROLS = [
  { label: 'Bullet', value: 'bullet' },
  { label: 'Blitz', value: 'blitz' },
  { label: 'Rapid', value: 'rapid' },
  { label: 'Puzzles', value: 'puzzles' }
];

export default function Leaderboard() {
  const [leaderboards, setLeaderboards] = useState<Record<string, api.LeaderboardEntry[]>>({});
  const [leaderboardLoadingStatus, setLeaderboardLoadingStatus] = useState<Record<string, boolean>>(() => {
    const initialStatus: Record<string, boolean> = {};
    TIME_CONTROLS.forEach(tc => {
      initialStatus[tc.value] = true;
    });
    return initialStatus;
  });
  const [leaderboardErrors, setLeaderboardErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    setError(null);

    setLeaderboardLoadingStatus(prev => {
      const newStatus = { ...prev };
      TIME_CONTROLS.forEach(tc => {
        newStatus[tc.value] = true;
      });
      return newStatus;
    });

    const fetchPromises = TIME_CONTROLS.map(tc =>
      api.getLeaderboard(tc.value, 50)
        .then(data => {
          setLeaderboardErrors(prev => ({ ...prev, [tc.value]: null }));
          return { tc: tc.value, data };
        })
        .catch(err => {
          setLeaderboardErrors(prev => ({ ...prev, [tc.value]: `Failed to load ${tc.label} leaderboard.` }));
          return { tc: tc.value, data: [] };
        })
        .finally(() => {
          setLeaderboardLoadingStatus(prev => ({
            ...prev,
            [tc.value]: false,
          }));
        })
    );

    Promise.all(fetchPromises)
      .then(results => {
        const all: Record<string, api.LeaderboardEntry[]> = {};
        results.forEach(({ tc, data }) => {
          all[tc] = data;
        });
        setLeaderboards(all);
      })
      .catch(() => {
        setError('Failed to fetch one or more leaderboards');
      });
  }, []);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Leaderboard</h1>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        {TIME_CONTROLS.map(tc => (
          <section key={tc.value} className="mb-10">
            <h2 className="text-xl font-semibold mb-3 text-primary">{tc.label}</h2>
            {leaderboardLoadingStatus[tc.value] ? (
              <div className="text-center text-muted-foreground py-4">Loading {tc.label} leaderboard...</div>
            ) : leaderboardErrors[tc.value] ? (
              <div className="text-center text-red-600 py-4">{leaderboardErrors[tc.value]}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border shadow rounded-lg bg-card">
                  <thead className="bg-primary/10">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Username</th>
                      <th className="px-4 py-3 text-left">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboards[tc.value]?.length
                      ? leaderboards[tc.value].map((entry, idx) => (
                          <tr key={entry.userId} className="border-b border-border hover:bg-primary/5">
                            <td className="px-4 py-2">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium">{entry.username}</td>
                            <td className="px-4 py-2">{entry.rating}</td>
                          </tr>
                        ))
                      : <tr><td className="px-4 py-3" colSpan={3}>No players found.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </MainLayout>
  );
}

