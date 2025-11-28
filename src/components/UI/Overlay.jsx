import React, { useState } from 'react';

const Overlay = ({ selectedGreeting, setSelectedGreeting, particleColor, setParticleColor }) => {
    const [isVisible, setIsVisible] = useState(false);

    const greetings = [
        { id: '生日快乐', label: '生日快乐' },
        { id: '新年快乐', label: '新年快乐' },
        { id: '圣诞快乐', label: '圣诞快乐' },
        { id: '新婚快乐', label: '新婚快乐' },
    ];

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: isVisible ? 'auto' : 'none',
                zIndex: 10,
            }}
        >
            {/* Invisible trigger area */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'auto',
                }}
                onClick={() => setIsVisible(!isVisible)}
            />

            {/* Control Panel */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: `translateX(-50%) translateY(${isVisible ? '0' : '150%'})`,
                    width: '90%',
                    maxWidth: '500px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    transition: 'transform 0.3s ease-in-out',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    pointerEvents: 'auto',
                }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking panel
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>设置</span>
                    <button
                        onClick={() => setIsVisible(false)}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>粒子颜色</label>
                    <input
                        type="color"
                        value={particleColor}
                        onChange={(e) => setParticleColor(e.target.value)}
                        style={{ width: '100%', height: '40px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>祝福语</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {greetings.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedGreeting(item.id)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '15px',
                                    border: 'none',
                                    backgroundColor: selectedGreeting === item.id ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.2)',
                                    color: selectedGreeting === item.id ? 'black' : 'white',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overlay;
