import React, { useState } from 'react';

const TamilTextToSpeech = ({ text }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePlayAudio = async () => {
    if (!text) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://vairamuthu.in:3015/kili/convert/texttospeech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (data.audio_base64) {
        const audioSrc = `data:audio/mp3;base64,${data.audio_base64}`;
        const audio = new Audio(audioSrc);
        await audio.play();
      } else {
        throw new Error("Could not convert text to speech");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to play audio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="audio-button-container">
      <button
        className={`mike ${isLoading ? 'active' : ''}`}
        onClick={handlePlayAudio}
        disabled={isLoading}
        title="Play Audio"
      >
        <img src={require('../images/mike.png')} alt="mike" className="tool-icon" />
      </button>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default TamilTextToSpeech; 