import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { Reveal } from './Reveal';

const faqs = [
  {
    question: 'Is SalonBook free for customers?',
    answer:
      'Yes! Browsing salons and booking appointments is completely free for customers. You only pay for services at the salon when you visit.',
  },
  {
    question: 'How do I pay for my booking?',
    answer:
      'SalonBook uses a pay-at-shop model. Book your slot online, then pay directly at the salon when you arrive. No online payment gateway required.',
  },
  {
    question: 'Can I cancel or reschedule my booking?',
    answer:
      'Yes. You can cancel your booking from your customer dashboard. For rescheduling, cancel your current booking and book a new slot that works for you.',
  },
  {
    question: 'How do I list my salon on SalonBook?',
    answer:
      'Sign up as a seller, complete your salon profile with photos and services, and start receiving bookings. The setup takes about 10 minutes.',
  },
  {
    question: 'Are the reviews on SalonBook real?',
    answer:
      'Absolutely. Only customers who have completed a visit can leave a review, ensuring authentic and trustworthy ratings.',
  },
  {
    question: 'Which cities does SalonBook cover?',
    answer:
      'SalonBook is growing across India. New salons join every week. Search by your location on the Explore page to find salons near you.',
  },
];

function FaqItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-stone-200/60 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 md:py-6 text-left gap-4"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-stone-900 font-display text-base md:text-lg">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-stone-500" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 md:pb-6 text-stone-500 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-28 bg-white scroll-mt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <p className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-3">FAQ</p>
          <h2 className="text-3xl md:text-5xl font-bold text-stone-900 font-display tracking-tight mb-4">
            Frequently asked questions
          </h2>
          <p className="text-stone-500 text-lg">
            Everything you need to know about booking with SalonBook.
          </p>
        </Reveal>

        <Reveal>
          <div className="bg-stone-50 rounded-[1.5rem] md:rounded-[2rem] border border-stone-200/60 px-6 md:px-8">
            {faqs.map((faq, i) => (
              <FaqItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
