// src/components/Chat/MessageBubble.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import ImageGrid from '../ImageGrid/ImageGrid';
import styles from './MessageBubble.module.css';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`${styles.row} ${isUser ? styles.userRow : ''}`}>
      <div className={`${styles.avatar} ${isUser ? styles.userAvatar : styles.assistantAvatar}`}>
        {isUser ? 'YOU' : 'V'}
      </div>

      <div className={`${styles.body} ${isUser ? styles.userBody : ''}`}>
        {/* Text bubble */}
        {/* {message.content && (
          <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
            {isUser ? (
              <span>{message.content}</span>
            ) : (
              <div className={styles.mdWrapper}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className={styles.p}>{children}</p>,
                    strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
                    em: ({ children }) => <em className={styles.em}>{children}</em>,
                    ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
                    li: ({ children }) => <li className={styles.li}>{children}</li>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.streaming && <span className={styles.cursor} />}
              </div>
            )}
          </div>
        )} */}


        {(message.content || (message.streaming && !isUser)) && (
            <div
              className={`${styles.bubble} ${
                isUser ? styles.userBubble : styles.assistantBubble
              }`}
            >
              {isUser ? (
                <span>{message.content}</span>
              ) : !message.content && message.streaming ? (
                <div className={styles.typingDots}>
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <div className={styles.mdWrapper}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className={styles.p}>{children}</p>,
                      strong: ({ children }) => (
                        <strong className={styles.strong}>{children}</strong>
                      ),
                      em: ({ children }) => <em className={styles.em}>{children}</em>,
                      ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
                      li: ({ children }) => <li className={styles.li}>{children}</li>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>

                  {message.streaming && <span className={styles.cursor} />}
                </div>
              )}
            </div>
          )}


        {/* Image grid — show when images are ready or jobs are loading */}
        {(message.images?.length > 0 || message.imageJobs?.length > 0) && (
          <ImageGrid
            images={message.images || []}
            jobs={message.imageJobs || []}
            loading={message.streaming}
          />
        )}

        {/* Error state */}
        {message.error && (
          <div className={styles.errorNote}>
            <i className="ti ti-alert-circle" /> Something went wrong — please try again
          </div>
        )}
      </div>
    </div>
  );
}
