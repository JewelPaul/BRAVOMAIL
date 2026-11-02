import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-8 py-12">
        <Card className="max-w-4xl mx-auto bg-gradient-card border-border/20 shadow-intense">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Privacy Policy
            </CardTitle>
            <p className="text-muted-foreground text-lg mt-4">
              Last updated: July 2025
            </p>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                BravoMail ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our temporary email service.
              </p>
            </section>

            <Separator className="bg-border/20" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">2. Our Privacy-First Approach</h2>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                <h3 className="font-semibold text-primary mb-4 text-lg">Disposable Email Architecture:</h3>
                <p className="text-foreground font-semibold leading-relaxed mb-4">
                  BravoMail is designed to protect your primary email address from spam and unwanted marketing. We do not require registration, personal details, passwords, or persistent tracking profiles to use temporary mailboxes.
                </p>
                <div className="space-y-3 text-muted-foreground">
                  <p>• We do not track or profile individual users.</p>
                  <p>• Temporary email addresses are generated anonymously for short-term use.</p>
                  <p>• Email messages are held temporarily by upstream disposable mail infrastructure and expire automatically.</p>
                  <p>• Users can manually delete their temporary mailbox and messages at any time.</p>
                  <p>• Please do not use temporary mailboxes for critical accounts, banking, or sensitive personal communications, as disposable domains are shared and temporary.</p>
                </div>
              </div>
            </section>

            <Separator className="bg-border/20" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">3. How We Provide Our Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Since we do not collect any personal information, we provide our temporary email service through:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Anonymous temporary email generation without user tracking</li>
                <li>Automatic email deletion after 10 minutes with no data retention</li>
                <li>Complete privacy protection with no logging or monitoring</li>
                <li>Service delivery without any user identification or profiling</li>
                <li>No analytics, cookies, or tracking technologies of any kind</li>
              </ul>
            </section>

            <Separator className="bg-border/20" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">4. Data Retention and Deletion</h2>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <h3 className="font-semibold text-primary mb-2">Our Privacy-First Approach:</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• Temporary emails automatically expire after 10 minutes</p>
                  <p>• All email content is permanently deleted upon expiration</p>
                  <p>• No personal data is stored beyond operational requirements</p>
                  <p>• Usage logs are anonymized and retained for security purposes only</p>
                </div>
              </div>
            </section>

            <Separator className="bg-border/20" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">5. Information Sharing and Disclosure</h2>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-foreground font-semibold leading-relaxed">
                  <strong>No information is ever shared with any third party.</strong>
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Since we do not collect, store, or retain any personal information, we have no data to share, sell, trade, or transfer to any third parties under any circumstances. This includes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>No data sharing for legal processes (as no data exists to share)</li>
                <li>No data sharing for security purposes (as no data is collected)</li>
                <li>No data sharing with your consent (as no data exists)</li>
                <li>Complete isolation from any third-party services or analytics</li>
              </ul>
            </section>

            <Separator className="bg-border/20" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">6. Security Measures</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Automated data purging systems</li>
                <li>Continuous monitoring for security threats</li>
              </ul>
            </section>

            <Separator className="bg-border/20" />


            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">7. Cookies and Tracking</h2>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-foreground font-semibold leading-relaxed">
                  <strong>We do not use cookies, trackers, or analytics of any kind.</strong>
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                BravoMail operates completely without cookies, tracking pixels, analytics scripts, or any form of user monitoring technology. We do not track, log, or monitor user behavior in any manner.
              </p>
            </section>

            <Separator className="bg-border/20" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">8. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.
              </p>
            </section>

            <Separator className="bg-border/20" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">9. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. Your continued use of our service after any changes constitutes acceptance of the new Privacy Policy.
              </p>
            </section>

            <Separator className="bg-border/20" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">10. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us through our contact form on the website.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;