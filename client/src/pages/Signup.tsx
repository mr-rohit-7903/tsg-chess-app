import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Crown } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', hallOfResidence: '' });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    if (form.password !== form.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setValidationError('Password must be at least 6 characters long');
      return;
    }

    if (!form.hallOfResidence) {
      setValidationError('Please select your hall of residence');
      return;
    }

    try {
      await register(form.username, form.email, form.password, form.hallOfResidence);
      toast({ title: 'Success', description: 'Account created successfully!' });
      navigate('/');
    } catch (err) {
      toast({
        title: 'Signup Failed',
        description: (err as Error).message || 'Failed to create account',
        variant: 'destructive'
      });
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Crown className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>
              Enter your information to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hallOfResidence">Hall of Residence *</Label>
                <select
                  id="hallOfResidence"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.hallOfResidence}
                  onChange={(e) => setForm({ ...form, hallOfResidence: e.target.value })}
                  required
                  disabled={loading}
                >
                  <option value="">Select your hall</option>
                  <option>Rajendra Prasad Hall of Residence</option>
                  <option>Radhakrishnan Hall of Residence</option>
                  <option>Meghnad Saha Hall of Residence</option>
                  <option>Lala Lajpat Rai Hall of Residence</option>
                  <option>Pandit Madan Mohan Malaviya Hall of Residence</option>
                  <option>Lal Bahadur Shastri Hall of Residence</option>
                  <option>Patel Hall of Residence</option>
                  <option>Nehru Hall of Residence</option>
                  <option>Azad Hall of Residence</option>
                  <option>Zakhir Hussain Hall of Residence</option>
                  <option>Bhim Rao Ambedkar Hall of Residence</option>
                  <option>Homi Jehangir Bhabha Hall of Residence</option>
                  <option>Acharya Jagadish Chandra Bose Hall of Residence</option>
                  <option>Vidyasagar Hall of Residence</option>
                  <option>Sister Nivedita Hall of Residence</option>
                  <option>Mother Teresa Hall of Residence</option>
                  <option>Sarojini Naidu/ Indira Gandhi Hall of Residence</option>
                  <option>Rani Laxmibai Hall of Residence</option>
                  <option>Gokhale Hall of Residence</option>
                  <option>Sir Ashutosh Mukherjee Hall of Residence</option>
                  <option>Bidhan Chandra Roy Hall of Residence</option>
                  <option>Savitribai Phule Hall of Residence</option>
                  <option>Atal Bihari Vajpayee Hall of Residence</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              {(error || validationError) && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {validationError || error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Signup;

