import requests
import sys
import json
import time
from datetime import datetime
import uuid

class SupportGenieAPITester:
    def __init__(self, base_url="https://smartsupport-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = f"test_session_{int(time.time())}_{uuid.uuid4().hex[:8]}"

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_chat_functionality(self):
        """Test AI chat with different brand tones and escalation"""
        print("\n" + "="*50)
        print("TESTING AI CHAT FUNCTIONALITY")
        print("="*50)
        
        # Test different brand tones
        tones = ["friendly", "formal", "casual"]
        for tone in tones:
            print(f"\n--- Testing {tone.upper()} tone ---")
            
            # Simple customer support question
            success, response = self.run_test(
                f"Chat - {tone} tone",
                "POST",
                "chat",
                200,
                data={
                    "message": "Hi, I need help with my order status. Can you help me?",
                    "session_id": self.session_id,
                    "brand_tone": tone
                }
            )
            
            if success:
                print(f"   AI Response: {response.get('message', 'No message')}")
                print(f"   Escalated: {response.get('escalated', False)}")
            
            # Wait a bit between requests to avoid rate limiting
            time.sleep(2)
        
        # Test escalation scenario
        print(f"\n--- Testing ESCALATION scenario ---")
        success, response = self.run_test(
            "Chat - Escalation test",
            "POST", 
            "chat",
            200,
            data={
                "message": "I want a full refund immediately and I want to speak to your manager right now! This is unacceptable!",
                "session_id": self.session_id,
                "brand_tone": "friendly"
            }
        )
        
        if success:
            print(f"   AI Response: {response.get('message', 'No message')}")
            print(f"   Escalated: {response.get('escalated', False)}")
            if response.get('escalated'):
                print("   ✅ Escalation logic working correctly")
            else:
                print("   ⚠️  Escalation may not have triggered as expected")

    def test_chat_history(self):
        """Test chat history retrieval"""
        print(f"\n--- Testing CHAT HISTORY ---")
        success, response = self.run_test(
            "Get Chat History",
            "GET",
            f"chat/{self.session_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} messages in history")
            for i, msg in enumerate(response[:3]):  # Show first 3 messages
                print(f"   Message {i+1}: {msg.get('sender', 'unknown')} - {msg.get('message', 'No message')[:50]}...")

    def test_knowledge_base(self):
        """Test knowledge base upload and management"""
        print("\n" + "="*50)
        print("TESTING KNOWLEDGE BASE")
        print("="*50)
        
        # Test getting current knowledge base
        success, kb_items = self.run_test(
            "Get Knowledge Base",
            "GET",
            "knowledge-base",
            200
        )
        
        initial_count = len(kb_items) if success and isinstance(kb_items, list) else 0
        print(f"   Initial KB items: {initial_count}")
        
        # Test uploading a knowledge base file
        test_content = """FAQ - Customer Support

Q: How do I track my order?
A: You can track your order using the tracking number sent to your email.

Q: What is your return policy?
A: We offer 30-day returns for all items in original condition.

Q: How do I contact customer support?
A: You can reach us via chat, email at support@company.com, or phone at 1-800-SUPPORT.
"""
        
        # Create a test file
        files = {'file': ('test_faq.txt', test_content, 'text/plain')}
        
        success, response = self.run_test(
            "Upload Knowledge Base",
            "POST",
            "knowledge-base/upload",
            200,
            files=files
        )
        
        uploaded_filename = None
        if success:
            uploaded_filename = response.get('filename')
            print(f"   Uploaded file: {uploaded_filename}")
        
        # Test getting updated knowledge base
        success, updated_kb = self.run_test(
            "Get Updated Knowledge Base",
            "GET", 
            "knowledge-base",
            200
        )
        
        if success and isinstance(updated_kb, list):
            print(f"   Updated KB items: {len(updated_kb)}")
            
            # Find the uploaded item for deletion test
            uploaded_item = None
            for item in updated_kb:
                if item.get('filename') == uploaded_filename:
                    uploaded_item = item
                    break
            
            if uploaded_item:
                # Test deletion
                success, response = self.run_test(
                    "Delete Knowledge Base Item",
                    "DELETE",
                    f"knowledge-base/{uploaded_item['id']}",
                    200
                )
                
                if success:
                    print(f"   Successfully deleted: {uploaded_filename}")

    def test_analytics(self):
        """Test analytics endpoint"""
        print("\n" + "="*50)
        print("TESTING ANALYTICS")
        print("="*50)
        
        success, analytics = self.run_test(
            "Get Analytics",
            "GET",
            "analytics", 
            200
        )
        
        if success:
            print(f"   Total Conversations: {analytics.get('total_conversations', 0)}")
            print(f"   AI Handled: {analytics.get('ai_handled', 0)}")
            print(f"   Escalated: {analytics.get('escalated', 0)}")
            print(f"   Avg Response Time: {analytics.get('avg_response_time', 0)}s")
            print(f"   Satisfaction Score: {analytics.get('satisfaction_score', 0)}")
            print(f"   Time Saved: {analytics.get('time_saved_hours', 0)}h")
            
            # Validate analytics make sense
            total = analytics.get('total_conversations', 0)
            ai_handled = analytics.get('ai_handled', 0)
            escalated = analytics.get('escalated', 0)
            
            if total > 0 and (ai_handled + escalated) <= total:
                print("   ✅ Analytics data appears consistent")
            elif total == 0:
                print("   ℹ️  No conversation data yet (expected for new system)")
            else:
                print("   ⚠️  Analytics data may be inconsistent")

    def test_ai_with_knowledge_base(self):
        """Test if AI uses knowledge base in responses"""
        print("\n" + "="*50)
        print("TESTING AI + KNOWLEDGE BASE INTEGRATION")
        print("="*50)
        
        # Upload specific knowledge
        kb_content = """Company Policy: Our return policy is 45 days for premium customers and 30 days for regular customers. All returns must include original packaging."""
        
        files = {'file': ('return_policy.txt', kb_content, 'text/plain')}
        
        success, response = self.run_test(
            "Upload Return Policy KB",
            "POST",
            "knowledge-base/upload", 
            200,
            files=files
        )
        
        if success:
            # Wait a moment for KB to be processed
            time.sleep(3)
            
            # Ask about return policy
            success, chat_response = self.run_test(
                "Chat - Ask about return policy",
                "POST",
                "chat",
                200,
                data={
                    "message": "What is your return policy for premium customers?",
                    "session_id": f"{self.session_id}_kb_test",
                    "brand_tone": "friendly"
                }
            )
            
            if success:
                ai_message = chat_response.get('message', '')
                print(f"   AI Response: {ai_message}")
                
                # Check if AI mentioned the specific policy details
                if "45 days" in ai_message or "premium" in ai_message.lower():
                    print("   ✅ AI successfully used knowledge base information")
                else:
                    print("   ⚠️  AI may not have used knowledge base (or policy not specific enough)")

def main():
    print("🤖 SupportGenie API Testing Suite")
    print("=" * 60)
    
    tester = SupportGenieAPITester()
    
    # Run all tests
    try:
        # Test basic analytics first (should work even with no data)
        tester.test_analytics()
        
        # Test knowledge base functionality
        tester.test_knowledge_base()
        
        # Test AI chat functionality (core feature)
        tester.test_chat_functionality()
        
        # Test chat history
        tester.test_chat_history()
        
        # Test AI + Knowledge Base integration
        tester.test_ai_with_knowledge_base()
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error during testing: {str(e)}")
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL TEST RESULTS")
    print("="*60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! SupportGenie API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} test(s) failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())