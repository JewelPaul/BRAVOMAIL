import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Copy,
  RefreshCw,
  Mail,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Server,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mailApi, EmailAccount, BackendNotConfiguredError } from '@/services/mailApi';

interface EmailGeneratorProps {
  onEmailChange?: (account: EmailAccount | null) => void;
}

const EmailGenerator = ({ onEmailChange }: EmailGeneratorProps) => {
  const [currentAccount, setCurrentAccount] = useState<EmailAccount | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiHealthy, setApiHealthy] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const { toast } = useToast();

  // Expiration countdown
  useEffect(() => {
    if (!currentAccount?.expiresAt) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const remainingMs = new Date(currentAccount.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeRemaining('Expired');
        setCurrentAccount(null);
        onEmailChange?.(null);
      } else {
        const mins = Math.floor(remainingMs / (60 * 1000));
        const secs = Math.floor((remainingMs % (60 * 1000)) / 1000);
        setTimeRemaining(`${mins}m ${secs.toString().padStart(2, '0')}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentAccount, onEmailChange]);

  const generateNewEmail = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError('');

    try {
      // Clean up previous account if present
      if (currentAccount) {
        try {
          await mailApi.deleteAccount();
        } catch {
          // Ignore deletion error of expired account
        }
      }

      const newAccount = await mailApi.createAccount();
      setCurrentAccount(newAccount);
      onEmailChange?.(newAccount);
      setApiHealthy(true);

      toast({
        title: 'New temporary email ready!',
        description: newAccount.address,
      });
    } catch (err) {
      if (err instanceof BackendNotConfiguredError) {
        setIsConfigured(false);
        setError(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to generate temporary email.';
        setError(msg);
        setApiHealthy(false);
        toast({
          title: 'Generation Failed',
          description: msg,
          variant: 'destructive',
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [currentAccount, isGenerating, onEmailChange, toast]);

  // Initial mount health check & account initialization
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      setIsInitializing(true);
      setError('');

      if (!mailApi.isConfigured()) {
        if (isMounted) {
          setIsConfigured(false);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const health = await mailApi.checkApiHealth();
        if (!isMounted) return;

        setApiHealthy(health.healthy);

        if (health.healthy) {
          // Check if restored session exists
          const existing = mailApi.getCurrentAccount();
          if (existing) {
            setCurrentAccount(existing);
            onEmailChange?.(existing);
          } else {
            await generateNewEmail();
          }
        } else {
          setError(health.message || 'Email service is currently unavailable.');
        }
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof BackendNotConfiguredError) {
          setIsConfigured(false);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to connect to email backend.');
          setApiHealthy(false);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryConnection = async () => {
    setIsInitializing(true);
    setError('');

    try {
      const health = await mailApi.checkApiHealth();
      setApiHealthy(health.healthy);

      if (health.healthy) {
        setIsConfigured(true);
        await generateNewEmail();
        toast({
          title: 'Connected',
          description: 'Successfully connected to BravoMail backend.',
        });
      } else {
        setError(health.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed.');
    } finally {
      setIsInitializing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!currentAccount) return;
    try {
      await navigator.clipboard.writeText(currentAccount.address);
      toast({
        title: 'Copied!',
        description: 'Temporary email address copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy email address.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentAccount || isDeleting) return;
    setIsDeleting(true);

    try {
      await mailApi.deleteAccount();
      setCurrentAccount(null);
      onEmailChange?.(null);
      toast({
        title: 'Email Address Deleted',
        description: 'Your temporary address and associated messages have been removed.',
      });
    } catch (err) {
      toast({
        title: 'Deletion Failed',
        description: err instanceof Error ? err.message : 'Failed to delete account.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Hero Section */}
      <div className="text-center space-y-4 sm:space-y-6 animate-slide-up">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-primary rounded-full shadow-glow mb-2 sm:mb-4">
          <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-hero bg-clip-text text-transparent leading-tight">
          Instant Temporary Email
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
          Generate live, disposable email addresses instantly. Protect your personal inbox from spam, trackers, and data breaches.
        </p>
      </div>

      {/* Backend Setup Notice if Not Configured */}
      {!isConfigured && (
        <Card className="border-amber-500/30 bg-amber-500/10 text-left p-4 sm:p-6 rounded-xl shadow-md">
          <div className="flex items-start gap-3">
            <Server className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">Backend Service Required</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                BravoMail uses a secure, dedicated backend server to communicate with the mail provider without exposing private credentials or relying on insecure public proxies.
              </p>
              <div className="p-3 bg-background/80 rounded-lg border border-border/20 text-xs font-mono text-muted-foreground">
                Set <span className="text-primary font-bold">VITE_API_BASE_URL</span> to your deployed backend URL (e.g. <code>https://your-bravomail-api.onrender.com</code> or <code>http://localhost:3001</code>).
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <Button
                  onClick={retryConnection}
                  variant="outline"
                  size="sm"
                  disabled={isInitializing}
                  className="h-8 text-xs"
                >
                  <RotateCcw className={`w-3 h-3 mr-1 ${isInitializing ? 'animate-spin' : ''}`} />
                  Check Connection
                </Button>
                <a
                  href="https://github.com/JewelPaul/BRAVOMAIL#backend-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-primary hover:underline px-2 py-1"
                >
                  Backend Deployment Guide
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Email Generator Card */}
      <Card className="bg-gradient-card border-border/20 shadow-intense">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">Your Temporary Email Address</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2">
                <p className="text-sm sm:text-base text-muted-foreground">
                  {timeRemaining ? `Expires in ${timeRemaining}` : 'Temporary session'}
                </p>
                <span className="hidden sm:inline text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  {apiHealthy ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                        Live Email Service
                      </Badge>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                        {isConfigured ? 'Service Unavailable' : 'Backend Unconfigured'}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && isConfigured && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                {!apiHealthy && (
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

            {/* Email Address Display Input and Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  value={
                    isInitializing
                      ? 'Connecting to service...'
                      : currentAccount?.address || (!isConfigured ? 'Backend not configured' : error ? 'Service unavailable' : 'Ready to generate')
                  }
                  readOnly
                  className="text-sm sm:text-lg font-mono text-center bg-background/50 border-border/20 focus:border-primary transition-smooth h-12 sm:h-14 font-semibold"
                />
                <div className="absolute inset-0 bg-gradient-primary opacity-10 rounded-md pointer-events-none" />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  disabled={!currentAccount || isGenerating || isInitializing}
                  className="bg-background/50 border-border/20 hover:bg-primary/10 transition-smooth flex-1 sm:flex-none h-12 sm:h-14 min-w-[90px]"
                >
                  <Copy className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Copy</span>
                </Button>

                <Button
                  onClick={generateNewEmail}
                  disabled={isGenerating || isInitializing || !isConfigured}
                  className="bg-gradient-primary hover:shadow-glow transition-smooth flex-1 sm:flex-none h-12 sm:h-14 min-w-[120px]"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 flex-shrink-0 ${isGenerating || isInitializing ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Generating...' : currentAccount ? 'New Address' : 'Generate'}</span>
                </Button>

                {currentAccount && (
                  <Button
                    onClick={handleDeleteAccount}
                    variant="destructive"
                    disabled={isDeleting || isGenerating}
                    className="h-12 sm:h-14 px-3 sm:px-4"
                    title="Delete temporary address"
                  >
                    <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>

            {/* Features Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6">
              <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg bg-background/30 border border-border/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Auto-Expiry</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Addresses auto-expire cleanly</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg bg-background/30 border border-border/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Zero Trackers</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">No accounts or personal data</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 sm:p-4 rounded-lg bg-background/30 border border-border/10">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base">Real Inbound</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Genuine live email receipt</p>
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
