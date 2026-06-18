import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import TrustMarquee from '../components/landing/TrustMarquee';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Stats from '../components/landing/Stats';
import Categories from '../components/landing/Categories';
import Testimonials from '../components/landing/Testimonials';
import BusinessCta from '../components/landing/BusinessCta';
import Faq from '../components/landing/Faq';
import CtaBanner from '../components/landing/CtaBanner';
import LandingFooter from '../components/landing/LandingFooter';

export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-50">
      <LandingNav />
      <main>
        <Hero />
        <TrustMarquee />
        <Features />
        <HowItWorks />
        <Stats />
        <Categories />
        <Testimonials />
        <BusinessCta />
        <Faq />
        <CtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
}
