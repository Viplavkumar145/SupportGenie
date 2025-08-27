import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { 
  MessageCircle, 
  Upload, 
  BarChart3, 
  Settings, 
  Send, 
  Bot, 
  User, 
  Clock, 
  Users, 
  TrendingUp,
  FileText,
  Trash2,
  Zap,
  Globe,
  Mail,
  MessageSquare,
  Smartphone
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  // State management
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [brandTone, setBrandTone] = useState("friendly");
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [uploadFile, setUploadFile] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial data
  useEffect(() => {
    loadKnowledgeBase();
    loadAnalytics();
  }, []);

  // API Functions
  const sendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      message: currentMessage,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API}/chat`, {
        message: currentMessage,
        session_id: sessionId,
        brand_tone: brandTone
      });
      
      const aiMessage = {
        id: Date.now().toString() + "_ai",
        message: response.data.message,
        sender: "ai",
        timestamp: new Date().toISOString(),
        escalated: response.data.escalated
      };
      
      setMessages(prev => [...prev, aiMessage]);
      loadAnalytics(); // Refresh analytics after each conversation
      
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        id: Date.now().toString() + "_error",
        message: "Sorry, I'm having trouble connecting right now. Please try again.",
        sender: "ai",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadKnowledgeBase = async () => {
    if (!uploadFile) return;
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    
    try {
      await axios.post(`${API}/knowledge-base/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setUploadFile(null);
      loadKnowledgeBase();
      alert("Knowledge base updated successfully!");
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    }
  };

  const loadKnowledgeBase = async () => {
    try {
      const response = await axios.get(`${API}/knowledge-base`);
      setKnowledgeBase(response.data);
    } catch (error) {
      console.error("Error loading knowledge base:", error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const deleteKnowledgeItem = async (id) => {
    try {
      await axios.delete(`${API}/knowledge-base/${id}`);
      loadKnowledgeBase();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Demo messages for empty state
  const demoMessages = [
    { sender: "user", message: "Hi! I need help with my order status.", timestamp: new Date().toISOString() },
    { sender: "ai", message: "Hello! I'd be happy to help you check your order status. Could you please provide your order number?", timestamp: new Date().toISOString() },
    { sender: "user", message: "It's #ORD-12345", timestamp: new Date().toISOString() },
    { sender: "ai", message: "Thank you! I can see your order #ORD-12345 is currently being processed and will ship within 2 business days. You'll receive a tracking email once it's dispatched. Is there anything else I can help you with?", timestamp: new Date().toISOString() }
  ];

  const displayMessages = messages.length > 0 ? messages : demoMessages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-teal-600 rounded-xl flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-800 to-teal-700 bg-clip-text text-transparent">
              SupportGenie
            </h1>
          </div>
          <p className="text-gray-600 text-lg">AI-Powered Customer Support That Never Sleeps</p>
        </div>

        {/* Main Dashboard */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Live Chat
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Chat Preview - Main Area */}
              <Card className="lg:col-span-2 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Live Chat Preview
                    {messages.length === 0 && (
                      <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800">Demo Mode</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Messages Area */}
                  <div className="h-96 overflow-y-auto p-4 space-y-4">
                    {displayMessages.map((msg, index) => (
                      <div key={msg.id || index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start gap-2 max-w-xs ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.sender === 'user' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-teal-100 text-teal-600'
                          }`}>
                            {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                          </div>
                          <div className={`rounded-2xl px-4 py-2 ${
                            msg.sender === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-800 border'
                          }`}>
                            <p className="text-sm">{msg.message}</p>
                            {msg.escalated && (
                              <Badge variant="outline" className="mt-2 text-xs bg-orange-50 text-orange-600 border-orange-200">
                                Escalated to Human
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2">
                          <Bot className="w-4 h-4 text-teal-600" />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Input Area */}
                  <div className="p-4 border-t bg-gray-50/50">
                    <div className="flex gap-2">
                      <Textarea
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message here..."
                        className="resize-none border-gray-200 focus:border-blue-400 bg-white"
                        rows={1}
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={isLoading || !currentMessage.trim()}
                        className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Control Panel */}
              <div className="space-y-6">
                {/* Brand Tone Settings */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Brand Tone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={brandTone} onValueChange={setBrandTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">🌟 Friendly</SelectItem>
                        <SelectItem value="formal">🎩 Formal</SelectItem>
                        <SelectItem value="casual">😎 Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Channel Integration */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Multi-Channel Support</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <Globe className="w-6 h-6 text-green-600 mb-1" />
                        <span className="text-sm font-medium text-green-800">Website</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Mail className="w-6 h-6 text-blue-600 mb-1" />
                        <span className="text-sm font-medium text-blue-800">Email</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <MessageSquare className="w-6 h-6 text-green-600 mb-1" />
                        <span className="text-sm font-medium text-green-800">WhatsApp</span>
                      </div>
                      <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <Smartphone className="w-6 h-6 text-purple-600 mb-1" />
                        <span className="text-sm font-medium text-purple-800">Slack</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Launch */}
                <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-600 to-teal-600 text-white">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <Zap className="w-8 h-8 mx-auto" />
                      <h3 className="font-bold text-lg">Ready to Launch!</h3>
                      <p className="text-blue-100 text-sm">Your SupportGenie is trained and ready to help customers 24/7</p>
                      <Button className="w-full bg-white text-blue-600 hover:bg-gray-100">
                        🚀 Launch SupportGenie
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload Section */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Knowledge Base
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Upload FAQs, Documentation, or Support Content</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".txt,.csv,.pdf"
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">Supported formats: TXT, CSV, PDF</p>
                  </div>
                  <Button 
                    onClick={uploadKnowledgeBase} 
                    disabled={!uploadFile}
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Train AI
                  </Button>
                </CardContent>
              </Card>

              {/* Current Knowledge Base */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Current Knowledge Base
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {knowledgeBase.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {knowledgeBase.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">{item.filename}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteKnowledgeItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Conversations</p>
                      <p className="text-3xl font-bold">{analytics.total_conversations || 0}</p>
                    </div>
                    <MessageCircle className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-teal-600 to-teal-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-teal-100 text-sm">AI Handled</p>
                      <p className="text-3xl font-bold">{analytics.ai_handled || 0}</p>
                    </div>
                    <Bot className="w-8 h-8 text-teal-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Escalated</p>
                      <p className="text-3xl font-bold">{analytics.escalated || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-green-600 to-green-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Time Saved</p>
                      <p className="text-3xl font-bold">{analytics.time_saved_hours || 0}h</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Automation Rate</span>
                    <span className="text-sm text-green-600 font-bold">
                      {analytics.total_conversations ? 
                        Math.round((analytics.ai_handled / analytics.total_conversations) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Avg Response Time</span>
                    <span className="text-sm text-blue-600 font-bold">{analytics.avg_response_time || 0.8}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Customer Satisfaction</span>
                    <span className="text-sm text-yellow-600 font-bold">★ {analytics.satisfaction_score || 4.6}/5</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Business Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="text-2xl font-bold text-green-800">${Math.round((analytics.time_saved_hours || 0) * 25)}</h3>
                    <p className="text-green-600 text-sm">Cost Savings (Est.)</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-2xl font-bold text-blue-800">24/7</h3>
                    <p className="text-blue-600 text-sm">Availability</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="brand-tone">Default Brand Tone</Label>
                  <Select value={brandTone} onValueChange={setBrandTone}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly & Warm</SelectItem>
                      <SelectItem value="formal">Professional & Formal</SelectItem>
                      <SelectItem value="casual">Casual & Relaxed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="escalation-keywords">Escalation Keywords</Label>
                  <Textarea
                    id="escalation-keywords"
                    placeholder="Enter keywords that should trigger human escalation (e.g., refund, complaint, manager, cancel subscription)"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Button className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700">
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;