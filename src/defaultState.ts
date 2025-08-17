const defaultState = {
  "nodes": [
    {
      "id": "n-1",
      "type": "card",
      "position": {
        "x": 480,
        "y": 120
      },
      "data": {
        "componentId": "comp-1",
        "messageId": "msg-1"
      }
    },
    {
      "id": "n-2",
      "type": "card",
      "position": {
        "x": 960,
        "y": 120
      },
      "data": {
        "componentId": "comp-2",
        "messageId": "msg-2"
      }
    },
    {
      "id": "n-3",
      "type": "card",
      "position": {
        "x": 1440,
        "y": 120
      },
      "data": {
        "componentId": "comp-1755459042228",
        "messageId": "msg-3"
      }
    },
    {
      "id": "n-4",
      "type": "card",
      "position": {
        "x": 480,
        "y": 240
      },
      "data": {
        "componentId": "comp-1755459253440",
        "messageId": "msg-4"
      }
    },
    {
      "id": "n-5",
      "type": "card",
      "position": {
        "x": 960,
        "y": 240
      },
      "data": {
        "componentId": "comp-1755460172767",
        "messageId": "msg-5"
      }
    }
  ],
  "edges": [
    {
      "id": "e-n-1-n-2",
      "source": "n-1",
      "target": "n-2"
    },
    {
      "id": "e-n-2-n-3",
      "source": "n-2",
      "target": "n-3"
    },
    {
      "id": "e-n-3-n-4",
      "source": "n-3",
      "target": "n-4"
    },
    {
      "id": "e-n-4-n-5",
      "source": "n-4",
      "target": "n-5"
    }
  ],
  "components": {
    "comp-1": {
      "id": "comp-1",
      "name": "Strengths Q1",
      "slug": "01.01.01",
      "uiToolType": "question",
      "content": {
        "question": {
          "text": "What tasks are easy for you but hard for others?",
          "image": "/img/steps/strengths/question/1.png",
          "suggestions": [
            "Writing",
            "etc"
          ]
        },
        "banner": {
          "text": "Strengths",
          "type": "default"
        }
      },
      "createdAt": "2025-08-17T17:44:02.626Z",
      "updatedAt": "2025-08-17T19:30:35.304Z"
    },
    "comp-2": {
      "id": "comp-2",
      "name": "Strengths Q2",
      "slug": "01.01.02",
      "uiToolType": "question",
      "content": {
        "question": {
          "text": "What type of tasks are you doing when you feel the most energized and productive?",
          "image": "/img/steps/strengths/question/2.png",
          "suggestions": [
            "Repetitive Tasks",
            "etc"
          ]
        }
      },
      "createdAt": "2025-08-17T17:44:02.626Z",
      "updatedAt": "2025-08-17T18:30:24.634Z"
    },
    "comp-1755459042228": {
      "id": "comp-1755459042228",
      "name": "Strengths Q3",
      "slug": "01.01.03",
      "uiToolType": "question",
      "content": {
        "question": {
          "text": "What skill have people always complimented you on?",
          "options": [],
          "suggestions": [
            "Public Speaking",
            "etc"
          ],
          "image": "/img/steps/strengths/question/3.png"
        }
      },
      "createdAt": "2025-08-17T19:30:42.229Z",
      "updatedAt": "2025-08-17T19:51:14.438Z"
    },
    "comp-1755459253440": {
      "id": "comp-1755459253440",
      "name": "Strengths Q4",
      "slug": "01.01.04",
      "uiToolType": "question",
      "content": {
        "question": {
          "text": "What would your closest friends and family say are your natural talents?",
          "options": [],
          "suggestions": [
            "Reliability",
            "etc"
          ],
          "image": "/img/steps/strengths/question/4.png"
        }
      },
      "createdAt": "2025-08-17T19:34:13.440Z",
      "updatedAt": "2025-08-17T19:50:55.874Z"
    },
    "comp-1755460172767": {
      "id": "comp-1755460172767",
      "name": "Strengths Q5",
      "slug": "01.01.05",
      "uiToolType": "question",
      "content": {
        "question": {
          "text": "What do you get so involved with that you lose track of time?",
          "options": [],
          "suggestions": [
            "Reading",
            "etc"
          ],
          "image": "/img/steps/strengths/question/5.png"
        }
      },
      "createdAt": "2025-08-17T19:49:32.767Z",
      "updatedAt": "2025-08-17T19:50:39.395Z"
    }
  },
  "messages": [
    {
      "id": "1",
      "sender": "ai" as const,
      "content": "What tasks are easy for you but hard for others?",
      "timestamp": "01:14 PM",
      "type": "text" as const,
      "messageId": "msg-1",
      "componentId": "comp-1",
      "uiToolType": "question",
      "suggestions": [
        "Writing",
        "etc"
      ],
      "image": "/img/steps/strengths/question/1.png"
    },
    {
      "id": "2",
      "sender": "ai" as const,
      "content": "What type of tasks are you doing when you feel the most energized and productive?",
      "timestamp": "01:14 PM",
      "type": "text" as const,
      "messageId": "msg-2",
      "componentId": "comp-2",
      "uiToolType": "question",
      "suggestions": [
        "Repetitive Tasks",
        "etc"
      ],
      "image": "/img/steps/strengths/question/2.png"
    },
    {
      "id": "3",
      "sender": "ai" as const,
      "content": "What skill have people always complimented you on?",
      "timestamp": "01:14 PM",
      "type": "text" as const,
      "messageId": "msg-3",
      "componentId": "comp-1755459042228",
      "uiToolType": "question",
      "suggestions": [
        "Public Speaking",
        "etc"
      ],
      "image": "/img/steps/strengths/question/3.png"
    },
    {
      "id": "4",
      "sender": "ai" as const,
      "content": "What would your closest friends and family say are your natural talents?",
      "timestamp": "01:14 PM",
      "type": "text" as const,
      "messageId": "msg-4",
      "componentId": "comp-1755459253440",
      "uiToolType": "question",
      "suggestions": [
        "Reliability",
        "etc"
      ],
      "image": "/img/steps/strengths/question/4.png"
    },
    {
      "id": "5",
      "sender": "ai" as const,
      "content": "What do you get so involved with that you lose track of time?",
      "timestamp": "01:14 PM",
      "type": "text" as const,
      "messageId": "msg-5",
      "componentId": "comp-1755460172767",
      "uiToolType": "question",
      "suggestions": [
        "Reading",
        "etc"
      ],
      "image": "/img/steps/strengths/question/5.png"
    }
  ],
  "orphanMessageIds": [],
  "lastSaved": "2025-08-17T19:51:25.152Z"
};

export default defaultState; 