import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Clock, Mail, HelpCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface FAQItem {
  question: string;
  answer: string;
  category: "general" | "privacy" | "technical" | "billing";
}

const FAQ = () => {
  const [expandedItem, setExpandedItem] = useState<number | null>(0);

  const faqData: FAQItem[] = [
    {
      question: "What is BravoMail and how does it work?",
      answer: "BravoMail is a temporary email service that provides you with disposable email addresses for protecting your privacy. Simply visit our website, and we'll automatically generate a temporary email address for you. You can use this email for signups, verifications, or any situation where you don't want to use your real email address. All emails are automatically deleted after 10 minutes.",
      category: "general"
    },
    {
      question: "How long do temporary emails last?",
      answer: "Temporary emails generated by BravoMail are valid for 10 minutes from creation. After this time, the email address and all associated messages are permanently deleted from our servers. This ensures maximum privacy and security for our users.",
      category: "general"
    },
    {
      question: "Do I need to register or create an account?",
      answer: "No! BravoMail requires absolutely no registration, signup, or account creation. This is part of our privacy-first approach - we can't compromise your privacy if we don't have your information in the first place. Simply visit our website and start using temporary emails immediately.",
      category: "general"
    },
    {
      question: "Is BravoMail really free to use?",
      answer: "Yes, BravoMail is completely free to use with no hidden costs, subscriptions, or premium tiers. We believe privacy protection should be accessible to everyone. You can generate unlimited temporary emails without any charges.",
      category: "billing"
    },
    {
      question: "What data do you collect about me?",
      answer: "BravoMail collects ZERO personal data. We don't track your IP address, browser information, device details, or any other identifying information. We don't use cookies for tracking, and we don't log user activities. The only data we temporarily store are the emails you receive, which are automatically deleted after 10 minutes.",
      category: "privacy"
    },
    {
      question: "Can I extend the lifetime of my temporary email?",
      answer: "No, temporary emails cannot be extended beyond the 10-minute limit. This is a deliberate security feature to ensure maximum privacy. If you need a longer-lasting email, simply generate a new temporary email address when needed.",
      category: "technical"
    },
    {
      question: "Can I send emails from my temporary address?",
      answer: "No, BravoMail temporary emails are receive-only. You can only receive emails at these addresses. This limitation helps maintain the privacy and security of the service while preventing potential abuse.",
      category: "technical"
    },
    {
      question: "What happens to my emails after 10 minutes?",
      answer: "After 10 minutes, both the temporary email address and all emails received at that address are permanently deleted from our servers. This data cannot be recovered by anyone, including our team. This automatic deletion ensures your privacy is protected.",
      category: "privacy"
    },
    {
      question: "Can I use BravoMail for important accounts?",
      answer: "We recommend using BravoMail only for temporary purposes like newsletter signups, downloading free resources, trial accounts, or one-time verifications. For important accounts like banking, work, or primary social media, use your permanent email address.",
      category: "general"
    },
    {
      question: "Are there any limitations on the types of emails I can receive?",
      answer: "BravoMail can receive most types of emails including verification emails, newsletters, and notifications. However, some services may block temporary email domains. Additionally, we cannot receive emails larger than 10MB or emails from blacklisted senders.",
      category: "technical"
    },
    {
      question: "Is my email content private and secure?",
      answer: "Yes, your email content is private during the 10-minute lifespan. Emails are stored securely on our servers with encryption in transit. However, remember that emails are automatically deleted after 10 minutes, so save any important information before the expiry time.",
      category: "privacy"
    },
    {
      question: "Can I choose my own email address?",
      answer: "Currently, BravoMail automatically generates random email addresses to ensure uniqueness and prevent conflicts. This also adds an extra layer of privacy by making addresses unpredictable. Custom email addresses are not available.",
      category: "technical"
    },
    {
      question: "What should I do if I'm not receiving emails?",
      answer: "If you're not receiving emails, first check that you've copied the email address correctly. Some services may take a few minutes to send emails. If the issue persists, try generating a new email address, as some services may block temporary email domains. You can also try our refresh button to check for new emails.",
      category: "technical"
    },
    {
      question: "Can I use BravoMail on mobile devices?",
      answer: "Yes! BravoMail is fully responsive and works perfectly on smartphones, tablets, and desktop computers. Our mobile-optimized interface ensures you can generate and check temporary emails on any device with an internet connection.",
      category: "general"
    },
    {
      question: "How can I contact support if I have issues?",
      answer: "You can reach our support team through the Contact Us page on our website. We typically respond within 24 hours. For faster assistance, please check this FAQ first as it covers most common questions and issues.",
      category: "general"
    }
  ];

  const categories = [
    { id: "general", name: "General", icon: HelpCircle },
    { id: "privacy", name: "Privacy & Security", icon: Shield },
    { id: "technical", name: "Technical", icon: Mail },
    { id: "billing", name: "Billing", icon: Clock }
  ];

  const [activeCategory, setActiveCategory] = useState<string>("general");

  const filteredFAQ = faqData.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <section className="text-center py-16 sm:py-20">
          <div className="animate-slide-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Frequently Asked <span className="bg-gradient-hero bg-clip-text text-transparent">Questions</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Find answers to common questions about BravoMail, our temporary email service, and how to protect your privacy online.
            </p>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="mb-12">
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-smooth ${
                  activeCategory === category.id
                    ? 'bg-gradient-primary text-white shadow-glow'
                    : 'bg-gradient-card border border-border/10 text-muted-foreground hover:text-primary hover:border-primary/20'
                }`}
              >
                <category.icon className="w-5 h-5" />
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* FAQ Items */}
        <section className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {filteredFAQ.map((item, index) => (
              <div
                key={index}
                className="bg-gradient-card border border-border/10 rounded-xl overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <button
                  onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-primary/5 transition-smooth"
                >
                  <h3 className="text-lg font-semibold text-foreground pr-4">
                    {item.question}
                  </h3>
                  {expandedItem === index ? (
                    <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                
                {expandedItem === index && (
                  <div className="px-6 pb-4">
                    <div className="pt-2 border-t border-border/10">
                      <p className="text-muted-foreground leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 sm:py-20">
          <div className="text-center">
            <div className="bg-gradient-card border border-border/10 rounded-2xl p-8 max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-6">
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                Still have questions?
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Can't find the answer you're looking for? Our support team is here to help you with any questions about BravoMail.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center px-6 py-3 bg-gradient-primary text-white font-medium rounded-xl hover:shadow-glow transition-smooth"
              >
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;