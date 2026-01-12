import React, { useState, useEffect, useRef } from 'react';
import Scene from './components/Scene';
import Overlay from './components/UI/Overlay';
import HandTracker from './components/HandTracker';
import StartScreen from './components/UI/StartScreen';
import { playScatter, playGather } from './utils/audio';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [handState, setHandState] = useState({ isOpen: true, position: [0, 0, 0] });
  const [selectedGreeting, setSelectedGreeting] = useState('生日快乐');
  const [sequenceIndex, setSequenceIndex] = useState(0); // 0: '3', 1: '2', 2: '1', 3: Greeting
  const [activeShape, setActiveShape] = useState('3');
  const [particleColor, setParticleColor] = useState('#FF0000'); // Default Red

  const wasOpenRef = useRef(true);
  const handTrackerRef = useRef(null);

  // Sequence mapping
  const getShapeFromIndex = (index) => {
    switch (index) {
      case 0: return '3';
      case 1: return '2';
      case 2: return '1';
      case 3: return selectedGreeting;
      default: return '3';
    }
  };

  useEffect(() => {
    if (!hasStarted) return;

    // Logic:
    // Hand Open -> Scatter
    // Hand Close -> Gather & Next Shape

    if (handState.isDetected) {
      if (handState.isOpen && !wasOpenRef.current) {
        // Just opened
        playScatter();
      } else if (!handState.isOpen && wasOpenRef.current) {
        // Just closed
        playGather();
        setSequenceIndex(prev => {
          const next = (prev + 1) % 4;
          return next;
        });
      }
    }

    wasOpenRef.current = handState.isOpen;
  }, [handState.isOpen, handState.isDetected, hasStarted]);

  useEffect(() => {
    setActiveShape(getShapeFromIndex(sequenceIndex));
  }, [sequenceIndex, selectedGreeting]);

  return (
    <>
      <HandTracker ref={handTrackerRef} onHandUpdate={setHandState} />

      {!hasStarted && (
        <StartScreen
          onStart={() => {
            handTrackerRef.current?.start?.();
            setHasStarted(true);
          }}
        />
      )}

      {hasStarted && (
        <>
          <Scene
            handState={handState}
            activeShape={activeShape}
            particleColor={particleColor}
          />
          <Overlay
            selectedGreeting={selectedGreeting}
            setSelectedGreeting={setSelectedGreeting}
            particleColor={particleColor}
            setParticleColor={setParticleColor}
          />
        </>
      )}
    </>
  );
}

export default App;
