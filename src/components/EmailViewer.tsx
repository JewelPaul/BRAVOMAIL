import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Copy, Check, KeyRound, Trash2, Eye, FileText } from 'lucide-react';
import { EmailContent } from '@/services/mailApi';
import { useToast } from '@/hooks/use-toast';
import { detectOTPs } from '@/utils/otpDetection';
import { sanitizeEmailHtml, formatPlainTextEmail } from '@/utils/sanitize';

interface EmailViewerProps {
  email: EmailContent;
  onBack: () => void;
  onDelete?: (id: string) => Promise<void>;
}

const EmailViewer = ({ email, onBack, onDelete }: EmailViewerProps) => {
  const [copiedOTP, setCopiedOTP] = useState<string>('');
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Detect real OTPs from the email content
  const detectedOTPs = useMemo(() => {
    const combinedContent = `${email.subject || ''}\n${email.text || ''}\n${email.intro || ''}\n${email.html || ''}`;
    return detectOTPs(combinedContent);
  }, [email]);

  // Sanitize HTML securely
  const sanitizedHtml = useMemo(() => {
    return sanitizeEmailHtml(email.html || '');
  }, [email.html]);

  // Format plain text fallback
  const formattedText = useMemo(() => {
    return formatPlainTextEmail(email.text || email.intro || '');
  }, [email.text, email.intro]);

  const handleOTPCopy = async (otpCode: string) => {
    try {
      await navigator.clipboard.writeText(otpCode);
      setCopiedOTP(otpCode);
      toast({
        title: 'OTP Copied!',
        description: `Code "${otpCode}" copied to clipboard.`,
      });
      setTimeout(() => setCopiedOTP(''), 2500);
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy OTP to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(email.id);
      toast({
        title: 'Email deleted',
        description: 'The email message has been removed.',
      });
      onBack();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete message.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card className="bg-gradient-card border-border/20 shadow-intense">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 sm:pb-6">
          <div className="flex items-center space-x-3">
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="bg-background/50 border-border/20 hover:bg-primary/10 transition-smooth"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Email Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Received {formatTimestamp(email.createdAt)}
              </p>
            </div>
          </div>

          {onDelete && (
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              className="transition-smooth"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detected OTP / Verification Banner */}
          {detectedOTPs.length > 0 ? (
            <div className="p-4 sm:p-5 bg-primary/10 border-2 border-primary/30 rounded-xl space-y-3 shadow-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-base text-foreground">
                    Verification Code Detected
                  </span>
                </div>
                <Badge variant="default" className="bg-primary text-primary-foreground text-xs uppercase">
                  {detectedOTPs[0].type}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider text-primary bg-background/80 px-4 py-2 rounded-lg border border-primary/20 select-all">
                    {detectedOTPs[0].code}
                  </div>
                  {detectedOTPs.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      +{detectedOTPs.length - 1} more detected
                    </span>
                  )}
                </div>

                <Button
                  onClick={() => handleOTPCopy(detectedOTPs[0].code)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 transition-smooth w-full sm:w-auto"
                >
                  {copiedOTP === detectedOTPs[0].code ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy OTP Code
                    </>
                  )}
                </Button>
              </div>

              {detectedOTPs[0].contextSnippet && (
                <p className="text-xs text-muted-foreground italic truncate">
                  "{detectedOTPs[0].contextSnippet}"
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-muted/40 border border-border/20 rounded-lg flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground/60" />
                No verification code detected in this message.
              </span>
            </div>
          )}

          {/* Email Headers */}
          <div className="space-y-3 p-4 bg-background/40 rounded-lg border border-border/20">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From:</label>
              <p className="text-sm font-medium">{email.from.name || email.from.address}</p>
              {email.from.name && <p className="text-xs text-muted-foreground">{email.from.address}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject:</label>
              <p className="text-base sm:text-lg font-semibold">{email.subject}</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date:</label>
              <p className="text-xs text-muted-foreground">{formatTimestamp(email.createdAt)}</p>
            </div>
          </div>

          {/* Content Controls: HTML vs Plain Text */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Message Content</h3>
              {sanitizedHtml && formattedText && (
                <div className="flex gap-1 bg-background/50 p-1 rounded-md border border-border/20">
                  <Button
                    onClick={() => setViewMode('html')}
                    variant={viewMode === 'html' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Rich HTML
                  </Button>
                  <Button
                    onClick={() => setViewMode('text')}
                    variant={viewMode === 'text' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Plain Text
                  </Button>
                </div>
              )}
            </div>

            {/* Sanitized Content Area */}
            <div className="p-4 sm:p-6 bg-background/30 rounded-lg border border-border/20 min-h-[220px] overflow-x-auto text-sm leading-relaxed">
              {viewMode === 'html' && sanitizedHtml ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert break-words email-sanitized-content"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              ) : formattedText ? (
                <div
                  className="whitespace-pre-wrap font-sans break-words"
                  dangerouslySetInnerHTML={{ __html: formattedText }}
                />
              ) : (
                <p className="text-muted-foreground italic">This message contains no readable text content.</p>
              )}
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-4 border-t border-border/20">
            <span>Email ID: {email.id}</span>
            <span>Size: {(email.size / 1024).toFixed(1)} KB</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailViewer;
