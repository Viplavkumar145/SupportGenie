from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio
import time
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with error handling
try:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[os.environ['DB_NAME']]
except Exception as e:
    logging.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

# Create the main app without a prefix
app = FastAPI(
    title="SupportGenie API",
    description="AI-Powered Customer Support Platform",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enhanced Pydantic Models with validation
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=2000)
    sender: str = Field(..., pattern="^(user|ai)$")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    escalated: bool = False
    response_time: Optional[float] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., min_length=1, max_length=100)
    brand_tone: str = Field(default="friendly", pattern="^(friendly|formal|casual)$")

    @validator('message')
    def validate_message(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()

class ChatResponse(BaseModel):
    message: str
    escalated: bool = False
    session_id: str
    response_time: Optional[float] = None

class KnowledgeBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    content_type: str
    file_size: int = Field(default=0, ge=0)
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Analytics(BaseModel):
    total_conversations: int = Field(default=0, ge=0)
    ai_handled: int = Field(default=0, ge=0)
    escalated: int = Field(default=0, ge=0)
    avg_response_time: float = Field(default=0.8, ge=0)
    satisfaction_score: float = Field(default=4.6, ge=0, le=5)
    time_saved_hours: float = Field(default=0.0, ge=0)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ErrorResponse(BaseModel):
    error: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Enhanced system message generation with better prompts
def get_system_message(brand_tone: str, knowledge_base: str = "") -> str:
    tone_instructions = {
        "friendly": """You are a friendly and helpful customer support AI assistant. Your communication style should be:
        - Warm and approachable with a caring tone
        - Use conversational language that feels natural
        - Express genuine empathy and understanding
        - Include appropriate positive expressions like "I'd be happy to help!"
        - Be encouraging and supportive""",
        
        "formal": """You are a professional customer support AI assistant. Your communication style should be:
        - Courteous and respectful at all times
        - Use proper grammar and formal language structure
        - Maintain a professional yet helpful demeanor
        - Address customers with appropriate titles when suitable
        - Be precise and articulate in your responses""",
        
        "casual": """You are a relaxed and easy-going customer support AI assistant. Your communication style should be:
        - Conversational and informal but still professional
        - Use everyday language that's easy to understand
        - Be friendly without being overly formal
        - Keep the mood light and approachable
        - Use contractions and casual expressions appropriately"""
    }
    
    escalation_keywords = [
        "manager", "supervisor", "refund", "complaint", "angry", "frustrated", 
        "cancel subscription", "billing issue", "legal action", "lawsuit",
        "demand", "unacceptable", "terrible service", "worst", "hate"
    ]
    
    base_message = f"""{tone_instructions.get(brand_tone, tone_instructions['friendly'])}

IMPORTANT INSTRUCTIONS:
1. You are SupportGenie, an AI customer support assistant for this company
2. Always maintain the specified brand tone: {brand_tone}
3. Provide helpful, accurate, and contextual responses to customer queries
4. If a query contains any of these escalation keywords or indicates high frustration/complexity, 
   start your response with "ESCALATE:" followed by your response: {', '.join(escalation_keywords)}
5. Use the knowledge base information when relevant to provide accurate company-specific answers
6. If you don't know something specific about the company, be honest and suggest contacting a human agent
7. Keep responses concise but thorough (aim for 2-3 sentences for simple queries)
8. Always end with asking if there's anything else you can help with

COMPANY KNOWLEDGE BASE:
{knowledge_base if knowledge_base.strip() else "No specific company information provided yet."}

Remember: Your goal is to provide excellent customer support while maintaining the {brand_tone} tone consistently."""
    
    return base_message

# Enhanced AI response function with better error handling
async def get_ai_response(message: str, session_id: str, brand_tone: str = "friendly") -> tuple[str, bool, float]:
    start_time = time.time()
    
    try:
        # Validate inputs
        if not message.strip():
            return "I didn't receive a message. Could you please try again?", False, 0.0
        
        if len(message) > 2000:
            return "Your message is quite long. Could you please break it down into smaller parts?", False, 0.0
        
        # Get knowledge base content with error handling
        try:
            kb_documents = await db.knowledge_base.find().to_list(length=50)  # Limit for performance
            knowledge_content = "\n\n".join([
                f"Document: {doc.get('filename', 'Unknown')}\n{doc.get('content', '')}" 
                for doc in kb_documents if doc.get('content')
            ])
        except Exception as e:
            logging.warning(f"Failed to load knowledge base: {str(e)}")
            knowledge_content = ""
        
        system_message = get_system_message(brand_tone, knowledge_content)
        
        # Enhanced LLM configuration
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise ValueError("EMERGENT_LLM_KEY not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"supportgenie_{session_id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        
        if not response:
            return "I apologize, but I'm having trouble generating a response right now. Let me connect you with a human agent.", True, 0.0
        
        # Enhanced escalation detection
        escalated = False
        escalation_indicators = [
            response.startswith("ESCALATE:"),
            any(keyword in message.lower() for keyword in [
                "manager", "supervisor", "refund", "complaint", "cancel", 
                "billing", "angry", "frustrated", "terrible", "worst"
            ]),
            len(message.split()) > 100,  # Very long messages might need human attention
            "?" in message and len(message.split("?")) > 3  # Multiple complex questions
        ]
        
        if any(escalation_indicators):
            escalated = True
            if response.startswith("ESCALATE:"):
                response = response.replace("ESCALATE:", "").strip()
            
            if not response.strip():
                response = "I understand this requires special attention. Let me connect you with one of our human agents who can help you better."
        
        # Calculate response time
        response_time = round(time.time() - start_time, 2)
        
        return response, escalated, response_time
        
    except asyncio.TimeoutError:
        return "I apologize for the delay. Our AI service is experiencing high load. Let me connect you with a human agent.", True, 0.0
    except Exception as e:
        logging.error(f"AI response error: {str(e)}")
        return "I'm experiencing technical difficulties right now. Let me connect you with a human agent who can assist you.", True, 0.0

# Enhanced API Routes with comprehensive error handling
@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        start_time = time.time()
        
        # Enhanced input validation
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        if len(request.session_id) > 100:
            raise HTTPException(status_code=400, detail="Session ID too long")
        
        # Save user message with additional metadata
        user_msg = ChatMessage(
            session_id=request.session_id,
            message=request.message,
            sender="user",
            response_time=0.0
        )
        
        try:
            await db.chat_messages.insert_one(user_msg.dict())
        except Exception as e:
            logging.error(f"Failed to save user message: {str(e)}")
            # Continue processing even if save fails
        
        # Get AI response with timeout
        try:
            ai_response, escalated, ai_response_time = await asyncio.wait_for(
                get_ai_response(request.message, request.session_id, request.brand_tone),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            ai_response = "I apologize for the delay. Our AI service is currently busy. Let me connect you with a human agent."
            escalated = True
            ai_response_time = 30.0
        
        # Save AI message
        ai_msg = ChatMessage(
            session_id=request.session_id,
            message=ai_response,
            sender="ai",
            escalated=escalated,
            response_time=ai_response_time
        )
        
        try:
            await db.chat_messages.insert_one(ai_msg.dict())
        except Exception as e:
            logging.error(f"Failed to save AI message: {str(e)}")
        
        total_response_time = round(time.time() - start_time, 2)
        
        return ChatResponse(
            message=ai_response,
            escalated=escalated,
            session_id=request.session_id,
            response_time=total_response_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Chat endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during chat processing")

@api_router.get("/chat/{session_id}", response_model=List[ChatMessage])
async def get_chat_history(session_id: str):
    try:
        if len(session_id) > 100:
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        messages = await db.chat_messages.find(
            {"session_id": session_id}
        ).sort("timestamp", 1).limit(100).to_list(length=None)
        
        return [ChatMessage(**msg) for msg in messages]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Chat history error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")

@api_router.post("/knowledge-base/upload")
async def upload_knowledge_base(file: UploadFile = File(...)):
    try:
        # Enhanced file validation
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # File size validation (5MB limit)
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=413, detail="File size exceeds 5MB limit")
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        # File type validation
        allowed_types = ['text/plain', 'text/csv', 'application/pdf']
        allowed_extensions = ['.txt', '.csv', '.pdf']
        
        file_extension = Path(file.filename).suffix.lower()
        
        if file.content_type not in allowed_types and file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=415, 
                detail="Unsupported file type. Only TXT, CSV, and PDF files are allowed"
            )
        
        # Content extraction (basic text for now)
        try:
            if file_extension in ['.txt', '.csv'] or file.content_type.startswith('text/'):
                text_content = file_content.decode('utf-8')
            else:
                # For PDF, we'll store as is for now (in production, use proper PDF extraction)
                text_content = f"PDF file: {file.filename} (content extraction not implemented)"
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File encoding not supported. Please use UTF-8 encoded files")
        
        if len(text_content.strip()) == 0:
            raise HTTPException(status_code=400, detail="File appears to be empty or contains no readable text")
        
        # Check for duplicate filenames
        existing = await db.knowledge_base.find_one({"filename": file.filename})
        if existing:
            # Update existing document
            update_data = {
                "content": text_content,
                "content_type": file.content_type or "text/plain",
                "file_size": file_size,
                "uploaded_at": datetime.now(timezone.utc)
            }
            await db.knowledge_base.update_one(
                {"filename": file.filename}, 
                {"$set": update_data}
            )
            return {
                "message": f"Knowledge base updated successfully: {file.filename}", 
                "filename": file.filename,
                "action": "updated"
            }
        else:
            # Create new document
            kb_item = KnowledgeBase(
                filename=file.filename,
                content=text_content,
                content_type=file.content_type or "text/plain",
                file_size=file_size
            )
            
            await db.knowledge_base.insert_one(kb_item.dict())
            return {
                "message": f"Knowledge base uploaded successfully: {file.filename}", 
                "filename": file.filename,
                "action": "created"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload failed due to server error")

@api_router.get("/knowledge-base", response_model=List[KnowledgeBase])
async def get_knowledge_base():
    try:
        kb_items = await db.knowledge_base.find().sort("uploaded_at", -1).limit(50).to_list(length=None)
        return [KnowledgeBase(**item) for item in kb_items]
    except Exception as e:
        logging.error(f"Knowledge base retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge base")

@api_router.delete("/knowledge-base/{kb_id}")
async def delete_knowledge_base_item(kb_id: str):
    try:
        if not kb_id.strip():
            raise HTTPException(status_code=400, detail="Invalid knowledge base ID")
        
        result = await db.knowledge_base.delete_one({"id": kb_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Knowledge base item not found")
        
        return {"message": "Knowledge base item deleted successfully", "id": kb_id}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete knowledge base item")

@api_router.get("/analytics", response_model=Analytics)
async def get_analytics():
    try:
        # Enhanced analytics with better error handling
        pipeline = [
            {
                "$group": {
                    "_id": "$session_id",
                    "message_count": {"$sum": 1},
                    "escalated": {"$max": "$escalated"},
                    "avg_response_time": {"$avg": "$response_time"}
                }
            }
        ]
        
        try:
            conversation_stats = await db.chat_messages.aggregate(pipeline).to_list(length=None)
        except Exception:
            # Fallback to simple counting if aggregation fails
            total_messages = await db.chat_messages.count_documents({})
            conversation_stats = []
        
        total_conversations = len(conversation_stats) if conversation_stats else 0
        escalated_conversations = sum(1 for conv in conversation_stats if conv.get('escalated', False)) if conversation_stats else 0
        ai_handled = total_conversations - escalated_conversations
        
        # Calculate average response time
        response_times = [conv.get('avg_response_time', 0) for conv in conversation_stats if conv.get('avg_response_time')]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0.8
        
        # Calculate time saved (assuming 2 minutes per AI-handled conversation)
        time_saved = (ai_handled * 2) / 60  # Convert to hours
        
        # Get knowledge base count
        try:
            kb_count = await db.knowledge_base.count_documents({})
        except Exception:
            kb_count = 0
        
        return Analytics(
            total_conversations=max(0, total_conversations),
            ai_handled=max(0, ai_handled),
            escalated=max(0, escalated_conversations),
            avg_response_time=round(max(0.1, avg_response_time), 2),
            satisfaction_score=4.6,  # This would come from feedback in production
            time_saved_hours=round(max(0.0, time_saved), 1),
            last_updated=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        logging.error(f"Analytics error: {str(e)}")
        # Return default analytics instead of failing
        return Analytics()

# Health check endpoint
@api_router.get("/health")
async def health_check():
    try:
        # Test database connection
        await client.admin.command('ismaster')
        
        # Test AI service
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        ai_status = "configured" if api_key else "not_configured"
        
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc),
            "services": {
                "database": "connected",
                "ai_service": ai_status
            }
        }
    except Exception as e:
        logging.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

# Include the router in the main app
app.include_router(api_router)

# Enhanced middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logging.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.2f}s"
    )
    
    return response

# Configure enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("SupportGenie API starting up...")
    
    # Test database connection
    try:
        await db.admin.command('ismaster')
        logger.info("✓ Database connection established")
    except Exception as e:
        logger.error(f"✗ Database connection failed: {str(e)}")
    
    # Check AI service configuration
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if api_key:
        logger.info("✓ AI service configured")
    else:
        logger.warning("✗ AI service not configured (EMERGENT_LLM_KEY missing)")
    
    logger.info("SupportGenie API ready!")

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Shutting down SupportGenie API...")
    client.close()
    logger.info("✓ Database connection closed")