import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Search, ExternalLink, Accessibility } from 'lucide-react';

interface Booth {
  id: string;
  booth_no: string;
  address: string;
  lat: number | null;
  lon: number | null;
  accessibility: any;
  contact: string | null;
}

const BoothMap = () => {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [filteredBooths, setFilteredBooths] = useState<Booth[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooths();
  }, []);

  useEffect(() => {
    filterBooths();
  }, [booths, searchQuery]);

  const fetchBooths = async () => {
    try {
      const { data, error } = await supabase
        .from('elections_booths')
        .select('*')
        .eq('election_slug', 'jubilee-hills-2025')
        .order('booth_no');

      if (error) throw error;
      setBooths(data || []);
    } catch (error) {
      console.error('Error fetching booths:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBooths = () => {
    if (!searchQuery) {
      setFilteredBooths(booths);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredBooths(
      booths.filter(
        (booth) =>
          booth.booth_no.toLowerCase().includes(query) ||
          booth.address.toLowerCase().includes(query)
      )
    );
  };

  const getDirections = (booth: Booth) => {
    if (booth.lat && booth.lon) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${booth.lat},${booth.lon}`,
        '_blank'
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booth.address)}`,
        '_blank'
      );
    }
  };

  const getAccessibilityFeatures = (accessibility: any) => {
    if (!accessibility || typeof accessibility !== 'object') return [];
    return Object.entries(accessibility)
      .filter(([_, value]) => value === true)
      .map(([key]) => key);
  };

  if (loading) {
    return <div className="text-center py-8">Loading polling booths...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: List View */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by booth number or locality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {filteredBooths.map((booth) => (
            <Card
              key={booth.id}
              className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                selectedBooth?.id === booth.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedBooth(booth)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground">Booth #{booth.booth_no}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{booth.address}</p>
                  </div>
                  <Badge variant="outline">
                    <MapPin className="h-3 w-3 mr-1" />
                    {booth.booth_no}
                  </Badge>
                </div>

                {booth.accessibility && (
                  <div className="flex flex-wrap gap-1">
                    {getAccessibilityFeatures(booth.accessibility).map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        <Accessibility className="h-3 w-3 mr-1" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                )}

                {booth.contact && (
                  <p className="text-xs text-muted-foreground">Contact: {booth.contact}</p>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    getDirections(booth);
                  }}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Right: Map View */}
      <Card className="p-6 sticky top-4">
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-foreground">Polling Booth Map</h3>
          
          {selectedBooth ? (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MapPin className="h-12 w-12 text-primary mx-auto" />
                  <p className="text-muted-foreground">
                    Map integration coming soon
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use "Get Directions" to navigate
                  </p>
                </div>
              </div>

              <div className="p-4 bg-accent rounded-lg space-y-2">
                <h4 className="font-semibold">Booth #{selectedBooth.booth_no}</h4>
                <p className="text-sm text-muted-foreground">{selectedBooth.address}</p>
                {selectedBooth.contact && (
                  <p className="text-sm">Contact: {selectedBooth.contact}</p>
                )}
                {selectedBooth.lat && selectedBooth.lon && (
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {selectedBooth.lat}, {selectedBooth.lon}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Select a booth to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default BoothMap;
