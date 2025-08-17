// Default state that loads when the app starts
// Edit this file to set what components appear by default

export const defaultState = {
  nodes: [
    {
      id: "n-1",
      type: "card",
      position: { x: 480, y: 120 },
      data: {
        componentId: "comp-1",
        messageId: "msg-1",
      },
    },
    {
      id: "n-2", 
      type: "card",
      position: { x: 960, y: 120 },
      data: {
        componentId: "comp-2",
        messageId: "msg-2",
      },
    },
    // Add more nodes here as needed
  ],
  
  edges: [
    {
      id: "e-n-1-n-2",
      source: "n-1",
      target: "n-2",
    },
    // Add more edges here as needed
  ],
  
  components: {
    "comp-1": {
      id: "comp-1",
      name: "Welcome Message",
      slug: "01.01.01",
      uiToolType: "message",
      content: {
        message: { 
          text: "Welcome! Let's start by understanding your career goals.", 
          richText: true 
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    "comp-2": {
      id: "comp-2",
      name: "Career Goals Question",
      slug: "01.01.02", 
      uiToolType: "question",
      content: {
        question: {
          text: "What's most important to you in your next career move?",
          options: [],
          suggestions: [
            "Higher salary",
            "Better work-life balance", 
            "More challenging work",
            "Career advancement",
            "Learning new skills"
          ]
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Add more components here as needed
  },
  
  messages: [
    {
      id: "1",
      sender: "ai" as const,
      content: "Welcome! Let's start by understanding your career goals.",
      timestamp: "9:00 AM",
      messageId: "msg-1",
      componentId: "comp-1",
      type: "text" as const,
      uiToolType: "message",
    },
    {
      id: "2",
      sender: "ai" as const, 
      content: "What's most important to you in your next career move?",
      timestamp: "9:01 AM",
      messageId: "msg-2",
      componentId: "comp-2",
      type: "text" as const,
      uiToolType: "question",
      suggestions: [
        "Higher salary",
        "Better work-life balance",
        "More challenging work", 
        "Career advancement",
        "Learning new skills"
      ]
    },
    // Add more messages here as needed
  ],
  
  orphanMessageIds: [],
}; 