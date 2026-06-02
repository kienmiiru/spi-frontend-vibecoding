import React, { useRef } from 'react';

const BulletedTextArea = ({ value = '', onChange, placeholder = 'Mulai menulis daftar...' }) => {
    const textareaRef = useRef(null);
    const mirrorRef = useRef(null);

    // Sync scrolling between the textarea and the background mirror
    const handleScroll = () => {
        if (mirrorRef.current && textareaRef.current) {
            mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    // CRITICAL: These styles MUST be identical for both elements 
    // so the text wraps at the exact same breakpoints.
    const sharedStyles = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        lineHeight: '1.6',
        padding: '12px',
        paddingLeft: '36px', // Extra padding on the left to make room for bullets
        width: '100%',
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        border: 'none',
        outline: 'none',
        margin: 0,
    };

    // Split purely by hard returns (newlines)
    const lines = value.split('\n');

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '180px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: '#ffffff'
            }}
        >
            {/* BACKGROUND LAYER (Mirror) - Handles the bullets */}
            <div
                ref={mirrorRef}
                aria-hidden="true"
                style={{
                    ...sharedStyles,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    overflowY: 'hidden', // Scroll is controlled by the textarea
                    backgroundColor: '#f9fafb',
                    color: 'transparent', // Make text invisible, but keep its physical space
                    pointerEvents: 'none', // Let clicks pass right through to the textarea
                    zIndex: 1,
                }}
            >
                {lines.map((line, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                        <span
                            style={{
                                position: 'absolute',
                                left: '-20px',
                                color: '#9ca3af', // Visible color for the bullet
                                userSelect: 'none',
                            }}
                        >
                            •
                        </span>
                        {/* Render the transparent text. If the line is empty (e.g., user just pressed Enter), 
                render a <br /> so the div maintains its physical height. */}
                        {line || <br />}
                    </div>
                ))}
            </div>

            {/* FOREGROUND LAYER (Textarea) - Handles user input */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange && onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                style={{
                    ...sharedStyles,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    resize: 'none', // Disable user resize to prevent sync breaking
                    backgroundColor: 'transparent', // Let the background mirror show through
                    color: '#1f2937', // Actual text color
                    zIndex: 2,
                }}
            />
        </div>
    );
};

export default BulletedTextArea;