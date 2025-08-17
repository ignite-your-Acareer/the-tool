// Default state that loads when the app starts
// This is built into the app and loads for everyone

export const defaultState = {
  nodes: [
    {
      id: "n-1",
      type: "card",
      position: {
        x: 480,
        y: 120
      },
      data: {
        componentId: "comp-1",
        messageId: "msg-1"
      }
    },
    {
      id: "n-2",
      type: "card",
      position: {
        x: 960,
        y: 120
      },
      data: {
        componentId: "comp-2",
        messageId: "msg-2"
      }
    }
  ],
  edges: [
    {
      id: "e-n-1-n-2",
      source: "n-1",
      target: "n-2"
    }
  ],
  components: {
    "comp-1": {
      id: "comp-1",
      name: "Strengths Q1",
      slug: "01.01.01",
      uiToolType: "question",
      content: {
        question: {
          text: "What tasks are easy for you but hard for others?",
          image: "/img/steps/strengths/question/1.png",
          suggestions: [
            "Writing",
            "etc"
          ]
        }
      },
      createdAt: "2025-08-17T17:44:02.626Z",
      updatedAt: "2025-08-17T18:29:27.870Z"
    },
    "comp-2": {
      id: "comp-2",
      name: "Strengths Q2",
      slug: "01.01.02",
      uiToolType: "question",
      content: {
        question: {
          text: "What type of tasks are you doing when you feel the most energized and productive?",
          image: "/img/steps/strengths/question/2.png",
          suggestions: [
            "Repetitive Tasks",
            "etc"
          ]
        }
      },
      createdAt: "2025-08-17T17:44:02.626Z",
      updatedAt: "2025-08-17T18:30:24.634Z"
    }
  },
  messages: [
    {
      id: "1",
      sender: "ai" as const,
      content: "What tasks are easy for you but hard for others?",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-1",
      componentId: "comp-1",
      uiToolType: "question",
      suggestions: [
        "Writing",
        "etc"
      ],
      image: "/img/steps/strengths/question/1.png"
    },
    {
      id: "2",
      sender: "ai" as const,
      content: "What type of tasks are you doing when you feel the most energized and productive?",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-2",
      componentId: "comp-2",
      uiToolType: "question",
      suggestions: [
        "Repetitive Tasks",
        "etc"
      ],
      image: "/img/steps/strengths/question/2.png"
    }
  ],
  orphanMessageIds: [],
  lastSaved: "2025-08-17T18:30:39.694Z"
}; 