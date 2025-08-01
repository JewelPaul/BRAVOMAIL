import { useState } from "react";
import Header from "@/components/Header";
import EmailGenerator from "@/components/EmailGenerator";
import EmailInbox from "@/components/EmailInbox";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import { EmailAccount } from "@/services/mailApi";

const Index = () => {
  const [currentAccount, setCurrentAccount] = useState<EmailAccount | null>(null);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16">
        {/* Hero & Email Generator */}
        <section className="text-center">
          <EmailGenerator onEmailChange={setCurrentAccount} />
        </section>

        {/* Email Inbox */}
        <section>
          <EmailInbox currentAccount={currentAccount} />
        </section>

        {/* Features Section */}
        <Features />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
