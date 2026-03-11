import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong');
            setSubmitted(true);
            toast({ title: 'Email Sent', description: data.message });
        } catch (err) {
            toast({
                title: 'Error',
                description: (err as Error).message || 'Failed to send reset email',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-4">
                            <Mail className="w-12 h-12 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
                        <CardDescription>
                            Enter your registered email and we'll send you a link to reset your password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {submitted ? (
                            <div className="space-y-4 text-center">
                                <div className="text-sm text-muted-foreground bg-muted p-4 rounded">
                                    If an account with that email exists, a password reset link has been sent.
                                    Please check your inbox (and spam folder).
                                </div>
                                <Link to="/login">
                                    <Button variant="outline" className="w-full mt-2">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your_email@kgpian.iitkgp.ac.in"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </Button>
                                <div className="text-center text-sm">
                                    <Link to="/login" className="text-primary hover:underline font-medium">
                                        <ArrowLeft className="w-3 h-3 inline mr-1" />
                                        Back to Login
                                    </Link>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
};

export default ForgotPassword;
