import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileCheck, ClipboardCheck, Vote, BarChart3 } from 'lucide-react';

const timelineEvents = [
  {
    date: 'Oct 11, 2025',
    title: 'Model Code of Conduct',
    description: 'Model code starts for Jubilee Hills constituency',
    icon: FileCheck,
    status: 'completed'
  },
  {
    date: 'Oct 17-25, 2025',
    title: 'Nomination Period',
    description: 'Candidates file their nomination papers',
    icon: ClipboardCheck,
    status: 'completed'
  },
  {
    date: 'Oct 26, 2025',
    title: 'Scrutiny of Nominations',
    description: 'Election Commission reviews all nominations',
    icon: ClipboardCheck,
    status: 'completed'
  },
  {
    date: 'Nov 11, 2025',
    title: 'Polling Day',
    description: 'Citizens cast their votes from 7 AM to 6 PM',
    icon: Vote,
    status: 'upcoming'
  },
  {
    date: 'TBD',
    title: 'Counting & Results',
    description: 'Vote counting and result declaration',
    icon: BarChart3,
    status: 'upcoming'
  }
];

const ElectionTimeline = () => {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Election Timeline</h2>
          <p className="text-muted-foreground">
            Key dates and milestones for the Jubilee Hills by-election
          </p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline events */}
          <div className="space-y-6">
            {timelineEvents.map((event, index) => {
              const Icon = event.icon;
              const isCompleted = event.status === 'completed';
              
              return (
                <div key={index} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isCompleted
                        ? 'bg-primary border-primary'
                        : 'bg-background border-border'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isCompleted ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <Card className={`p-4 ${isCompleted ? 'bg-accent/50' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{event.title}</h3>
                            <Badge variant={isCompleted ? 'default' : 'outline'}>
                              {isCompleted ? 'Completed' : 'Upcoming'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{event.date}</span>
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ElectionTimeline;
