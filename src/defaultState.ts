const defaultState = {
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
    },
    {
      id: "n-3",
      type: "card",
      position: {
        x: 1440,
        y: 120
      },
      data: {
        componentId: "comp-1755459042228",
        messageId: "msg-3"
      }
    },
    {
      id: "n-4",
      type: "card",
      position: {
        x: 1920,
        y: 120
      },
      data: {
        componentId: "comp-1755459253440",
        messageId: "msg-4"
      }
    },
    {
      id: "n-5",
      type: "card",
      position: {
        x: 2400,
        y: 120
      },
      data: {
        componentId: "comp-1755460172767",
        messageId: "msg-5"
      }
    },
    {
      id: "n-6",
      type: "card",
      position: {
        x: 480,
        y: -120
      },
      data: {
        componentId: "comp-1755470701901",
        messageId: "msg-6"
      }
    },
    {
      id: "n-7",
      type: "card",
      position: {
        x: 960,
        y: -120
      },
      data: {
        componentId: "comp-1755470761542",
        messageId: "msg-7"
      }
    },
    {
      id: "n-8",
      type: "card",
      position: {
        x: 1440,
        y: -120
      },
      data: {
        componentId: "comp-1755471082977",
        messageId: "msg-8"
      }
    },
    {
      id: "n-9",
      type: "card",
      position: {
        x: 1920,
        y: -120
      },
      data: {
        componentId: "comp-1755471271684",
        messageId: "msg-9"
      }
    },
    {
      id: "n-10",
      type: "card",
      position: {
        x: 2400,
        y: -360
      },
      data: {
        componentId: "comp-1755471536987",
        messageId: "msg-10"
      }
    },
    {
      id: "n-11",
      type: "card",
      position: {
        x: 2880,
        y: -120
      },
      data: {
        componentId: "comp-1755471715008",
        messageId: "msg-11"
      }
    },
    {
      id: "n-12",
      type: "card",
      position: {
        x: 3360,
        y: -120
      },
      data: {
        componentId: "comp-1755471835094",
        messageId: "msg-12"
      }
    },
    {
      id: "n-13",
      type: "card",
      position: {
        x: 2400,
        y: -240
      },
      data: {
        componentId: "comp-1755472046014",
        messageId: "msg-13"
      }
    },
    {
      id: "n-14",
      type: "card",
      position: {
        x: 2400,
        y: -120
      },
      data: {
        componentId: "comp-1755472089703",
        messageId: "msg-14"
      }
    }
  ],
  edges: [
    {
      id: "e-n-1-n-2",
      source: "n-1",
      target: "n-2"
    },
    {
      id: "e-n-2-n-3",
      source: "n-2",
      target: "n-3"
    },
    {
      id: "e-n-3-n-4",
      source: "n-3",
      target: "n-4"
    },
    {
      id: "e-n-4-n-5",
      source: "n-4",
      target: "n-5"
    },
    {
      id: "e-n-6-n-7",
      source: "n-6",
      target: "n-7"
    },
    {
      id: "e-n-7-n-8",
      source: "n-7",
      target: "n-8"
    },
    {
      id: "e-n-8-n-9",
      source: "n-8",
      target: "n-9"
    },
    {
      id: "e-n-9-n-10",
      source: "n-9",
      target: "n-10"
    },
    {
      id: "e-n-10-n-11",
      source: "n-10",
      target: "n-11"
    },
    {
      id: "e-n-11-n-12",
      source: "n-11",
      target: "n-12"
    },
    {
      id: "xy-edge__n-12-n-1",
      source: "n-12",
      target: "n-1"
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
        },
        banner: {
          text: "Strengths",
          type: "default"
        },
        text: {
          text: "Awesome - now that we've got a feel for your personality, let's dig into your strengths.\n\nYou'll see a few sample answers to guide you. Feel free to click one that fits, but writing in detail in your own words is the best.",
          type: "default"
        }
      },
      createdAt: "2025-08-17T17:44:02.626Z",
      updatedAt: "2025-08-17T22:29:42.498Z"
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
    },
    "comp-1755459042228": {
      id: "comp-1755459042228",
      name: "Strengths Q3",
      slug: "01.01.03",
      uiToolType: "question",
      content: {
        question: {
          text: "What skill have people always complimented you on?",
          options: [],
          suggestions: [
            "Public Speaking",
            "etc"
          ],
          image: "/img/steps/strengths/question/3.png"
        }
      },
      createdAt: "2025-08-17T19:30:42.229Z",
      updatedAt: "2025-08-17T19:51:14.438Z"
    },
    "comp-1755459253440": {
      id: "comp-1755459253440",
      name: "Strengths Q4",
      slug: "01.01.04",
      uiToolType: "question",
      content: {
        question: {
          text: "What would your closest friends and family say are your natural talents?",
          options: [],
          suggestions: [
            "Reliability",
            "etc"
          ],
          image: "/img/steps/strengths/question/4.png"
        }
      },
      createdAt: "2025-08-17T19:34:13.440Z",
      updatedAt: "2025-08-17T19:50:55.874Z"
    },
    "comp-1755460172767": {
      id: "comp-1755460172767",
      name: "Strengths Q5",
      slug: "01.01.05",
      uiToolType: "question",
      content: {
        question: {
          text: "What do you get so involved with that you lose track of time?",
          options: [],
          suggestions: [
            "Reading",
            "etc"
          ],
          image: "/img/steps/strengths/question/5.png"
        }
      },
      createdAt: "2025-08-17T19:49:32.767Z",
      updatedAt: "2025-08-17T19:50:39.395Z"
    },
    "comp-1755470701901": {
      id: "comp-1755470701901",
      name: "About Me ",
      slug: "00.01.01",
      uiToolType: "message",
      content: {
        message: {
          text: "Welcome to Ignite! What would you like to be called?\n\n(You can click your first name, full name, or type a nickname.)",
          richText: true
        }
      },
      createdAt: "2025-08-17T22:45:01.901Z",
      updatedAt: "2025-08-17T22:48:31.571Z"
    },
    "comp-1755470761542": {
      id: "comp-1755470761542",
      name: "Professional Future Self Assessment",
      slug: "00.02.01",
      uiToolType: "multiSelect",
      content: {
        multiSelect: {
          text: "Hey {{name}}, we'll ask a few quick questions to start building your Personal Profile:\n\nHow are you thinking about your professional future right now?",
          options: [
            {
              text: "I'm not certain about my professional future."
            },
            {
              text: "I'm confident about my professional future."
            },
            {
              text: "I'm about to graduate or just did."
            },
            {
              text: "I've got career experience."
            }
          ]
        }
      },
      createdAt: "2025-08-17T22:46:01.542Z",
      updatedAt: "2025-08-17T23:07:18.415Z"
    },
    "comp-1755471082977": {
      id: "comp-1755471082977",
      name: "What's Most Useful",
      slug: "00.03.01",
      uiToolType: "multiSelect",
      content: {
        multiSelect: {
          text: "What sounds most useful to you right now?",
          options: [
            {
              text: "Finding career clarity"
            },
            {
              text: "Creating an authentic professional profile"
            },
            {
              text: "Making valuable professional connections"
            },
            {
              text: "Career coaching and mentorship"
            },
            {
              text: "Help finding values-matched employer"
            }
          ]
        }
      },
      createdAt: "2025-08-17T22:51:22.977Z",
      updatedAt: "2025-08-17T22:53:43.349Z"
    },
    "comp-1755471271684": {
      id: "comp-1755471271684",
      name: "Top 3 Goals",
      slug: "00.04.01",
      uiToolType: "multiSelect",
      content: {
        multiSelect: {
          text: "What are your top 3 goals that Ignite might help you with?",
          options: [
            {
              text: "Finding the right career",
              image: "/img/onboarding/finding-the-right-career.png"
            },
            {
              text: "Networking Opportunities",
              image: "/img/onboarding/networking-opportunities.png"
            },
            {
              text: "Leadership Development",
              image: "/img/onboarding/leadership-development.png"
            },
            {
              text: "Getting a Job",
              image: "/img/onboarding/getting-a-job.png"
            },
            {
              text: "Career Growth",
              image: "/img/onboarding/career-growth.png"
            },
            {
              text: "Personal Growth",
              image: "/img/onboarding/personal-growth.png"
            }
          ]
        }
      },
      createdAt: "2025-08-17T22:54:31.684Z",
      updatedAt: "2025-08-17T23:06:44.180Z"
    },
    "comp-1755471536987": {
      id: "comp-1755471536987",
      name: "School Forms - Current",
      slug: "00.05.01",
      uiToolType: "message",
      content: {
        message: {
          text: "[Placeholder for form tool that exists in code but hasn't been added to this prototype yet.]",
          richText: true
        },
        banner: {
          text: "School forms",
          type: "default"
        }
      },
      createdAt: "2025-08-17T22:58:56.987Z",
      updatedAt: "2025-08-17T23:03:51.648Z"
    },
    "comp-1755471715008": {
      id: "comp-1755471715008",
      name: "Show Tracks Drawer",
      slug: "00.06.01",
      uiToolType: "message",
      content: {
        message: {
          text: "[Placeholder for show tracks drawer tool that exists in code but hasn't been added to this prototype yet.]",
          richText: true
        },
        banner: {
          text: "Show tracks drawer",
          type: "default"
        }
      },
      createdAt: "2025-08-17T23:01:55.008Z",
      updatedAt: "2025-08-17T23:06:16.173Z"
    },
    "comp-1755471835094": {
      id: "comp-1755471835094",
      name: "Show Assessment",
      slug: "00.07.01",
      uiToolType: "message",
      content: {
        message: {
          text: "[Placeholder for show assessment tool that exists in code but hasn't been added to this prototype yet.]",
          richText: true
        },
        banner: {
          text: "Show assessment tool",
          type: "default"
        }
      },
      createdAt: "2025-08-17T23:03:55.094Z",
      updatedAt: "2025-08-17T23:05:51.901Z"
    },
    "comp-1755472046014": {
      id: "comp-1755472046014",
      name: "School Form - Previous",
      slug: "00.05.02",
      uiToolType: "message",
      content: {
        message: {
          text: "[placeholder for Previous School Form, still needs routing]",
          richText: true
        }
      },
      createdAt: "2025-08-17T23:07:26.014Z",
      updatedAt: "2025-08-17T23:09:32.746Z"
    },
    "comp-1755472089703": {
      id: "comp-1755472089703",
      name: "School Form - Planned",
      slug: "00.05.03",
      uiToolType: "message",
      content: {
        message: {
          text: "[placeholder for Planned School Form, still needs routing]",
          richText: true
        }
      },
      createdAt: "2025-08-17T23:08:09.703Z",
      updatedAt: "2025-08-17T23:10:21.942Z"
    }
  },
  messages: [
    {
      id: "6",
      sender: "ai" as const,
      content: "Welcome to Ignite! What would you like to be called?\n\n(You can click your first name, full name, or type a nickname.)",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-6",
      componentId: "comp-1755470701901",
      uiToolType: "message"
    },
    {
      id: "7",
      sender: "ai" as const,
      content: "Hey {{name}}, we'll ask a few quick questions to start building your Personal Profile:\n\nHow are you thinking about your professional future right now?",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-7",
      componentId: "comp-1755470761542",
      uiToolType: "multiSelect",
      multiSelectOptions: [
        {
          text: "I'm not certain about my professional future."
        },
        {
          text: "I'm confident about my professional future."
        },
        {
          text: "I'm about to graduate or just did."
        },
        {
          text: "I've got career experience."
        }
      ],
      maxSelection: 1
    },
    {
      id: "8",
      sender: "ai" as const,
      content: "What sounds most useful to you right now?",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-8",
      componentId: "comp-1755471082977",
      uiToolType: "multiSelect",
      multiSelectOptions: [
        {
          text: "Finding career clarity"
        },
        {
          text: "Creating an authentic professional profile"
        },
        {
          text: "Making valuable professional connections"
        },
        {
          text: "Career coaching and mentorship"
        },
        {
          text: "Help finding values-matched employer"
        }
      ],
      maxSelection: 1
    },
    {
      id: "9",
      sender: "ai" as const,
      content: "What are your top 3 goals that Ignite might help you with?",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-9",
      componentId: "comp-1755471271684",
      uiToolType: "multiSelect",
      multiSelectOptions: [
        {
          text: "Finding the right career",
          image: "/img/onboarding/finding-the-right-career.png"
        },
        {
          text: "Networking Opportunities",
          image: "/img/onboarding/networking-opportunities.png"
        },
        {
          text: "Leadership Development",
          image: "/img/onboarding/leadership-development.png"
        },
        {
          text: "Getting a Job",
          image: "/img/onboarding/getting-a-job.png"
        },
        {
          text: "Career Growth",
          image: "/img/onboarding/career-growth.png"
        },
        {
          text: "Personal Growth",
          image: "/img/onboarding/personal-growth.png"
        }
      ],
      maxSelection: 1
    },
    {
      id: "10",
      sender: "ai" as const,
      content: "[Placeholder for form tool that exists in code but hasn't been added to this prototype yet.]",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-10",
      componentId: "comp-1755471536987",
      uiToolType: "message"
    },
    {
      id: "11",
      sender: "ai" as const,
      content: "[Placeholder for show tracks drawer tool that exists in code but hasn't been added to this prototype yet.]",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-11",
      componentId: "comp-1755471715008",
      uiToolType: "message"
    },
    {
      id: "12",
      sender: "ai" as const,
      content: "[Placeholder for show assessment tool that exists in code but hasn't been added to this prototype yet.]",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-12",
      componentId: "comp-1755471835094",
      uiToolType: "message"
    },
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
    },
    {
      id: "3",
      sender: "ai" as const,
      content: "What skill have people always complimented you on?",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-3",
      componentId: "comp-1755459042228",
      uiToolType: "question",
      suggestions: [
        "Public Speaking",
        "etc"
      ],
      image: "/img/steps/strengths/question/3.png"
    },
    {
      id: "4",
      sender: "ai" as const,
      content: "What would your closest friends and family say are your natural talents?",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-4",
      componentId: "comp-1755459253440",
      uiToolType: "question",
      suggestions: [
        "Reliability",
        "etc"
      ],
      image: "/img/steps/strengths/question/4.png"
    },
    {
      id: "5",
      sender: "ai" as const,
      content: "What do you get so involved with that you lose track of time?",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-5",
      componentId: "comp-1755460172767",
      uiToolType: "question",
      suggestions: [
        "Reading",
        "etc"
      ],
      image: "/img/steps/strengths/question/5.png"
    },
    {
      id: "13",
      sender: "ai" as const,
      content: "[placeholder for Previous School Form, still needs routing]",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-13",
      componentId: "comp-1755472046014",
      uiToolType: "message"
    },
    {
      id: "14",
      sender: "ai" as const,
      content: "[placeholder for Planned School Form, still needs routing]",
      timestamp: "01:14 PM",
      type: "text" as const,
      messageId: "msg-14",
      componentId: "comp-1755472089703",
      uiToolType: "message"
    }
  ],
  orphanMessageIds: [],
  lastSaved: "2025-08-17T23:11:51.824Z"
};

export default defaultState; 