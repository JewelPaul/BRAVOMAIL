import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Mail, Clock, Shield, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mailApi, EmailAccount } from "@/services/mailApi";

interface EmailGeneratorProps {
  onEmailChange?: (account: EmailAccount | null) => void;
}

const EmailGenerator = ({ onEmailChange }: EmailGeneratorProps) => {
  const [currentAccount, setCurrentAccount] = useState<EmailAccount | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [apiMode, setApiMode] = useState<'mock' | 'real'>('mock');
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiHealthy, setApiHealthy] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Initialize API and generate initial email on component mount
  useEffect(() => {
    const initializeApp = async () => {
      setIsInitializing(true);
      setApiMode(mailApi.getApiMode());
      
      try {
        // Initialize the mail API connection
        await mailApi.initializeConnection();
        
        // Check API health
        const healthy = await mailApi.checkApiHealth();
        setApiHealthy(healthy);
        
        // Always attempt to generate initial email, regardless of API health
        // This ensures users get an immediate email address on page load
        try {
          await generateNewEmail(true); // Allow during initialization
        } catch (emailError) {
          console.warn('Initial email generation failed:', emailError);
          // If initial generation fails, show a professional message
          setError("Click the New Email button above to generate your address.");
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
        // Even if initialization fails, try to generate an email
        try {
          await generateNewEmail(true); // Allow during initialization
        } catch (emailError) {
          console.warn('Fallback email generation failed:', emailError);
          setError("Click the New Email button above to generate your address.");
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty dependency array for initial mount only

  const retryConnection = async () => {
    setError("");
    setIsInitializing(true);
    setRetryCount(prev => prev + 1);
    
    try {
      // Re-initialize the connection
      await mailApi.initializeConnection();
      
      // Check API health again
      const healthy = await mailApi.checkApiHealth();
      setApiHealthy(healthy);
      
      if (healthy || mailApi.getApiMode() === 'mock') {
        // Try to generate email again
        await generateNewEmail();
        toast({
          title: "Connection restored!",
          description: "Email service is now available.",
        });
      } else {
        setError("Email service is still unavailable. Please try again later.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Connection retry failed";
      setError(errorMessage);
      toast({
        title: "Retry failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const generateNewEmail = async (allowDuringInit = false) => {
    if (isInitializing && !allowDuringInit) return; // Don't allow generation during initialization unless explicitly allowed
    
    setIsGenerating(true);
    setError("");
    
    try {
      // Delete previous account if exists
      if (currentAccount) {
        await mailApi.deleteAccount();
      }
      
      // Create new account
      const newAccount = await mailApi.createAccount();
      setCurrentAccount(newAccount);
      onEmailChange?.(newAccount);
      
      // Update API health status
      setApiHealthy(true);
      
      // Only show toast notification if not during initialization
      if (!isInitializing) {
        toast({
          title: "New email generated!",
          description: "Your temporary email is ready to use.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate email";
      setError(errorMessage);
      setApiHealthy(false);
      
      // Only show toast notification if not during initialization
      if (!isInitializing) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      // Re-throw error so it can be caught by initialization code
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!currentAccount) return;
    
    try {
      await navigator.clipboard.writeText(currentAccount.address);
      toast({
        title: "Copied!",
        description: "Email address copied to clipboard.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Hero Section */}
      <div className="text-center space-y-4 sm:space-y-6 animate-slide-up">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-primary rounded-full shadow-glow mb-4">
          <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent leading-tight">
          Instant Temporary Email
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
          Generate unlimited temporary email addresses instantly. Keep your real email private and secure from spam.
        </p>
      </div>

      {/* Email Generator Card */}
      <Card className="bg-gradient-card border-border/20 shadow-intense">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">Your Temporary Email</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2">
                <p className="text-sm sm:text-base text-muted-foreground">Valid for 10 minutes</p>
                <span className="hidden sm:inline text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  {apiMode === 'real' ? (
                    apiHealthy ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                          Real Email Service
                        </Badge>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                          Service Unavailable
                        </Badge>
                      </>
                    )
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                        Demo Mode
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                {!apiHealthy && apiMode === 'real' && (
                  <Button
                    onClick={retryConnection}
                    variant="outline"
                    size="sm"
                    disabled={isInitializing}
                    className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground w-full sm:w-auto"
                  >
                    <RotateCcw className={`w-3 h-3 mr-1 ${isInitializing ? 'animate-spin' : ''}`} />
                    Retry
                  </Button>
                )}
              </div>
            )}

            {/* Email Display */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  value={
                    isInitializing 
                      ? "Initializing..." 
                      : currentAccount?.address || "Generating..."
                  }
                  readOnly
                  className="text-sm sm:text-lg font-mono text-center bg-background/50 border-border/20 focus:border-primary transition-smooth h-12 sm:h-14"
                />
                <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-md pointer-events-none" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  disabled={!currentAccount || isGenerating || isInitializing}
                  className="bg-background/50 border-border/20 hover:bg-primary/10 transition-smooth flex-1 sm:flex-none h-12 sm:h-14 min-w-0"
                >
                  <Copy className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Copy</span>
                </Button>
                <Button
                  onClick={generateNewEmail}
                  disabled={isGenerating || isInitializing}
                  className="bg-gradient-primary hover:shadow-glow transition-smooth flex-1 sm:flex-none h-12 sm:h-14 min-w-0"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 flex-shrink-0 ${(isGenerating || isInitializing) ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline truncate">{isInitializing ? 'Starting...' : isGenerating ? 'Generating...' : 'New Email'}</span>
                  <span className="sm:hidden truncate">{isInitializing ? 'Starting...' : isGenerating ? 'Gen...' : 'New'}</span>
                </Button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6">
              <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg bg-background/30 border border-border/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Auto-Expiry</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Emails auto-delete after 10 minutes</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg bg-background/30 border border-border/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Privacy First</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">No registration or personal data</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg bg-background/30 border border-border/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Unlimited</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Generate as many as you need</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailGenerator;