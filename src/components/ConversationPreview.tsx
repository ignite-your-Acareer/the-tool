import { useEffect, useRef, useState } from "react";
import "./ConversationPreview.css";

type MessageType = "text" | "card" | "pills";

type Message = {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: string;
  messageId?: string; // Links to node messageId
  type: MessageType;
  cardData?: {
    title: string;
    description: string;
    illustration: string;
    question: string;
  };
  pillsData?: {
    text: string;
    options: string[];
  };
};

const mockConversation: Message[] = [
  {
    id: "1",
    sender: "user",
    content:
      "Hi! I'm working on a new project and I'm feeling a bit overwhelmed. Can you help me break it down into manageable steps?",
    timestamp: "2:34 PM",
    type: "text",
  },
  {
    id: "2",
    sender: "ai",
    content:
      "Of course! I'd be happy to help you break down your project. Let's start by understanding what you're working on. Can you tell me a bit more about the project and what your main goals are?",
    timestamp: "2:35 PM",
    messageId: "msg-1",
    type: "text",
  },
  {
    id: "3",
    sender: "user",
    content:
      "I'm building a web application for managing customer relationships. It needs to handle user authentication, customer data storage, and reporting features. I'm not sure where to start.",
    timestamp: "2:36 PM",
    type: "text",
  },
  {
    id: "4",
    sender: "ai",
    content:
      "Great! That's a solid project. Let me help you break this down into phases. We can start with a simple MVP and build up from there. Here's what I suggest for Phase 1:",
    timestamp: "2:37 PM",
    messageId: "msg-2",
    type: "text",
  },
  {
    id: "5",
    sender: "ai",
    content:
      "1. Set up the basic project structure and development environment\n2. Create a simple user authentication system\n3. Build a basic customer data model and storage\n4. Create a simple UI for adding/viewing customers\n\nDoes this approach sound good to you?",
    timestamp: "2:37 PM",
    messageId: "msg-4",
    type: "text",
  },
  {
    id: "6",
    sender: "user",
    content:
      "Yes, that makes a lot of sense! I think I can handle the project structure and environment setup. But I'm not sure about the authentication part - any tips?",
    timestamp: "2:38 PM",
    type: "text",
  },
  {
    id: "7",
    sender: "ai",
    content:
      "Absolutely! For authentication, I'd recommend starting with a simple email/password system using a library like Passport.js if you're using Node.js, or Firebase Auth if you want something managed. The key is to start simple and add security features incrementally.",
    timestamp: "2:39 PM",
    messageId: "msg-5",
    type: "text",
  },
  {
    id: "8",
    sender: "ai",
    content:
      "For the database setup, I'd suggest starting with a simple relational database like PostgreSQL. We can design a basic schema with users, customers, and relationships tables. Would you like me to walk you through the database design?",
    timestamp: "2:40 PM",
    messageId: "msg-8",
    type: "text",
  },
  {
    id: "9",
    sender: "ai",
    content:
      "For the frontend, I'd recommend React with TypeScript for type safety. You can use a UI library like Material-UI or Tailwind CSS for styling. This will give you a solid foundation to build upon.",
    timestamp: "2:41 PM",
    messageId: "msg-9",
    type: "text",
  },
  {
    id: "10",
    sender: "ai",
    content:
      "Testing is crucial! I'd suggest starting with unit tests for your business logic, integration tests for your API endpoints, and basic end-to-end tests for critical user flows. We can set up Jest and React Testing Library.",
    timestamp: "2:42 PM",
    messageId: "msg-10",
    type: "text",
  },
  {
    id: "11",
    sender: "ai",
    content:
      "For deployment, I'd recommend starting with Vercel for the frontend and Railway or Render for the backend. These platforms make it easy to get started and scale as needed.",
    timestamp: "2:43 PM",
    messageId: "msg-11",
    type: "text",
  },
  {
    id: "12",
    sender: "ai",
    content:
      "Perfect! Here's your action plan: Start with the project setup this week, work on authentication next week, and aim to have a basic customer management system running within 3-4 weeks. Sound doable?",
    timestamp: "2:44 PM",
    messageId: "msg-12",
    type: "text",
  },
  {
    id: "13",
    sender: "user",
    content:
      "That sounds perfect! I feel much more confident about tackling this project now. Thanks for breaking it down into manageable pieces.",
    timestamp: "2:45 PM",
    type: "text",
  },
  {
    id: "14",
    sender: "ai",
    content:
      "Awesome - now that we've got a feel for your project, let's dig into your strengths. You'll see a few sample answers to guide you. Feel free to click one that fits, but writing in detail in your own words is best.",
    timestamp: "2:46 PM",
    messageId: "msg-13",
    type: "card",
    cardData: {
      title: "Strengths",
      description:
        "Awesome - now that we've got a feel for your personality, let's dig into your strengths. You'll see a few sample answers to guide you. Feel free to click one that fits, but writing in detail in your own words is best.",
      illustration: "🎨", // Placeholder for the illustration
      question: "What tasks are easy for you but hard for others?",
    },
  },
  {
    id: "15",
    sender: "ai",
    content:
      "Based on what you've shared, here are some areas that might be your strengths. Click on any that resonate with you:",
    timestamp: "2:47 PM",
    messageId: "msg-14",
    type: "pills",
    pillsData: {
      text: "Based on what you've shared, here are some areas that might be your strengths. Click on any that resonate with you:",
      options: [
        "System Mapping",
        "Quiet Leadership",
        "Empathic Mediation",
        "Analytical Reasoning",
        "Strategic Planning",
      ],
    },
  },
];

export default function ConversationPreview() {
  const messagesRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    const handleScrollToMessage = (event: CustomEvent) => {
      const { messageId } = event.detail;
      const messageElement = messageRefs.current[messageId];

      if (messageElement && messagesRef.current) {
        messageElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Add a highlight effect
        messageElement.classList.add("message-highlight");
        setTimeout(() => {
          messageElement.classList.remove("message-highlight");
        }, 2000);
      }
    };

    const handleHighlightMessage = (event: CustomEvent) => {
      const { messageId } = event.detail;
      setHighlightedMessageId(messageId);
    };

    const handleUnhighlightMessage = () => {
      setHighlightedMessageId(null);
    };

    window.addEventListener("scrollToMessage", handleScrollToMessage as EventListener);
    window.addEventListener("highlightMessage", handleHighlightMessage as EventListener);
    window.addEventListener("unhighlightMessage", handleUnhighlightMessage as EventListener);

    return () => {
      window.removeEventListener("scrollToMessage", handleScrollToMessage as EventListener);
      window.removeEventListener("highlightMessage", handleHighlightMessage as EventListener);
      window.removeEventListener("unhighlightMessage", handleUnhighlightMessage as EventListener);
    };
  }, []);

  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case "card":
        return (
          <div className="message-card">
            <div className="message-card__header">
              <h4>{message.cardData?.title}</h4>
              <p>{message.cardData?.description}</p>
            </div>
            <div className="message-card__content">
              <div className="message-card__illustration">
                <div className="illustration-placeholder">{message.cardData?.illustration}</div>
              </div>
              <div className="message-card__question">
                <p>{message.cardData?.question}</p>
              </div>
            </div>
          </div>
        );

      case "pills":
        return (
          <div className="message-pills">
            <p>{message.pillsData?.text}</p>
            <div className="pills-container">
              {message.pillsData?.options.map((option, index) => (
                <button key={index} className="pill-button">
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return <div className="message-text">{message.content}</div>;
    }
  };

  return (
    <div className="conversation-preview">
      <div className="conversation-header">
        <h3>Conversation Preview</h3>
        <div className="conversation-status">
          <span className="status-dot active"></span>
          <span className="status-text">Active</span>
        </div>
      </div>

      <div className="conversation-messages" ref={messagesRef}>
        {mockConversation.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender} ${
              message.messageId && highlightedMessageId === message.messageId ? "message-node-highlighted" : ""
            }`}
            ref={
              message.messageId
                ? (el) => {
                    messageRefs.current[message.messageId!] = el;
                  }
                : undefined
            }
            onMouseEnter={() => {
              if (message.messageId) {
                const event = new CustomEvent("highlightNode", {
                  detail: { messageId: message.messageId },
                });
                window.dispatchEvent(event);
              }
            }}
            onMouseLeave={() => {
              if (message.messageId) {
                const event = new CustomEvent("unhighlightNode", {
                  detail: { messageId: message.messageId },
                });
                window.dispatchEvent(event);
              }
            }}
          >
            <div className="message-avatar">{message.sender === "ai" ? "🤖" : "👤"}</div>
            <div className="message-content">
              {renderMessageContent(message)}
              <div className="message-timestamp">{message.timestamp}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="conversation-input">
        <div className="input-placeholder">Type your message here...</div>
        <button className="send-button">Send</button>
      </div>
    </div>
  );
}
