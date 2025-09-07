from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import openai
import time

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure OpenAI
client = openai.OpenAI(
    api_key=os.getenv('OPENAI_API_KEY')
)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        session_id = data.get('session_id', 'default')
        brand_tone = data.get('brand_tone', 'friendly')
        
        if not message.strip():
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        start_time = time.time()
        
        # Create chat completion using new OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": f"You are a helpful customer support assistant with a {brand_tone} tone. Keep responses concise and helpful."
                },
                {"role": "user", "content": message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        ai_message = response.choices[0].message.content
        response_time = round(time.time() - start_time, 2)
        
        # Simple escalation detection
        escalated = any(word in message.lower() for word in [
            'manager', 'supervisor', 'refund', 'complaint', 'cancel', 'angry'
        ])
        
        return jsonify({
            'message': ai_message,
            'escalated': escalated,
            'session_id': session_id,
            'response_time': response_time
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            'error': 'Sorry, I encountered an error. Please try again.'
        }), 500

@app.route('/api/knowledge-base', methods=['GET'])
def get_knowledge_base():
    return jsonify([])

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    return jsonify({
        'total_conversations': 0,
        'ai_handled': 0,
        'escalated': 0,
        'avg_response_time': 0.8,
        'satisfaction_score': 4.6,
        'time_saved_hours': 0.0
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'services': {
            'openai': 'configured' if os.getenv('OPENAI_API_KEY') else 'not_configured'
        }
    })

@app.route('/', methods=['GET'])
def root():
    return jsonify({'message': 'SupportGenie API is running!'})

if __name__ == '__main__':
    print("Starting SupportGenie API...")
    print(f"OpenAI API Key configured: {'Yes' if os.getenv('OPENAI_API_KEY') else 'No'}")
    app.run(host='0.0.0.0', port=8000, debug=True)
