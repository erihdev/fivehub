import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Inbox, Mail, MailOpen, Trash2, Reply, ArrowRight, ArrowLeft, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useMessages, Message } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface UserOption {
  id: string;
  name: string;
  role: string;
}

const Messages = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const { inbox, sent, loading, unreadCount, sendMessage, markAsRead, deleteMessage } = useMessages();
  
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyMode, setReplyMode] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Compose form state
  const [receiverId, setReceiverId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Fetch users for recipient selection
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, role, company_name')
        .eq('status', 'approved');
      
      if (data) {
        setUsers(data.filter(u => u.user_id !== user?.id).map(u => ({
          id: u.user_id,
          name: u.company_name || u.user_id.substring(0, 8),
          role: u.role
        })));
      }
    };
    
    if (user) fetchUsers();
  }, [user]);

  const handleSend = async () => {
    if (!receiverId || !subject.trim() || !content.trim()) return;
    
    setSending(true);
    const result = await sendMessage(
      receiverId,
      subject,
      content,
      replyMode && selectedMessage ? selectedMessage.id : undefined
    );
    setSending(false);
    
    if (result) {
      setComposeOpen(false);
      setReplyMode(false);
      setReceiverId('');
      setSubject('');
      setContent('');
    }
  };

  const handleReply = (message: Message) => {
    setReplyMode(true);
    setReceiverId(message.sender_id);
    setSubject(`Re: ${message.subject}`);
    setSelectedMessage(message);
    setComposeOpen(true);
  };

  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.is_read && message.receiver_id === user?.id) {
      await markAsRead(message.id);
    }
  };

  const filteredInbox = inbox.filter(m => 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSent = sent.filter(m => 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', {
      locale: language === 'ar' ? ar : enUS
    });
  };

  const getRoleBadge = (role: string) => {
    const labels: Record<string, string> = {
      supplier: language === 'ar' ? 'مورد' : 'Supplier',
      roaster: language === 'ar' ? 'محمصة' : 'Roaster',
      admin: language === 'ar' ? 'مدير' : 'Admin'
    };
    return labels[role] || role;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-arabic" dir={dir}>
      {/* Page Title */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Button>
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">
              {language === 'ar' ? 'الرسائل' : 'Messages'}
            </h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setReplyMode(false); setSubject(''); setContent(''); }}>
                <Plus className="h-4 w-4 me-2" />
                {language === 'ar' ? 'رسالة جديدة' : 'New Message'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {replyMode 
                    ? (language === 'ar' ? 'رد على الرسالة' : 'Reply to Message')
                    : (language === 'ar' ? 'رسالة جديدة' : 'New Message')
                  }
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{language === 'ar' ? 'المستلم' : 'Recipient'}</Label>
                  <Select value={receiverId} onValueChange={setReceiverId} disabled={replyMode}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر المستلم' : 'Select recipient'} />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({getRoleBadge(u.role)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{language === 'ar' ? 'الموضوع' : 'Subject'}</Label>
                  <Input 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    placeholder={language === 'ar' ? 'موضوع الرسالة' : 'Message subject'}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{language === 'ar' ? 'المحتوى' : 'Content'}</Label>
                  <Textarea 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                    placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                    rows={5}
                  />
                </div>
                <Button onClick={handleSend} disabled={sending || !receiverId || !subject.trim() || !content.trim()}>
                  <Send className="h-4 w-4 me-2" />
                  {sending 
                    ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                    : (language === 'ar' ? 'إرسال' : 'Send')
                  }
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="inbox" className="w-full">
                  <TabsList className="w-full rounded-none border-b">
                    <TabsTrigger value="inbox" className="flex-1">
                      <Inbox className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'الوارد' : 'Inbox'}
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="ms-2 text-xs">{unreadCount}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex-1">
                      <Send className="h-4 w-4 me-2" />
                      {language === 'ar' ? 'المرسل' : 'Sent'}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="inbox" className="m-0">
                    <div className="max-h-[500px] overflow-y-auto divide-y">
                      {filteredInbox.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>{language === 'ar' ? 'لا توجد رسائل' : 'No messages'}</p>
                        </div>
                      ) : (
                        filteredInbox.map(message => (
                          <div
                            key={message.id}
                            onClick={() => handleMessageClick(message)}
                            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedMessage?.id === message.id ? 'bg-muted' : ''
                            } ${!message.is_read ? 'bg-primary/5' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {message.is_read ? (
                                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Mail className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${!message.is_read ? 'font-semibold' : ''}`}>
                                  {message.subject}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                  {message.content.substring(0, 50)}...
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDate(message.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="sent" className="m-0">
                    <div className="max-h-[500px] overflow-y-auto divide-y">
                      {filteredSent.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>{language === 'ar' ? 'لا توجد رسائل مرسلة' : 'No sent messages'}</p>
                        </div>
                      ) : (
                        filteredSent.map(message => (
                          <div
                            key={message.id}
                            onClick={() => setSelectedMessage(message)}
                            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedMessage?.id === message.id ? 'bg-muted' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{message.subject}</p>
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {message.content.substring(0, 50)}...
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDate(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              {selectedMessage ? (
                <>
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                        <CardDescription className="mt-1">
                          {formatDate(selectedMessage.created_at)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedMessage.receiver_id === user?.id && (
                          <Button variant="outline" size="sm" onClick={() => handleReply(selectedMessage)}>
                            <Reply className="h-4 w-4 me-2" />
                            {language === 'ar' ? 'رد' : 'Reply'}
                          </Button>
                        )}
                        {selectedMessage.sender_id === user?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              deleteMessage(selectedMessage.id);
                              setSelectedMessage(null);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'ar' ? 'اختر رسالة لعرضها' : 'Select a message to view'}</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Messages;
