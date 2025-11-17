import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, BarChart3 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface Candidate {
  id: string;
  name: string;
  party: string;
}

interface Booth {
  id: string;
  booth_no: string;
  address: string;
}

interface Result {
  id: string;
  candidate_id: string;
  booth_id: string;
  votes: number;
  status: string;
  candidate?: { name: string; party: string };
  booth?: { booth_no: string };
}

const AdminElectionResults = () => {
  const { role, loading: roleLoading } = useUserRole();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for adding results
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [selectedBooth, setSelectedBooth] = useState('');
  const [votes, setVotes] = useState('');
  const [status, setStatus] = useState('counting');

  useEffect(() => {
    if (role === 'admin') {
      fetchData();
    }
  }, [role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [candidatesRes, boothsRes, resultsRes] = await Promise.all([
        supabase.from('elections_candidates').select('*').eq('election_slug', 'jubilee-hills-2025'),
        supabase.from('elections_booths').select('*').eq('election_slug', 'jubilee-hills-2025'),
        supabase
          .from('elections_results')
          .select(`
            *,
            candidate:elections_candidates(name, party),
            booth:elections_booths(booth_no)
          `)
          .eq('election_slug', 'jubilee-hills-2025')
          .order('created_at', { ascending: false })
      ]);

      if (candidatesRes.data) setCandidates(candidatesRes.data);
      if (boothsRes.data) setBooths(boothsRes.data);
      if (resultsRes.data) setResults(resultsRes.data as any);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddResult = async () => {
    if (!selectedCandidate || !selectedBooth || !votes) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const { error } = await supabase.from('elections_results').insert({
        election_slug: 'jubilee-hills-2025',
        candidate_id: selectedCandidate,
        booth_id: selectedBooth,
        votes: parseInt(votes),
        status
      });

      if (error) throw error;

      toast.success('Result added successfully');
      setSelectedCandidate('');
      setSelectedBooth('');
      setVotes('');
      setStatus('counting');
      fetchData();
    } catch (error) {
      console.error('Error adding result:', error);
      toast.error('Failed to add result');
    }
  };

  const handleDeleteResult = async (id: string) => {
    try {
      const { error } = await supabase.from('elections_results').delete().eq('id', id);

      if (error) throw error;

      toast.success('Result deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting result:', error);
      toast.error('Failed to delete result');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('elections_results')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success('Status updated');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (roleLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (role !== 'admin') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Access denied. Admin only.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Election Results Management</h1>
            <p className="text-muted-foreground">Add and manage live vote counting results</p>
          </div>
        </div>

        {/* Add Result Form */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Add Vote Count
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Candidate</Label>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name} ({candidate.party})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Polling Booth</Label>
              <Select value={selectedBooth} onValueChange={setSelectedBooth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select booth" />
                </SelectTrigger>
                <SelectContent>
                  {booths.map((booth) => (
                    <SelectItem key={booth.id} value={booth.id}>
                      Booth {booth.booth_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Votes</Label>
              <Input
                type="number"
                placeholder="Enter vote count"
                value={votes}
                onChange={(e) => setVotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="counting">Counting</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAddResult} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Result
          </Button>
        </Card>

        {/* Results List */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Current Results</h2>
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No results added yet</p>
            ) : (
              results.map((result) => (
                <Card key={result.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-semibold text-foreground">
                            {result.candidate?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.candidate?.party || 'N/A'}
                          </p>
                        </div>
                        <div className="text-center px-4 border-x border-border">
                          <p className="text-sm text-muted-foreground">Booth</p>
                          <p className="font-semibold text-foreground">
                            {result.booth?.booth_no || 'N/A'}
                          </p>
                        </div>
                        <div className="text-center px-4">
                          <p className="text-sm text-muted-foreground">Votes</p>
                          <p className="text-xl font-bold text-primary">
                            {result.votes.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={result.status}
                        onValueChange={(value) => handleUpdateStatus(result.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="counting">Counting</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteResult(result.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AdminElectionResults;
