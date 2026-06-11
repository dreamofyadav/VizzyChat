// src/pages/ChatPage.jsx
import React from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import Header from '../components/Header/Header';
import ChatThread from '../components/Chat/ChatThread';
import InputBar from '../components/Input/InputBar';
import WelcomeScreen from '../components/Welcome/WelcomeScreen';
import useStore from '../store/useStore';
import useChat from '../hooks/useChat';
import styles from './ChatPage.module.css';

export default function ChatPage() {
  const { sidebarOpen, messages } = useStore();
  const { sendMessage, isGenerating } = useChat();
  const hasMessages = messages.length > 0;

  return (
    // <div className={styles.shell}>
    //   <Sidebar />
    //   <div className={`${styles.main} ${!sidebarOpen ? styles.full : ''}`}>
    //     <Header />
    //     <div className={styles.body}>
    //       {!hasMessages ? (
    //         <WelcomeScreen onPrompt={sendMessage} />
    //       ) : (
    //         <ChatThread />
    //       )}
    //     </div>
    //     <InputBar onSend={sendMessage} disabled={isGenerating} />
    //   </div>
    // </div>


    <div className={styles.shell}>
       <Sidebar />
       <div className={`${styles.main} ${!sidebarOpen ? styles.full : ''}`}>
        <Header />

    <div className={styles.body}>
  {!hasMessages ? (
    <WelcomeScreen onPrompt={sendMessage} />
  ) : (
    <>
      <ChatThread />

      {isGenerating && (
        <div className={styles.typingWrapper}>
          <div className={styles.typingDots}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </>
  )}
</div>

 <InputBar
          onSend={sendMessage}
          disabled={isGenerating}
        />
      </div>
    </div>
  );
}
