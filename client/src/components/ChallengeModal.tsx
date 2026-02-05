import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Zap, Clock, Trophy } from "lucide-react";
import * as api from '@/lib/api';

interface ChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    friend: api.Friend | null;
    onSendChallenge: (timeControl: string) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
    isOpen,
    onClose,
    friend,
    onSendChallenge
}) => {
    const [timeControl, setTimeControl] = useState('blitz');

    if (!friend) return null;

    const handleSend = () => {
        onSendChallenge(timeControl);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Challenge {friend.username}</DialogTitle>
                    <DialogDescription>
                        Choose a time control for your friendly game.
                        Friendly games do not affect your rating.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                    <RadioGroup value={timeControl} onValueChange={setTimeControl} className="grid gap-4">
                        {/* Bullet */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Bullet</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'bullet', label: '1+0', desc: 'Bullet' },
                                    { id: 'bullet+1', label: '1+1', desc: 'Bullet' },
                                    { id: 'bullet+2|1', label: '2+1', desc: 'Bullet' },
                                ].map((tc) => (
                                    <Label
                                        key={tc.id}
                                        htmlFor={tc.id}
                                        className={`flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors cursor-pointer ${timeControl === tc.id ? 'border-primary' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value={tc.id} id={tc.id} className="sr-only" />
                                            <Zap className="h-4 w-4 text-orange-500" />
                                            <div className="font-semibold">{tc.desc}</div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">{tc.label}</div>
                                    </Label>
                                ))}
                            </div>
                        </div>

                        {/* Blitz */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium leading-none">Blitz</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'blitz-3', label: '3+0', desc: 'Blitz' },
                                    { id: 'blitz+3|2', label: '3+2', desc: 'Blitz' },
                                    { id: 'blitz', label: '5+0', desc: 'Blitz' },
                                ].map((tc) => (
                                    <Label
                                        key={tc.id}
                                        htmlFor={tc.id}
                                        className={`flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors cursor-pointer ${timeControl === tc.id ? 'border-primary' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value={tc.id} id={tc.id} className="sr-only" />
                                            <Trophy className="h-4 w-4 text-yellow-500" />
                                            <div className="font-semibold">{tc.desc}</div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">{tc.label}</div>
                                    </Label>
                                ))}
                            </div>
                        </div>

                        {/* Rapid */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium leading-none">Rapid</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'rapid', label: '10+0', desc: 'Rapid' },
                                    { id: 'rapid+15|10', label: '15+10', desc: 'Rapid' },
                                    { id: 'rapid-30', label: '30+0', desc: 'Rapid' },
                                ].map((tc) => (
                                    <Label
                                        key={tc.id}
                                        htmlFor={tc.id}
                                        className={`flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors cursor-pointer ${timeControl === tc.id ? 'border-primary' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value={tc.id} id={tc.id} className="sr-only" />
                                            <Clock className="h-4 w-4 text-green-500" />
                                            <div className="font-semibold">{tc.desc}</div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">{tc.label}</div>
                                    </Label>
                                ))}
                            </div>
                        </div>
                    </RadioGroup>
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSend} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Send Challenge
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
