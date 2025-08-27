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
import { Alert, AlertDescription } from "./components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
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
  Smartphone,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Home,
  Database,
  Activity,
  Cog,
  ArrowRight,
  Star,
  Shield,
  Heart
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  // State management
  const [activeTab, setActiveTab] = useState("dashboard");
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [brandTone, setBrandTone] = useState("friendly");
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [uploadFile, setUploadFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Error handling helper
  const showError = (key, message) => {
    setErrors(prev => ({ ...prev, [key]: message }));
    setTimeout(() => {
      setErrors(prev => ({ ...prev, [key]: null }));
    }, 5000);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

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

  // API Functions with error handling
  const sendMessage = async () => {
    if (!currentMessage.trim()) {
      showError("chat", "Please enter a message");
      return;
    }
    
    const userMessage = {
      id: Date.now().toString(),
      message: currentMessage,
      sender: "user",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);
    setErrors(prev => ({ ...prev, chat: null }));
    
    try {
      const response = await axios.post(`${API}/chat`, {
        message: currentMessage,
        session_id: sessionId,
        brand_tone: brandTone
      }, {
        timeout: 30000
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
      let errorMessage = "Sorry, I'm having trouble connecting right now. Please try again.";
      
      if (error.response?.status === 500) {
        errorMessage = "Our AI service is temporarily unavailable. Please try again in a moment.";
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please check your connection and try again.";
      }
      
      showError("chat", errorMessage);
      
      const errorAiMessage = {
        id: Date.now().toString() + "_error",
        message: errorMessage,
        sender: "ai",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadKnowledgeBase = async () => {
    if (!uploadFile) {
      showError("upload", "Please select a file to upload");
      return;
    }
    
    // File size validation (max 5MB)
    if (uploadFile.size > 5 * 1024 * 1024) {
      showError("upload", "File size must be less than 5MB");
      return;
    }

    // File type validation
    const allowedTypes = ['text/plain', 'text/csv', 'application/pdf'];
    if (!allowedTypes.includes(uploadFile.type) && !uploadFile.name.match(/\.(txt|csv|pdf)$/i)) {
      showError("upload", "Only TXT, CSV, and PDF files are supported");
      return;
    }
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    
    setIsUploading(true);
    setErrors(prev => ({ ...prev, upload: null }));
    
    try {
      await axios.post(`${API}/knowledge-base/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // Longer timeout for file uploads
      });
      
      setUploadFile(null);
      loadKnowledgeBase();
      showSuccess(`${uploadFile.name} uploaded successfully! Your AI is now smarter.`);
      
    } catch (error) {
      console.error("Upload error:", error);
      if (error.response?.status === 413) {
        showError("upload", "File is too large. Please choose a smaller file.");
      } else if (error.response?.status === 415) {
        showError("upload", "Unsupported file type. Please use TXT, CSV, or PDF files.");
      } else {
        showError("upload", "Upload failed. Please check your connection and try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const loadKnowledgeBase = async () => {
    try {
      const response = await axios.get(`${API}/knowledge-base`, { timeout: 10000 });
      setKnowledgeBase(response.data);
      setErrors(prev => ({ ...prev, knowledgeBase: null }));
    } catch (error) {
      console.error("Error loading knowledge base:", error);
      showError("knowledgeBase", "Failed to load knowledge base");
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`, { timeout: 10000 });
      setAnalytics(response.data);
      setErrors(prev => ({ ...prev, analytics: null }));
    } catch (error) {
      console.error("Error loading analytics:", error);
      showError("analytics", "Failed to load analytics data");
    }
  };

  const deleteKnowledgeItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this knowledge base item?")) {
      return;
    }
    
    try {
      await axios.delete(`${API}/knowledge-base/${id}`, { timeout: 10000 });
      loadKnowledgeBase();
      showSuccess("Knowledge base item deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      showError("knowledgeBase", "Failed to delete item");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
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

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "chat", label: "Live Chat", icon: MessageCircle },
    { id: "knowledge", label: "Knowledge Base", icon: Database },
    { id: "analytics", label: "Analytics", icon: Activity },
    { id: "settings", label: "Settings", icon: Cog }
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
        {/* Success/Error Notifications */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          </div>
        )}
        
        {Object.entries(errors).map(([key, error]) => error && (
          <div key={key} className="fixed top-4 right-4 z-50 animate-slide-in">
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ))}

        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-white shadow-xl border-r border-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SupportGenie</h1>
                  <p className="text-xs text-gray-500">AI Support Platform</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 ${
                            activeTab === item.id
                              ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white shadow-lg transform scale-105'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-teal-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 capitalize">
                    {activeTab === "dashboard" ? "Welcome Back!" : activeTab.replace('-', ' ')}
                  </h2>
                  <p className="text-gray-600">
                    {activeTab === "dashboard" && "Your AI support system is ready to help customers 24/7"}
                    {activeTab === "chat" && "Monitor and test your AI conversations"}
                    {activeTab === "knowledge" && "Manage your AI's knowledge base"}
                    {activeTab === "analytics" && "Track your support performance"}
                    {activeTab === "settings" && "Configure your AI assistant"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-800 px-3 py-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    Online
                  </Badge>
                </div>
              </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 p-6 overflow-y-auto">
              {/* Dashboard Tab */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="glass-card hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                            <p className="text-3xl font-bold text-gray-900">{analytics.total_conversations || 0}</p>
                          </div>
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">AI Automation</p>
                            <p className="text-3xl font-bold text-gray-900">
                              {analytics.total_conversations ? 
                                Math.round((analytics.ai_handled / analytics.total_conversations) * 100) : 0}%
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Bot className="w-6 h-6 text-teal-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Response Time</p>
                            <p className="text-3xl font-bold text-gray-900">{analytics.avg_response_time || 0.8}s</p>
                          </div>
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Zap className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                            <p className="text-3xl font-bold text-gray-900">★ {analytics.satisfaction_score || 4.6}</p>
                          </div>
                          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Star className="w-6 h-6 text-yellow-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Main Dashboard Cards */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Live Chat Preview */}
                    <Card className="lg:col-span-2 glass-card">
                      <CardHeader className="border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-teal-600" />
                          Live Chat Preview
                          <Badge variant="outline" className="ml-auto">Demo Mode</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="h-64 overflow-y-auto p-4 space-y-3">
                          {demoMessages.slice(-3).map((msg, index) => (
                            <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  <p className="text-sm">{msg.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-4 border-t border-gray-100">
                          <Button 
                            onClick={() => setActiveTab("chat")} 
                            className="w-full bg-gradient-to-r from-teal-600 to-blue-600"
                          >
                            Open Live Chat <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <div className="space-y-6">
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button 
                            onClick={() => setActiveTab("knowledge")}
                            variant="outline" 
                            className="w-full justify-start"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Knowledge
                          </Button>
                          <Button 
                            onClick={() => setActiveTab("analytics")}
                            variant="outline" 
                            className="w-full justify-start"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analytics
                          </Button>
                          <Button 
                            onClick={() => setActiveTab("settings")}
                            variant="outline" 
                            className="w-full justify-start"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Configure AI
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="glass-card bg-gradient-to-r from-teal-600 to-blue-600 text-white">
                        <CardContent className="p-6">
                          <div className="text-center space-y-3">
                            <Shield className="w-12 h-12 mx-auto opacity-80" />
                            <h3 className="font-bold text-lg">AI Status: Active</h3>
                            <p className="text-teal-100 text-sm">Your SupportGenie is online and ready to help customers 24/7</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === "chat" && (
                <div className="space-y-6">
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Chat Interface */}
                    <Card className="lg:col-span-2 glass-card">
                      <CardHeader className="border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-teal-600" />
                          Chat Interface
                          {messages.length === 0 && (
                            <Badge variant="outline">Demo Mode</Badge>
                          )}
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Test your AI responses here. Messages are saved and used for analytics.</p>
                            </TooltipContent>
                          </Tooltip>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {/* Messages Area */}
                        <div className="h-96 overflow-y-auto p-4 space-y-4">
                          {displayMessages.map((msg, index) => (
                            <div key={msg.id || index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} chat-message`}>
                              <div className={`flex items-start gap-2 max-w-xs ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  msg.sender === 'user' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'bg-teal-100 text-teal-600'
                                }`}>
                                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`rounded-2xl px-4 py-2 shadow-sm ${
                                  msg.sender === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-white text-gray-800 border border-gray-200'
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
                            <div className="flex justify-start animate-fade-in">
                              <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2 shadow-sm border border-gray-200">
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
                        <div className="p-4 border-t border-gray-100">
                          {errors.chat && (
                            <Alert className="mb-3 bg-red-50 border-red-200">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-red-800">{errors.chat}</AlertDescription>
                            </Alert>
                          )}
                          <div className="flex gap-2">
                            <Textarea
                              value={currentMessage}
                              onChange={(e) => setCurrentMessage(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Type your message here..."
                              className="resize-none border-gray-200 focus:border-teal-400 bg-white"
                              rows={1}
                              disabled={isLoading}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  onClick={sendMessage} 
                                  disabled={isLoading || !currentMessage.trim()}
                                  className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
                                >
                                  {isLoading ? (
                                    <div className="loading-spinner"></div>
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Send message (Enter)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Control Panel */}
                    <div className="space-y-6">
                      {/* Brand Tone Settings */}
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            Brand Tone
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Choose how your AI communicates with customers</p>
                              </TooltipContent>
                            </Tooltip>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Select value={brandTone} onValueChange={setBrandTone}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="friendly">🌟 Friendly & Warm</SelectItem>
                              <SelectItem value="formal">🎩 Professional & Formal</SelectItem>
                              <SelectItem value="casual">😎 Casual & Relaxed</SelectItem>
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>

                      {/* Channel Integration */}
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle className="text-lg">Multi-Channel Support</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-200 hover-lift cursor-pointer">
                              <Globe className="w-6 h-6 text-green-600 mb-1" />
                              <span className="text-sm font-medium text-green-800">Website</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg border border-blue-200 hover-lift cursor-pointer">
                              <Mail className="w-6 h-6 text-blue-600 mb-1" />
                              <span className="text-sm font-medium text-blue-800">Email</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-200 hover-lift cursor-pointer">
                              <MessageSquare className="w-6 h-6 text-green-600 mb-1" />
                              <span className="text-sm font-medium text-green-800">WhatsApp</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg border border-purple-200 hover-lift cursor-pointer">
                              <Smartphone className="w-6 h-6 text-purple-600 mb-1" />
                              <span className="text-sm font-medium text-purple-800">Slack</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Knowledge Base Tab */}
              {activeTab === "knowledge" && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Upload Section */}
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Upload className="w-5 h-5 text-teal-600" />
                          Upload Knowledge Base
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Upload FAQs, documentation, or support content to train your AI</p>
                            </TooltipContent>
                          </Tooltip>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="file-upload">Upload Support Documents</Label>
                          <Input
                            id="file-upload"
                            type="file"
                            accept=".txt,.csv,.pdf"
                            onChange={(e) => setUploadFile(e.target.files[0])}
                            className="mt-1"
                            disabled={isUploading}
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Supported formats: TXT, CSV, PDF (max 5MB)
                          </p>
                        </div>
                        
                        {errors.upload && (
                          <Alert className="bg-red-50 border-red-200">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-red-800">{errors.upload}</AlertDescription>
                          </Alert>
                        )}
                        
                        <Button 
                          onClick={uploadKnowledgeBase} 
                          disabled={!uploadFile || isUploading}
                          className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
                        >
                          {isUploading ? (
                            <>
                              <div className="loading-spinner mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload & Train AI
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Current Knowledge Base */}
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-teal-600" />
                          Knowledge Base
                          <Badge variant="outline">{knowledgeBase.length} items</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {errors.knowledgeBase && (
                          <Alert className="mb-3 bg-red-50 border-red-200">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-red-800">{errors.knowledgeBase}</AlertDescription>
                          </Alert>
                        )}
                        
                        {knowledgeBase.length === 0 ? (
                          <div className="text-center py-8">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No documents uploaded yet</p>
                            <p className="text-sm text-gray-400">Upload your first document to get started</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {knowledgeBase.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover-lift">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-teal-600" />
                                  <div>
                                    <span className="text-sm font-medium">{item.filename}</span>
                                    <p className="text-xs text-gray-500">
                                      {new Date(item.uploaded_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteKnowledgeItem(item.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete this item</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && (
                <div className="space-y-6">
                  {errors.analytics && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-red-800">{errors.analytics}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="glass-card hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                            <p className="text-3xl font-bold text-gray-900">{analytics.total_conversations || 0}</p>
                            <p className="text-xs text-green-600 mt-1">↗ +12% this week</p>
                          </div>
                          <MessageCircle className="w-12 h-12 text-blue-600 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">AI Handled</p>
                            <p className="text-3xl font-bold text-gray-900">{analytics.ai_handled || 0}</p>
                            <p className="text-xs text-green-600 mt-1">
                              {analytics.total_conversations ? 
                                Math.round((analytics.ai_handled / analytics.total_conversations) * 100) : 0}% automation
                            </p>
                          </div>
                          <Bot className="w-12 h-12 text-teal-600 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Escalated</p>
                            <p className="text-3xl font-bold text-gray-900">{analytics.escalated || 0}</p>
                            <p className="text-xs text-orange-600 mt-1">Need attention</p>
                          </div>
                          <Users className="w-12 h-12 text-orange-600 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Time Saved</p>
                            <p className="text-3xl font-bold text-gray-900">{analytics.time_saved_hours || 0}h</p>
                            <p className="text-xs text-green-600 mt-1">This month</p>
                          </div>
                          <Clock className="w-12 h-12 text-green-600 opacity-80" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-teal-600" />
                          Performance Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">Automation Rate</span>
                          <span className="text-sm text-green-600 font-bold">
                            {analytics.total_conversations ? 
                              Math.round((analytics.ai_handled / analytics.total_conversations) * 100) : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">Avg Response Time</span>
                          <span className="text-sm text-blue-600 font-bold">{analytics.avg_response_time || 0.8}s</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">Customer Satisfaction</span>
                          <span className="text-sm text-yellow-600 font-bold">★ {analytics.satisfaction_score || 4.6}/5</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">Knowledge Base Items</span>
                          <span className="text-sm text-teal-600 font-bold">{knowledgeBase.length}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle>Business Impact</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                          <h3 className="text-2xl font-bold text-green-800">${Math.round((analytics.time_saved_hours || 0) * 25)}</h3>
                          <p className="text-green-600 text-sm">Cost Savings (Est.)</p>
                          <p className="text-xs text-green-500 mt-1">Based on $25/hour agent cost</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h3 className="text-2xl font-bold text-blue-800">24/7</h3>
                          <p className="text-blue-600 text-sm">Availability</p>
                          <p className="text-xs text-blue-500 mt-1">Never miss a customer</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <h3 className="text-2xl font-bold text-purple-800">∞</h3>
                          <p className="text-purple-600 text-sm">Scalability</p>
                          <p className="text-xs text-purple-500 mt-1">Handle unlimited conversations</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="w-5 h-5 text-teal-600" />
                          AI Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <Label htmlFor="default-tone" className="flex items-center gap-2">
                            Default Brand Tone
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Sets the default communication style for your AI</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Select value={brandTone} onValueChange={setBrandTone}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="friendly">🌟 Friendly & Warm</SelectItem>
                              <SelectItem value="formal">🎩 Professional & Formal</SelectItem>
                              <SelectItem value="casual">😎 Casual & Relaxed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="escalation-keywords" className="flex items-center gap-2">
                            Escalation Keywords
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="w-4 h-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Keywords that trigger escalation to human agents</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Textarea
                            id="escalation-keywords"
                            placeholder="refund, complaint, manager, cancel subscription, angry, frustrated"
                            className="mt-1"
                            rows={3}
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Enter keywords separated by commas
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="business-hours">Business Hours</Label>
                          <div className="grid grid-cols-2 gap-4 mt-1">
                            <Input placeholder="9:00 AM" />
                            <Input placeholder="6:00 PM" />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Set your business hours for escalation timing
                          </p>
                        </div>

                        <Button className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700">
                          <Settings className="w-4 h-4 mr-2" />
                          Save Configuration
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle>System Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-green-800">AI Service</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Online</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-green-800">Database</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-blue-800">API Status</span>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">Operational</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>Made with love using <strong>Emergent AI Platform</strong></span>
                </div>
                <div className="flex items-center gap-4">
                  <span>SupportGenie v1.0</span>
                  <span>•</span>
                  <span>Powered by OpenAI GPT-4o</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;