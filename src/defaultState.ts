// Default state that loads when the app starts
// This is built into the app and loads for everyone

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
  ],
  
  edges: [
    {
      id: "e-n-1-n-2",
      source: "n-1",
      target: "n-2",
    },
  ],
  
  components: {
    "comp-1": {
      id: "comp-1",
      name: "Welcome Message",
      slug: "01.01.01",
      uiToolType: "question",
      content: {
        question: {
          text: "afsf",
          image: "/img/intro/intro-profile.png"
        }
      },
      createdAt: "2025-08-17T17:44:02.626Z",
      updatedAt: "2025-08-17T17:45:01.808Z",
    },
    "comp-2": {
      id: "comp-2",
      name: "Career Goals Question",
      slug: "01.01.02",
      uiToolType: "multiSelect",
      content: {
        multiSelect: {
          options: [
            { text: "sdf" },
            { text: "sdf" },
            { text: "sdfsd" }
          ],
          maxSelection: 2,
          text: "adf"
        }
      },
      createdAt: "2025-08-17T17:44:02.626Z",
      updatedAt: "2025-08-17T17:45:19.509Z",
    },
  },
  
  messages: [
    {
      id: "1",
      sender: "ai" as const,
      content: "afsf",
      timestamp: "01:14 PM",
      messageId: "msg-1",
      componentId: "comp-1",
      type: "text" as const,
      uiToolType: "question",
      image: "/img/intro/intro-profile.png",
    },
    {
      id: "2",
      sender: "ai" as const,
      content: "adf",
      timestamp: "01:14 PM",
      messageId: "msg-2",
      componentId: "comp-2",
      type: "text" as const,
      uiToolType: "multiSelect",
      multiSelectOptions: [
        { text: "sdf" },
        { text: "sdf" },
        { text: "sdfsd" }
      ],
      maxSelection: 2,
    },
  ],
  
  orphanMessageIds: [],
}; 