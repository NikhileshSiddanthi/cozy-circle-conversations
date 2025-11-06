import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { User, FileText, GitCompare } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  party: string;
  photo_url: string | null;
  bio: string | null;
  manifesto: any;
  symbol: string | null;
  status: string;
}

const CandidateGrid = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    filterCandidates();
  }, [candidates, filter]);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('elections_candidates')
        .select('*')
        .eq('election_slug', 'jubilee-hills-2025')
        .eq('status', 'nominated')
        .order('party')
        .order('name');

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCandidates = () => {
    let filtered = [...candidates];
    
    if (filter === 'independent') {
      filtered = filtered.filter(c => c.party.toLowerCase() === 'independent');
    } else if (filter !== 'all') {
      filtered = filtered.filter(c => c.party.toLowerCase() === filter.toLowerCase());
    }
    
    setFilteredCandidates(filtered);
  };

  const getPartyColor = (party: string) => {
    const colors: Record<string, string> = {
      'bjp': 'bg-orange-500',
      'congress': 'bg-blue-500',
      'trs': 'bg-pink-500',
      'aimim': 'bg-green-500',
      'independent': 'bg-gray-500'
    };
    return colors[party.toLowerCase()] || 'bg-primary';
  };

  const handleCompareSelect = (candidateId: string) => {
    if (selectedForCompare.includes(candidateId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== candidateId));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, candidateId]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading candidates...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filter and Compare Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by party" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Parties</SelectItem>
            <SelectItem value="bjp">BJP</SelectItem>
            <SelectItem value="congress">Congress</SelectItem>
            <SelectItem value="trs">TRS</SelectItem>
            <SelectItem value="aimim">AIMIM</SelectItem>
            <SelectItem value="independent">Independent</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={compareMode ? "default" : "outline"}
          onClick={() => {
            setCompareMode(!compareMode);
            setSelectedForCompare([]);
          }}
        >
          <GitCompare className="h-4 w-4 mr-2" />
          {compareMode ? 'Cancel Compare' : 'Compare Candidates'}
        </Button>
      </div>

      {/* Compare Button (shown when 2 selected) */}
      {compareMode && selectedForCompare.length === 2 && (
        <Card className="p-4 bg-primary/10">
          <Button
            onClick={() => {
              // Open comparison modal
              console.log('Comparing:', selectedForCompare);
            }}
            className="w-full"
          >
            Compare Selected Candidates
          </Button>
        </Card>
      )}

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCandidates.map((candidate) => (
          <Card
            key={candidate.id}
            className={`p-6 hover:shadow-lg transition-shadow ${
              selectedForCompare.includes(candidate.id) ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={candidate.photo_url || ''} alt={candidate.name} />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2 w-full">
                <h3 className="font-bold text-lg text-foreground">{candidate.name}</h3>
                <Badge className={getPartyColor(candidate.party)}>{candidate.party}</Badge>
                {candidate.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{candidate.bio}</p>
                )}
              </div>

              <div className="flex gap-2 w-full">
                {compareMode ? (
                  <Button
                    variant={selectedForCompare.includes(candidate.id) ? "default" : "outline"}
                    onClick={() => handleCompareSelect(candidate.id)}
                    className="flex-1"
                    disabled={!selectedForCompare.includes(candidate.id) && selectedForCompare.length >= 2}
                  >
                    {selectedForCompare.includes(candidate.id) ? 'Selected' : 'Select'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCandidate(candidate)}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Manifesto
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Manifesto Modal */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCandidate?.name} - Manifesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedCandidate?.photo_url || ''} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold">{selectedCandidate?.name}</h3>
                <Badge className={getPartyColor(selectedCandidate?.party || '')}>
                  {selectedCandidate?.party}
                </Badge>
              </div>
            </div>

            {selectedCandidate?.bio && (
              <div>
                <h4 className="font-semibold mb-2">Biography</h4>
                <p className="text-muted-foreground">{selectedCandidate.bio}</p>
              </div>
            )}

            {selectedCandidate?.manifesto && (
              <div>
                <h4 className="font-semibold mb-2">Key Promises</h4>
                <div className="space-y-2">
                  {typeof selectedCandidate.manifesto === 'object' ? (
                    Object.entries(selectedCandidate.manifesto).map(([key, value]) => (
                      <div key={key} className="p-3 bg-accent rounded-lg">
                        <p className="text-sm font-medium">{key}</p>
                        <p className="text-sm text-muted-foreground">{String(value)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">{String(selectedCandidate.manifesto)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CandidateGrid;
