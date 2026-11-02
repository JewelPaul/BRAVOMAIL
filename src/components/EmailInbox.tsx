import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Eye, Inbox, AlertCircle, MailCheck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mailApi, EmailAccount, EmailMessage, EmailContent } from '@/services/mailApi';
import EmailViewer from './EmailViewer';

interface EmailInboxProps {
  currentAccount: EmailAccount | null;
}

const POLLING_INTERVAL_MS = 6000;

const EmailInbox = ({ currentAccount }: EmailInboxProps) => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedEmail, setSelectedEmail] = useState<EmailContent | null>(null);
  const [loadingEmailId, setLoadingEmailId] = useState<string>('');
  const isRequestInFlight = useRef(false);
  const previousEmailIds = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchEmailsSilently = useCallback(async () => {
    if (!currentAccount || isRequestInFlight.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    isRequestInFlight.current = true;
    try {
      const messages = await mailApi.getMessages();
      setError('');

      // Check for new incoming messages to notify user
      const incoming = messages.filter((m) => !previousEmailIds.current.has(m.id));
      if (previousEmailIds.current.size > 0 && incoming.length > 0) {
        toast({
          title: `New Email Received (${incoming.length})`,
          description: incoming[0].subject || 'You have received a new message.',
        });
      }

      previousEmailIds.current = new Set(messages.map((m) => m.id));
      setEmails(messages);
    } catch (err) {
      // Only set error if not unconfigured
      const msg = err instanceof Error ? err.message : 'Failed to fetch messages';
      if (!msg.includes('not configured')) {
        setError(msg);
      }
    } finally {
      isRequestInFlight.current = false;
    }
  }, [currentAccount, toast]);

  // Initial fetch and automatic polling interval
  useEffect(() => {
    if (!currentAccount) {
      setEmails([]);
      previousEmailIds.current.clear();
      setSelectedEmail(null);
      setError('');
      return;
    }

    // Reset list and fetch immediately
    fetchEmailsSilently();

    const interval = setInterval(fetchEmailsSilently, POLLING_INTERVAL_MS);

    // Refresh immediately when tab gains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchEmailsSilently();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentAccount, fetchEmailsSilently]);

  // Manual refresh button handler
  const handleManualRefresh = async () => {
    if (!currentAccount || isRefreshing) return;

    setIsRefreshing(true);
    setError('');

    try {
      const messages = await mailApi.getMessages();
      previousEmailIds.current = new Set(messages.map((m) => m.id));
      setEmails(messages);
      toast({
        title: 'Inbox updated',
        description: messages.length === 0 ? 'Inbox is empty.' : `Found ${messages.length} email(s).`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh inbox.';
      setError(msg);
      toast({
        title: 'Refresh Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEmailClick = async (email: EmailMessage) => {
    setLoadingEmailId(email.id);
    try {
      const fullContent = await mailApi.getMessage(email.id);
      setSelectedEmail(fullContent);

      // Mark seen locally
      setEmails((prev) =>
        prev.map((m) => (m.id === email.id ? { ...m, seen: true } : m))
      );
    } catch (err) {
      toast({
        title: 'Failed to load email',
        description: err instanceof Error ? err.message : 'Unable to retrieve message content.',
        variant: 'destructive',
      });
    } finally {
      setLoadingEmailId('');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    await mailApi.deleteMessage(id);
    setEmails((prev) => prev.filter((m) => m.id !== id));
    previousEmailIds.current.delete(id);
  };

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;

      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const unreadCount = emails.filter((m) => !m.seen).length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {selectedEmail ? (
        <EmailViewer
          email={selectedEmail}
          onBack={() => setSelectedEmail(null)}
          onDelete={handleDeleteMessage}
        />
      ) : (
        <Card className="bg-gradient-card border-border/20 shadow-intense">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 sm:pb-6 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Inbox className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <span>Live Inbox</span>
                  {currentAccount && (
                    <Badge variant={unreadCount > 0 ? 'default' : 'secondary'} className="text-xs">
                      {unreadCount} unread
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {currentAccount
                    ? `Listening for incoming messages on ${currentAccount.address}`
                    : 'Generate a temporary email address above to view your inbox'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button
                onClick={handleManualRefresh}
                disabled={isRefreshing || !currentAccount}
                variant="outline"
                size="sm"
                className="bg-background/50 border-border/20 hover:bg-primary/10 transition-smooth flex-1 sm:flex-none min-w-0"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="truncate">Refresh Inbox</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!currentAccount ? (
              <div className="text-center py-8 sm:py-12">
                <Inbox className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">No Active Address</h3>
                <p className="text-sm text-muted-foreground px-4">
                  Click 'New Address' above to create a disposable email address.
                </p>
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-8 sm:py-12 space-y-3">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold">Waiting for Incoming Messages</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto px-4">
                  Send an email or verification code to <span className="font-mono text-foreground font-semibold">{currentAccount.address}</span>. The inbox updates automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className={`group p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer ${
                      email.seen
                        ? 'bg-background/30 border-border/20 hover:border-border/40'
                        : 'bg-primary/5 border-primary/30 hover:border-primary/50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs sm:text-sm truncate ${email.seen ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>
                            {email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address}
                          </p>
                          {!email.seen && (
                            <Badge variant="default" className="text-xs px-2 py-0.5 bg-primary text-primary-foreground">
                              NEW
                            </Badge>
                          )}
                        </div>

                        <h4 className={`text-sm sm:text-base truncate ${email.seen ? 'font-medium text-foreground' : 'font-bold text-foreground'}`}>
                          {email.subject}
                        </h4>

                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {email.intro || '(No preview available)'}
                        </p>

                        <p className="text-xs text-muted-foreground/80 pt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(email.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 self-center">
                        {loadingEmailId === email.id ? (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-70 group-hover:opacity-100 group-hover:bg-primary/10 transition-opacity"
                            aria-label="View message"
                          >
                            {email.seen ? <Eye className="w-4 h-4" /> : <MailCheck className="w-4 h-4 text-primary" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailInbox;
