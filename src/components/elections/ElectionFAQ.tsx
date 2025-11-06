import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

const faqs = [
  {
    question: 'What documents do I need to vote?',
    answer: 'You need a valid photo ID proof such as Voter ID card, Aadhaar card, Passport, Driving License, PAN card, or any other government-issued photo ID. Make sure your name is on the electoral roll.'
  },
  {
    question: 'Where can I check my name on the voter list?',
    answer: 'You can check your name on the voter list by visiting the official Election Commission of India website at www.nvsp.in. You can search by your EPIC number, name, or other details.',
    link: 'https://www.nvsp.in'
  },
  {
    question: 'How do I find my polling booth?',
    answer: 'You can find your polling booth by checking your Voter ID card, visiting the ECI website, or using the Voter Helpline app. Your polling booth is assigned based on your registered address.'
  },
  {
    question: 'What time does voting start and end?',
    answer: 'Voting typically starts at 7:00 AM and ends at 6:00 PM on polling day (November 11, 2025). However, if you are in the queue before 6:00 PM, you will be allowed to vote.'
  },
  {
    question: 'Can I vote if I forgot my Voter ID card?',
    answer: 'Yes, you can vote even if you forgot your Voter ID card. You can use any of the 11 alternative photo IDs approved by the Election Commission, such as Aadhaar card, Passport, Driving License, etc.'
  },
  {
    question: 'What is NOTA and when can I use it?',
    answer: 'NOTA stands for "None of the Above". If you do not wish to vote for any of the candidates, you can choose the NOTA option. This allows you to reject all candidates while still exercising your right to vote.'
  },
  {
    question: 'Are polling booths accessible for differently-abled voters?',
    answer: 'Yes, the Election Commission ensures that polling booths are accessible. Facilities like wheelchairs, ramps, and volunteers are available. Look for the accessibility icons on booth information.'
  },
  {
    question: 'Can I take my phone inside the polling booth?',
    answer: 'No, mobile phones and cameras are not allowed inside the polling booth premises. This is to maintain the secrecy of the ballot and prevent malpractices.'
  }
];

const ElectionFAQ = () => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Common questions about voting in the Jubilee Hills election
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
                {faq.link && (
                  <a
                    href={faq.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline mt-2"
                  >
                    Visit official website
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Card className="p-4 bg-accent/50 mt-6">
          <p className="text-sm text-center text-muted-foreground">
            For more information, visit the{' '}
            <a
              href="https://eci.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Election Commission of India website
            </a>
          </p>
        </Card>
      </div>
    </Card>
  );
};

export default ElectionFAQ;
