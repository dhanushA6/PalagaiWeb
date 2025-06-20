import React, { useState, useEffect, useRef, forwardRef } from 'react';

const TamilAudioPlayer = forwardRef(({ selectedShapeId }, ref) => {
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const playPromiseRef = useRef(null);

  // Cleanup previous play promise and audio
  const cleanup = () => {
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {});
      playPromiseRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Reset and load new audio when selectedShapeId changes
  useEffect(() => {
    cleanup();
    setAudioLoaded(false);
    setIsPlaying(false);
    setError(null);

    if (selectedShapeId) {
      try {
        const audioPath = require(`../audio/Ezhutholi_new/${selectedShapeId}.mp3`);
        if (audioRef.current) {
          audioRef.current.src = audioPath;
        }
      } catch (err) {
        console.warn(`Audio file not found for ${selectedShapeId}`);
        setError(`Audio not available for ${formatLetterName(selectedShapeId)}`);
      }
    }

    return () => {
      cleanup();
    };
  }, [selectedShapeId]);

  const handleAudioLoaded = () => {
    if (!audioRef.current) return;
    setAudioLoaded(true);
    setError(null);
    audioRef.current.volume = 1.0;

    playPromiseRef.current = audioRef.current.play();
    playPromiseRef.current
      .then(() => setIsPlaying(true))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Auto-play failed:", err);
          setError("audio issue");
        }
      });
  };

  const handleAudioError = () => {
    setAudioLoaded(false);
    setError(`Audio not available for ${formatLetterName(selectedShapeId)}`);
  };

  const playAudio = () => {
    if (!audioRef.current || !audioLoaded) return;

    if (isPlaying) {
      cleanup();
      setIsPlaying(false);
      setTimeout(() => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        playPromiseRef.current = audioRef.current.play();
        playPromiseRef.current
          .then(() => setIsPlaying(true))
          .catch(err => {
            if (err.name !== 'AbortError') {
              console.error("Play failed:", err);
              setError("Could not play audio");
            }
          });
      }, 100);
    } else {
      audioRef.current.currentTime = 0;
      playPromiseRef.current = audioRef.current.play();
      playPromiseRef.current
        .then(() => setIsPlaying(true))
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error("Play failed:", err);
            setError("Could not play audio");
          }
        });
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    playPromiseRef.current = null;
  };

  const formatLetterName = (id) => {
    if (!id) return "";
    let name = id.split('.')[0].replace(/_/g, ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  React.useImperativeHandle(ref, () => ({
    playAudio
  }));

  return (
    <div>
      {selectedShapeId && (
        <>
          {!error && (
            <audio
              ref={audioRef}
              onLoadedData={handleAudioLoaded}
              onError={handleAudioError}
              onEnded={handleAudioEnded}
              preload="auto"
            />
          )}

          <div>
            <div>
              {/* {formatLetterName(selectedShapeId)} */}
            </div>

            {!error && (
              <div 
                className={`mike ${isPlaying ? 'active' : ''}`}               
                onClick={playAudio}
                style={{ cursor: !audioLoaded || isPlaying ? 'not-allowed' : 'pointer' }}
              >
                <img src={require('../images/mike.png')} alt="mike" className="tool-icon" />
              </div>
            )}
          </div>

          {error && (
            <div className="text-yellow-600 mt-2 text-sm w-full flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
});

TamilAudioPlayer.displayName = 'TamilAudioPlayer';

export default TamilAudioPlayer;
