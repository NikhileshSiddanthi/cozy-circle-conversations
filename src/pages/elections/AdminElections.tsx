import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Plus, Trash2, Edit, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminElections = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [booths, setBooths] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/');
      toast.error('Admin access required');
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [candidatesRes, boothsRes, pollsRes] = await Promise.all([
        supabase.from('elections_candidates').select('*').order('name'),
        supabase.from('elections_booths').select('*').order('booth_no'),
        supabase.from('elections_public_polls').select('*').order('created_at', { ascending: false })
      ]);

      setCandidates(candidatesRes.data || []);
      setBooths(boothsRes.data || []);
      setPolls(pollsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase.from('elections_candidates').insert({
        election_slug: 'jubilee-hills-2025',
        name: formData.get('name') as string,
        party: formData.get('party') as string,
        bio: formData.get('bio') as string,
        photo_url: formData.get('photo_url') as string,
        status: 'nominated'
      });

      if (error) throw error;
      toast.success('Candidate added successfully');
      fetchData();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error adding candidate:', error);
      toast.error('Failed to add candidate');
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;

    try {
      const { error } = await supabase.from('elections_candidates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Candidate deleted');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete candidate');
    }
  };

  const handleAddBooth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const { error } = await supabase.from('elections_booths').insert({
        election_slug: 'jubilee-hills-2025',
        booth_no: formData.get('booth_no') as string,
        address: formData.get('address') as string,
        lat: parseFloat(formData.get('lat') as string) || null,
        lon: parseFloat(formData.get('lon') as string) || null,
        contact: formData.get('contact') as string,
      });

      if (error) throw error;
      toast.success('Booth added successfully');
      fetchData();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error adding booth:', error);
      toast.error('Failed to add booth');
    }
  };

  const handleAddPoll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const options = (formData.get('options') as string).split('\n').filter(o => o.trim());
    
    try {
      const { error } = await supabase.from('elections_public_polls').insert({
        election_slug: 'jubilee-hills-2025',
        question: formData.get('question') as string,
        options: options,
        is_active: false
      });

      if (error) throw error;
      toast.success('Poll created successfully');
      fetchData();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    }
  };

  const handleTogglePollActive = async (id: string, currentStatus: boolean) => {
    try {
      // First, deactivate all polls
      await supabase.from('elections_public_polls').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Then activate this one if it was inactive
      if (!currentStatus) {
        const { error } = await supabase.from('elections_public_polls').update({ is_active: true }).eq('id', id);
        if (error) throw error;
      }

      toast.success(currentStatus ? 'Poll deactivated' : 'Poll activated');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update poll status');
    }
  };

  const handleRefreshSentiment = async () => {
    try {
      toast.info('Sentiment refresh triggered (this would connect to the edge function)');
      // In production, this would call the sentiment analysis edge function
      // const { data } = await supabase.functions.invoke('analyze-sentiment', {
      //   body: { texts: [...], election_slug: 'jubilee-hills-2025' }
      // });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to refresh sentiment');
    }
  };

  if (roleLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Jubilee Hills Election Admin
          </h1>
          <p className="text-muted-foreground">
            Manage candidates, polling booths, polls, and sentiment data
          </p>
        </div>

        <Tabs defaultValue="candidates" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="booths">Booths</TabsTrigger>
            <TabsTrigger value="polls">Polls</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          </TabsList>

          <TabsContent value="candidates" className="mt-6">
            <div className="space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Candidate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Candidate</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddCandidate} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="party">Party *</Label>
                      <Input id="party" name="party" required />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea id="bio" name="bio" rows={3} />
                    </div>
                    <div>
                      <Label htmlFor="photo_url">Photo URL</Label>
                      <Input id="photo_url" name="photo_url" type="url" />
                    </div>
                    <Button type="submit" className="w-full">Add Candidate</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="grid gap-4">
                {candidates.map((candidate) => (
                  <Card key={candidate.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold">{candidate.name}</h3>
                        <p className="text-sm text-muted-foreground">{candidate.party}</p>
                        {candidate.bio && <p className="text-sm mt-2">{candidate.bio}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCandidate(candidate.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="booths" className="mt-6">
            <div className="space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Booth
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Polling Booth</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddBooth} className="space-y-4">
                    <div>
                      <Label htmlFor="booth_no">Booth Number *</Label>
                      <Input id="booth_no" name="booth_no" required />
                    </div>
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Textarea id="address" name="address" required rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="lat">Latitude</Label>
                        <Input id="lat" name="lat" type="number" step="any" />
                      </div>
                      <div>
                        <Label htmlFor="lon">Longitude</Label>
                        <Input id="lon" name="lon" type="number" step="any" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contact">Contact</Label>
                      <Input id="contact" name="contact" />
                    </div>
                    <Button type="submit" className="w-full">Add Booth</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="grid gap-4">
                {booths.map((booth) => (
                  <Card key={booth.id} className="p-4">
                    <h3 className="font-bold">Booth #{booth.booth_no}</h3>
                    <p className="text-sm text-muted-foreground">{booth.address}</p>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="polls" className="mt-6">
            <div className="space-y-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Poll
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Public Poll</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddPoll} className="space-y-4">
                    <div>
                      <Label htmlFor="question">Question *</Label>
                      <Input id="question" name="question" required />
                    </div>
                    <div>
                      <Label htmlFor="options">Options (one per line) *</Label>
                      <Textarea id="options" name="options" required rows={4} placeholder="Option 1&#10;Option 2&#10;Option 3" />
                    </div>
                    <Button type="submit" className="w-full">Create Poll</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="grid gap-4">
                {polls.map((poll) => (
                  <Card key={poll.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold">{poll.question}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(poll.options as string[]).length} options
                        </p>
                      </div>
                      <Button
                        variant={poll.is_active ? "default" : "outline"}
                        onClick={() => handleTogglePollActive(poll.id, poll.is_active)}
                      >
                        {poll.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sentiment" className="mt-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">Sentiment Management</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Trigger manual sentiment refresh from data sources
                  </p>
                </div>
                <Button onClick={handleRefreshSentiment}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Sentiment Data
                </Button>
                <p className="text-xs text-muted-foreground">
                  Note: Sentiment analysis uses Hugging Face models to analyze public discussions about the election.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AdminElections;
