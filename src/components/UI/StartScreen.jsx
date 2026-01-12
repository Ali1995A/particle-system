import React from 'react';

const StartScreen = ({ onStart }) => {
    const handleStart = () => {
        // iOS Safari 需要保持“用户手势”链路来触发摄像头权限弹窗，
        // 所以先同步开始（请求摄像头），全屏放到后面非阻塞执行。
        onStart?.();

        try {
            const elem = document.documentElement;
            const p =
                elem.requestFullscreen?.() ||
                elem.webkitRequestFullscreen?.() ||
                elem.msRequestFullscreen?.();
            if (p?.catch) {
                p.catch((err) => {
                    console.log('Fullscreen request failed:', err);
                });
            }
        } catch (err) {
            console.log('Fullscreen request failed:', err);
        }
    };

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'black',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 100,
                color: 'white',
                textAlign: 'center',
            }}
        >
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
                3D 粒子系统
            </h1>
            <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
                交互式手势追踪体验
            </p>
            <button
                onClick={handleStart}
                style={{
                    padding: '15px 40px',
                    fontSize: '1.2rem',
                    backgroundColor: 'white',
                    color: 'black',
                    border: 'none',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 0 20px rgba(255,255,255,0.3)',
                    transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
                开始体验
            </button>
            <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.5 }}>
                需要摄像头权限
            </p>
        </div>
    );
};

export default StartScreen;
