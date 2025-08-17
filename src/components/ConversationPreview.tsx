import { useEffect, useRef, useState, Fragment, useCallback } from "react";
import "./ConversationPreview.css";
import defaultState from "../defaultState";

type MessageType = "text" | "card" | "pills";

type MultiSelectOption = {
  text: string;
  image?: string;
  icon?: string;
};

type Message = {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: string;
  messageId?: string; // Links to node messageId
  componentId?: string; // Links to component data
  userResponseId?: string; // Links to user response placeholder
  type: MessageType;
  uiToolType?: string;
  showDropdown?: boolean;
  suggestions?: string[];
  image?: string;
  multiSelectOptions?: MultiSelectOption[];
  maxSelection?: number;
  bannerText?: string; // Banner add-on text
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

const mockConversation: Message[] = [];

export default function ConversationPreview() {
  const messagesRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockConversation);
  const [orphanMessageIds, setOrphanMessageIds] = useState<Set<string>>(new Set());
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ messageId: string; componentName: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rightClickedMessageId?: string; } | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testStartMessageId, setTestStartMessageId] = useState<string | null>(null);
  const [testMessages, setTestMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSelectComponentPopup, setShowSelectComponentPopup] = useState(false);
  const [showExitTestWarning, setShowExitTestWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startTestMode = useCallback((messageId: string) => {
    setIsTestMode(true);
    setTestStartMessageId(messageId);
    
    // Find the selected message and all messages that come before it
    const messageIndex = messages.findIndex(msg => msg.messageId === messageId);
    if (messageIndex !== -1) {
      const testMessagesToShow = messages.slice(0, messageIndex + 1);
      setTestMessages(testMessagesToShow);
      
      // Smooth scroll to the selected message with variable velocity
      setTimeout(() => {
        const messageElement = messageRefs.current[messageId];
        const messagesContainer = messagesRef.current;
        if (messageElement && messagesContainer) {
          const containerRect = messagesContainer.getBoundingClientRect();
          const messageRect = messageElement.getBoundingClientRect();
          const targetScrollTop = messagesContainer.scrollTop + (messageRect.top - containerRect.top) - (containerRect.height / 2) + (messageRect.height / 2);
          
          // Smooth scroll with easing
          const startScrollTop = messagesContainer.scrollTop;
          const distance = targetScrollTop - startScrollTop;
          const duration = Math.min(Math.max(Math.abs(distance) * 0.5, 300), 800); // Variable duration based on distance
          const startTime = performance.now();
          
          const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
          
          const animateScroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            
            messagesContainer.scrollTop = startScrollTop + (distance * easedProgress);
            
            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            }
          };
          
          requestAnimationFrame(animateScroll);
        }
      }, 100);
    }
    
    // Focus the input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 200);
    
    // Dispatch event to gray out canvas
    const event = new CustomEvent("enterTestMode", {
      detail: { messageId },
    });
    window.dispatchEvent(event);
  }, [messages]);

  const exitTestMode = () => {
    setIsTestMode(false);
    setTestStartMessageId(null);
    setTestMessages([]);
    setInputValue("");
    setShowSelectComponentPopup(false);
    setShowExitTestWarning(false);
    
    // Dispatch event to restore canvas
    const event = new CustomEvent("exitTestMode");
    window.dispatchEvent(event);
  };

  // Load default state on mount
  useEffect(() => {
    if (defaultState.messages.length > 0) {
      // Process messages to include banner data from components
      const processedMessages = defaultState.messages.map(message => {
        const component = (defaultState.components as any)[message.componentId];
        if (component && component.content.banner?.text) {
          return {
            ...message,
            bannerText: component.content.banner.text
          };
        }
        return message;
      });
      
      setMessages(processedMessages);
      setOrphanMessageIds(new Set(defaultState.orphanMessageIds || []));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedMessageIds.size > 0 && !isTestMode) {
        event.preventDefault();
        
        // Get all selected message IDs
        const selectedMessageIdsArray = Array.from(selectedMessageIds);
        
        // Get component names for confirmation
        const componentNames = selectedMessageIdsArray.map(messageId => {
          const message = messages.find(m => m.messageId === messageId);
          return message?.content || "Component";
        });
        
        const componentNameText = selectedMessageIdsArray.length === 1 
          ? componentNames[0] 
          : `${selectedMessageIdsArray.length} components`;
        
        setDeleteConfirmation({ 
          messageId: selectedMessageIdsArray.join(','), 
          componentName: componentNameText 
        });
      }
    };

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

    const handleEditWindowClose = () => {
      setHighlightedMessageId(null);
    };

    const handleAddMessage = (event: CustomEvent) => {
      const { messageId, componentId, uiToolType, showDropdown } = event.detail;
      
      // Generate a unique ID that doesn't conflict with existing messages
      const existingIds = messages.map(msg => parseInt(msg.id));
      const maxId = Math.max(...existingIds, 0);
      const newId = (maxId + 1).toString();
      
      const newMessage: Message = {
        id: newId,
        sender: "ai",
        content: uiToolType === "banner" ? "New banner" : "New component added", // Will be updated by component data event
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messageId,
        componentId,
        type: "text",
        uiToolType,
        showDropdown,
      };
      
      setMessages(prev => [...prev, newMessage]);
    };

    const handleUpdateMessage = (event: CustomEvent) => {
      const { messageId, uiToolType, showDropdown } = event.detail;
      setMessages(prev => 
        prev.map(msg => 
          msg.messageId === messageId 
            ? { 
                ...msg, 
                uiToolType, 
                showDropdown,
                // Update content based on new uiToolType
                content: uiToolType === "banner" ? "New banner" : msg.content
              }
            : msg
        )
      );
    };

    const handleDeleteMessage = (event: CustomEvent) => {
      const { messageId } = event.detail;
      setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
    };

    const handleSyncMessageOrder = (event: CustomEvent) => {
      const { order, orphanIds } = event.detail;
      
      // Update orphan status
      setOrphanMessageIds(new Set(orphanIds || []));
      
      // Reorder messages based on the calculated order
      setMessages(prev => {
        const messageMap = new Map(prev.map(msg => [msg.messageId, msg]));
        const orderedMessages: Message[] = [];
        
        // Add messages in the calculated order
        order.forEach((messageId: string) => {
          const message = messageMap.get(messageId);
          if (message) {
            orderedMessages.push(message);
            messageMap.delete(messageId);
          }
        });
        
        // Add any remaining messages (orphans) at the end
        messageMap.forEach(message => {
          orderedMessages.push(message);
        });
        
        return orderedMessages;
      });
    };

    const handleNodeSelection = (event: CustomEvent) => {
      const { selectedMessageIds } = event.detail;
      setSelectedMessageIds(new Set(selectedMessageIds));
      
      // If we're waiting for a component selection for test mode, start test mode
      if (showSelectComponentPopup && selectedMessageIds.length > 0) {
        setShowSelectComponentPopup(false);
        startTestMode(selectedMessageIds[0]);
      }
    };

    const handleUpdateMessageContent = (event: CustomEvent) => {
      const { messageId, content } = event.detail;
      setMessages(prev => 
        prev.map(msg => 
          msg.messageId === messageId 
            ? { ...msg, content }
            : msg
        )
      );
    };

    const handleUpdateComponentData = (event: CustomEvent) => {
      const { messageId, componentData } = event.detail;
      setMessages(prev => 
        prev.map(msg => 
          msg.messageId === messageId 
            ? { 
                ...msg, 
                content: componentData.uiToolType === "banner" 
                  ? componentData.content.banner?.text || "New banner"
                  : componentData.uiToolType === "question"
                  ? componentData.content.question?.text || "New question"
                  : componentData.uiToolType === "multiSelect"
                  ? componentData.content.multiSelect?.text || "New multi-select question"
                  : componentData.content.message?.text || "New component added",
                uiToolType: componentData.uiToolType,
                bannerText: componentData.content.banner?.text || undefined,
                suggestions: componentData.uiToolType === "question" 
                  ? componentData.content.question?.suggestions || []
                  : undefined,
                image: componentData.uiToolType === "question"
                  ? componentData.content.question?.image || undefined
                  : undefined,
                multiSelectOptions: componentData.uiToolType === "multiSelect"
                  ? componentData.content.multiSelect?.options || []
                  : undefined,
                maxSelection: componentData.uiToolType === "multiSelect"
                  ? componentData.content.multiSelect?.maxSelection || 1
                  : undefined
              }
            : msg
        )
      );
    };

    const handleGetCurrentMessages = (event: CustomEvent) => {
      const { callback } = event.detail;
      callback(messages);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scrollToMessage", handleScrollToMessage as EventListener);
    window.addEventListener("highlightMessage", handleHighlightMessage as EventListener);
    window.addEventListener("unhighlightMessage", handleUnhighlightMessage as EventListener);
    window.addEventListener("editWindowClose", handleEditWindowClose as EventListener);
    window.addEventListener("addMessage", handleAddMessage as EventListener);
    window.addEventListener("updateMessage", handleUpdateMessage as EventListener);
    window.addEventListener("deleteMessage", handleDeleteMessage as EventListener);
    window.addEventListener("syncMessageOrder", handleSyncMessageOrder as EventListener);
    window.addEventListener("nodeSelection", handleNodeSelection as EventListener);
    window.addEventListener("updateMessageContent", handleUpdateMessageContent as EventListener);
    window.addEventListener("updateComponentData", handleUpdateComponentData as EventListener);
    window.addEventListener("getCurrentMessages", handleGetCurrentMessages as EventListener);
    window.addEventListener("showExitTestWarning", () => setShowExitTestWarning(true));

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scrollToMessage", handleScrollToMessage as EventListener);
          window.removeEventListener("highlightMessage", handleHighlightMessage as EventListener);
    window.removeEventListener("unhighlightMessage", handleUnhighlightMessage as EventListener);
    window.removeEventListener("editWindowClose", handleEditWindowClose as EventListener);
    window.removeEventListener("addMessage", handleAddMessage as EventListener);
      window.removeEventListener("updateMessage", handleUpdateMessage as EventListener);
      window.removeEventListener("deleteMessage", handleDeleteMessage as EventListener);
      window.removeEventListener("syncMessageOrder", handleSyncMessageOrder as EventListener);
      window.removeEventListener("nodeSelection", handleNodeSelection as EventListener);
      window.removeEventListener("updateMessageContent", handleUpdateMessageContent as EventListener);
      window.removeEventListener("updateComponentData", handleUpdateComponentData as EventListener);
      window.removeEventListener("getCurrentMessages", handleGetCurrentMessages as EventListener);
      window.removeEventListener("showExitTestWarning", () => setShowExitTestWarning(true));
    };
  }, [messages, showSelectComponentPopup, startTestMode]);

  const renderMessageContent = (message: Message) => {
    // Check if this is a banner type message (legacy - should be removed)
    if (message.uiToolType === "banner") {
      return (
        <div className="message-banner">
          <h2 className="banner-title">{message.content}</h2>
        </div>
      );
    }
    
    // Render banner add-on if it exists
    const bannerContent = message.bannerText && (
      <div className="message-banner">
        <h2 className="banner-title">{message.bannerText}</h2>
      </div>
    );
    
    // Check if this is a question type message
    if (message.uiToolType === "question") {
      return (
        <>
          {bannerContent}
          <div className="message-question">
            <div className="question-card">
              <div className="question-top-section">
                {message.image && (
                  <div className="question-image">
                    <img src={message.image} alt="Question illustration" />
                  </div>
                )}
                <div className="question-text">{message.content}</div>
              </div>
            </div>
            {message.suggestions && message.suggestions.length > 0 && (
              // In test mode, only show suggestions for the selected component
              (!isTestMode || (isTestMode && message.messageId === testStartMessageId)) && (
                <div className="question-suggestions">
                  {message.suggestions.map((suggestion, index) => (
                    <button key={index} className="suggestion-button">
                      {suggestion}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      );
    }
    
    // Check if this is a multi select type message
    if (message.uiToolType === "multiSelect") {
      const hasImages = message.multiSelectOptions?.some(option => option.image);
      const maxSelection = message.maxSelection || 1;
      const selectedCount = 1; // Always show first option as selected
      
      return (
        <>
          {bannerContent}
          {/* Question text as regular chat text */}
          <div className="message-text">
            {message.content}
          </div>
          
          {/* Multi Select options */}
          <div className="message-multi-select">
            {/* Progress bar - always show when maxSelection > 1 */}
            {maxSelection > 1 && (
              <div className="multi-select-progress">
                <div 
                  className="multi-select-progress-fill"
                  style={{ width: `${(selectedCount / maxSelection) * 100}%` }}
                />
              </div>
            )}
            
            {message.multiSelectOptions && message.multiSelectOptions.length > 0 && (
              // In test mode, only show multi-select options for the selected component
              (!isTestMode || (isTestMode && message.messageId === testStartMessageId)) && (
                <div className={`multi-select-options ${hasImages ? 'has-images' : ''}`}>
                  {message.multiSelectOptions.map((option, index) => (
                    <button 
                      key={index} 
                      className={`multi-select-option ${index === 0 ? 'selected' : ''} ${option.image ? 'has-image' : ''}`}
                    >
                      {option.image && (
                        <div className="option-image">
                          <img src={option.image} alt={option.text} />
                        </div>
                      )}
                      <div className="option-content">
                        <span className="option-text">{option.text}</span>
                        {option.icon && (
                          <span className="option-icon">{option.icon}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </>
      );
    }
    
    // For regular message type, show the content in a text bubble
    if (message.uiToolType === "message" || !message.uiToolType) {
      return (
        <>
          {bannerContent}
          <div className="message-text">
            {message.content}
          </div>
        </>
      );
    }
    
    // For other UI tool types, we can add them later
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
        return (
          <div className="message-text">
            {message.content}
          </div>
        );
    }
  };

  return (
    <div 
      className={`conversation-preview ${isTestMode ? 'test-mode' : ''}`}
      onClick={(e) => {
        if (isTestMode && !(e.target as Element).closest('.conversation-input')) {
          setShowExitTestWarning(true);
        }
        // Close context menu when clicking outside
        if (contextMenu) {
          setContextMenu(null);
        }
      }}
    >
      {isTestMode && (
        <div className="status-bar">
          <div className="time">9:41</div>
          <div className="status-icons">
            <span className="material-icons signal">signal_cellular_alt</span>
            <span className="material-icons wifi">wifi</span>
            <span className="material-icons battery">battery_charging_full</span>
          </div>
        </div>
      )}
      <div className="conversation-header">
        <div className="hamburger-menu">☰</div>
        <h3></h3>
        <div className="profile-photo">
          <div className="profile-circle">R</div>
        </div>
      </div>

      <div className="conversation-messages" ref={messagesRef}>
                {(isTestMode ? testMessages : messages).map((message) => (
          <Fragment key={message.id}>
            <div
              className={`message ${message.sender} ${
                message.messageId && highlightedMessageId === message.messageId ? "message-node-highlighted" : ""
              } ${message.messageId && orphanMessageIds.has(message.messageId) ? "message-orphan" : ""} ${
                message.messageId && selectedMessageIds.has(message.messageId) ? "message-selected" : ""
              }`}
              ref={
                message.messageId
                  ? (el) => {
                      messageRefs.current[message.messageId!] = el;
                    }
                  : undefined
              }
              onMouseEnter={() => {
                if (!isTestMode && message.messageId) {
                  const event = new CustomEvent("highlightNode", {
                    detail: { messageId: message.messageId },
                  });
                  window.dispatchEvent(event);
                }
              }}
              onMouseLeave={() => {
                if (!isTestMode && message.messageId) {
                  const event = new CustomEvent("unhighlightNode", {
                    detail: { messageId: message.messageId },
                  });
                  window.dispatchEvent(event);
                }
              }}
              onClick={() => {
                if (!isTestMode && message.messageId) {
                  const event = new CustomEvent("selectNode", {
                    detail: { messageId: message.messageId },
                  });
                  window.dispatchEvent(event);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Only show context menu if message is selected and not in test mode
                if (!isTestMode && message.messageId && selectedMessageIds.has(message.messageId)) {
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    rightClickedMessageId: message.messageId
                  });
                }
              }}
            >
              {message.messageId && !isTestMode && (
                <>
                  <button
                    className="three-dots-menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isTestMode) {
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          rightClickedMessageId: message.messageId
                        });
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(0, 0, 0, 0.1)",
                      color: "#003250",
                      border: "none",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "none",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      transition: "background-color 0.2s ease",
                      outline: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0, 0, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(0, 0, 0, 0.1)";
                    }}
                  >
                    ⋯
                  </button>
                </>
              )}
              <div className="message-content">
                {renderMessageContent(message)}
              </div>
            </div>
            
            {/* Add user placeholder after AI messages (but not for Multi Select) */}
            {message.sender === "ai" && message.uiToolType !== "multiSelect" && (
              // Show placeholder in normal mode, or in test mode for messages before the selected one
              (!isTestMode || (isTestMode && message.messageId !== testStartMessageId)) && (
                <div className="message user placeholder">
                  <div className="message-content">
                    <div className="message-text" style={{
                      background: "#F2E8E0",
                      color: "#003250",
                      borderRadius: "18px 18px 0px 18px",
                      maxWidth: "80%",
                      width: "fit-content",
                      marginLeft: "auto",
                      textAlign: "right",
                      padding: "8px 24px",
                    }}>
                      User response placeholder
                    </div>
                  </div>
                </div>
              )
            )}
          </Fragment>
        ))}
      </div>

      <div className="conversation-input">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            if (isTestMode) return; // Already in test mode
            
            if (selectedMessageIds.size === 0) {
              setShowSelectComponentPopup(true);
            } else {
              const selectedMessageId = Array.from(selectedMessageIds)[0];
              startTestMode(selectedMessageId);
            }
          }}
          onBlur={() => {
            // Don't exit test mode on blur, only on clicking outside
          }}
          placeholder="Type your answer here..."
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #E9DDD3",
            borderRadius: "8px",
            fontSize: "14px",
            background: "white",
            outline: "none",
            color: "#003250",
          }}
        />
        <button className="send-button">Send</button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu-overlay"
          onClick={() => setContextMenu(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        >
          <div 
            className="context-menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: contextMenu.x - 150, // Offset to the left by menu width
              top: contextMenu.y,
              background: "white",
              border: "1px solid #E9DDD3",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              zIndex: 1001,
              minWidth: "150px",
            }}
          >
            <button
              onClick={() => {
                // Edit only the right-clicked component
                if (contextMenu.rightClickedMessageId) {
                  const event = new CustomEvent("openEditWindow", {
                    detail: { messageId: contextMenu.rightClickedMessageId },
                  });
                  window.dispatchEvent(event);
                }
                setContextMenu(null);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                color: "#F16B68",
                fontWeight: "600",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                borderBottom: "1px solid #E9DDD3",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F5F5F5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                // Get all selected message IDs
                const selectedMessageIdsArray = Array.from(selectedMessageIds);
                
                // Get component names for confirmation
                const componentNames = selectedMessageIdsArray.map(messageId => {
                  const message = messages.find(m => m.messageId === messageId);
                  return message?.content || "Component";
                });
                
                const componentNameText = selectedMessageIdsArray.length === 1 
                  ? componentNames[0] 
                  : `${selectedMessageIdsArray.length} components`;
                
                setDeleteConfirmation({ 
                  messageId: selectedMessageIdsArray.join(','), 
                  componentName: componentNameText 
                });
                setContextMenu(null);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                color: "#F16B68",
                fontWeight: "600",
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F5F5F5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="edit-window-overlay">
          <div className="edit-window">
            <div className="edit-window-header">
              <h4>Delete Component</h4>
            </div>
            <div className="edit-window-content">
              <p>Are you sure you want to delete "{deleteConfirmation.componentName}"?</p>
              <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="edit-window-footer">
              <button
                className="save-btn"
                onClick={() => {
                  const messageIds = deleteConfirmation.messageId.split(',');
                  
                  // Delete from preview
                  setMessages(prev => prev.filter(msg => !messageIds.includes(msg.messageId || '')));
                  
                  // Dispatch events to delete from canvas
                  messageIds.forEach(messageId => {
                    const event = new CustomEvent("deleteNode", {
                      detail: { messageId },
                    });
                    window.dispatchEvent(event);
                  });
                  
                  setDeleteConfirmation(null);
                }}
                style={{
                  background: "#F16B68",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                Delete
              </button>
              <button
                className="cancel-btn"
                onClick={() => setDeleteConfirmation(null)}
                style={{
                  background: "#E9DDD3",
                  color: "#003250",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginLeft: "8px",
                  outline: "none",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Component Popup */}
      {showSelectComponentPopup && (
        <div className="edit-window-overlay">
          <div className="edit-window">
            <div className="edit-window-header">
              <h4>Select Component</h4>
            </div>
            <div className="edit-window-content">
              <p>Please select a component in the canvas to test the conversation flow from that point.</p>
            </div>
            <div className="edit-window-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowSelectComponentPopup(false)}
                style={{
                  background: "#E9DDD3",
                  color: "#003250",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Test Mode Warning */}
      {showExitTestWarning && (
        <div className="edit-window-overlay">
          <div className="edit-window">
            <div className="edit-window-header">
              <h4>Exit Test Mode</h4>
            </div>
            <div className="edit-window-content">
              <p>Are you sure you want to exit test mode?</p>
              <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                Your test conversation history will be lost.
              </p>
            </div>
            <div className="edit-window-footer">
              <button
                className="save-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  exitTestMode();
                }}
                style={{
                  background: "#F16B68",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = "0 0 0 2px rgba(241, 107, 104, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = "none";
                }}
              >
                Exit Test Mode
              </button>
              <button
                className="cancel-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowExitTestWarning(false);
                }}
                style={{
                  background: "#E9DDD3",
                  color: "#003250",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  marginLeft: "8px",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = "0 0 0 2px rgba(241, 107, 104, 0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = "none";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
