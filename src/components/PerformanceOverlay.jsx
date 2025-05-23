import React, { useState, useEffect } from 'react';
import '../styles/PerformanceOverlay.css';
import moreDetailsIcon from '../images/moredetails.png';
import lessDetailsIcon from '../images/lessdetails.png';
import { convertPerformanceDataToTamil, tamilMapping } from '../utils/tamilMapping';

const PerformanceOverlay = ({ onClose, currentLevelMistakes = {}, currentLevelCorrect = {} }) => {
  const [selectedSeries, setSelectedSeries] = useState('vowels');
  const [performanceData, setPerformanceData] = useState({});
  const [showDetails, setShowDetails] = useState(false);

  // Tamil translations for UI text
  const tamilLabels = {
    // Page title and headers
    letterPerformance: "எழுத்தின் வலிமை",
    selectSeries: "வரிசையைத் தேர்வு செய்க",
    currentLevelMistakes: "தற்போதைய நிலை பிழைகள்",
    currentLevelCorrect: "தற்போதைய நிலை சரியான எழுத்துக்கள்",
    moreDetails: "மேலும் விவரங்கள்",
    lessDetails: "குறைவான விவரங்கள்",
    // Series names
    vowels: "உயிரெழுத்துக்கள்",
    consonants: "மெய்யெழுத்துக்கள்",
    special: "சிறப்பு எழுத்துக்கள்",
    kaSeries: "க வரிசை",
    ngaSeries: "ங வரிசை",
    chaSeries: "ச வரிசை",
    njaSeries: "ஞ வரிசை",
    taSeries: "ட வரிசை",
    NaSeries: "ண வரிசை",
    thaSeries: "த வரிசை",
    naSeries: "ந வரிசை",
    paSeries: "ப வரிசை",
    maSeries: "ம வரிசை",
    yaSeries: "ய வரிசை",
    raSeries: "ர வரிசை",
    laSeries: "ல வரிசை",
    vaSeries: "வ வரிசை",
    zhaSeries: "ழ வரிசை",
    LaSeries: "ள வரிசை",
    RaSeries: "ற வரிசை",
    naSeries2: "ன வரிசை",

    // Color legend and stats
    accuracyScale: "துல்லியத்தன் அளவுகோல்",
    hoverTip: "சதவீதங்களைக் காண அளவுகோலின் மேல் நகர்த்தவும்",
    
    // Buttons and controls
    close: "x"
  };

  useEffect(() => {
    const storedData = localStorage.getItem('tamilLetterPerformance');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        // Convert the stored English keys to Tamil characters
        const convertedData = convertPerformanceDataToTamil(parsedData);
        setPerformanceData(convertedData);
      } catch (error) {
        console.error('Error parsing performance data:', error);
        setPerformanceData({});
      }
    }
  }, []);

  const getAccuracyColor = (correct, attempts) => {
    if (attempts === 0) return '#e0e0e0'; // Grey for unexplored letters
    
    const accuracy = (correct / attempts) * 100;
    
    // Define color stops for different accuracy ranges
    const colorStops = [
      { threshold: 0, color: 'rgb(139, 0, 0)' },      // Dark red
      { threshold: 10, color: 'rgb(255, 0, 0)' },     // Bright red
      { threshold: 20, color: 'rgb(255, 69, 0)' },    // Red-orange
      { threshold: 30, color: 'rgb(255, 140, 0)' },   // Dark orange
      { threshold: 40, color: 'rgb(255, 165, 0)' },   // Orange
      { threshold: 50, color: 'rgb(255, 215, 0)' },   // Gold
      { threshold: 60, color: 'rgb(255, 255, 0)' },   // Yellow
      { threshold: 70, color: 'rgb(173, 255, 47)' },  // Green-yellow
      { threshold: 80, color: 'rgb(144, 238, 144)' }, // Light green
      { threshold: 90, color: 'rgb(50, 205, 50)' },   // Lime green
      { threshold: 100, color: 'rgb(0, 100, 0)' }     // Dark green
    ];

    // Find the appropriate color range
    for (let i = 0; i < colorStops.length - 1; i++) {
      if (accuracy <= colorStops[i + 1].threshold) {
        const startColor = colorStops[i].color;
        const endColor = colorStops[i + 1].color;
        const range = colorStops[i + 1].threshold - colorStops[i].threshold;
        const position = (accuracy - colorStops[i].threshold) / range;
        
        // Extract RGB values
        const startRGB = startColor.match(/\d+/g).map(Number);
        const endRGB = endColor.match(/\d+/g).map(Number);
        
        // Interpolate between colors
        const r = Math.round(startRGB[0] + (endRGB[0] - startRGB[0]) * position);
        const g = Math.round(startRGB[1] + (endRGB[1] - startRGB[1]) * position);
        const b = Math.round(startRGB[2] + (endRGB[2] - startRGB[2]) * position);
        
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
    
    return colorStops[colorStops.length - 1].color;
  };

  const letterSeries = {
    vowels: ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'],
    consonants:  [
        "க்", "ங்", "ச்", "ஞ்", "ட்", "ண்", "த்", "ந்", "ப்", "ம்",
        "ய்", "ர்", "ல்", "வ்", "ழ்", "ள்", "ற்", "ன்"
      ],
    special: ["ஃ", "ஜ்", "ஷ்", "ஸ்", "ஹ்", "க்ஷ்", "ஶ்"],
    kaSeries: ['க', 'கா', 'கி', 'கீ', 'கு', 'கூ', 'கெ', 'கே', 'கை', 'கொ', 'கோ', 'கௌ'],
    ngaSeries: ['ங', 'ஙா', 'ஙி', 'ஙீ', 'ஙு', 'ஙூ', 'ஙெ', 'ஙே', 'ஙை', 'ஙொ', 'ஙோ', 'ஙௌ'],
    chaSeries: ['ச', 'சா', 'சி', 'சீ', 'சு', 'சூ', 'செ', 'சே', 'சை', 'சொ', 'சோ', 'சௌ'],
    njaSeries: ['ஞ', 'ஞா', 'ஞி', 'ஞீ', 'ஞு', 'ஞூ', 'ஞெ', 'ஞே', 'ஞை', 'ஞொ', 'ஞோ', 'ஞௌ'],
    taSeries: ['ட', 'டா', 'டி', 'டீ', 'டு', 'டூ', 'டெ', 'டே', 'டை', 'டொ', 'டோ', 'டௌ'],
    NaSeries: ['ண', 'ணா', 'ணி', 'ணீ', 'ணு', 'ணூ', 'ணெ', 'ணே', 'ணை', 'ணொ', 'ணோ', 'ணௌ'],
    thaSeries: ['த', 'தா', 'தி', 'தீ', 'து', 'தூ', 'தெ', 'தே', 'தை', 'தொ', 'தோ', 'தௌ'],
    naSeries: ['ந', 'நா', 'நி', 'நீ', 'நு', 'நூ', 'நெ', 'நே', 'நை', 'நொ', 'நோ', 'நௌ'],
    paSeries: ['ப', 'பா', 'பி', 'பீ', 'பு', 'பூ', 'பெ', 'பே', 'பை', 'பொ', 'போ', 'பௌ'],
    maSeries: ['ம', 'மா', 'மி', 'மீ', 'மு', 'மூ', 'மெ', 'மே', 'மை', 'மொ', 'மோ', 'மௌ'],
    yaSeries: ['ய', 'யா', 'யி', 'யீ', 'யு', 'யூ', 'யெ', 'யே', 'யை', 'யொ', 'யோ', 'யௌ'],
    raSeries: ['ர', 'ரா', 'ரி', 'ரீ', 'ரு', 'ரூ', 'ரெ', 'ரே', 'ரை', 'ரொ', 'ரோ', 'ரௌ'],
    laSeries: ['ல', 'லா', 'லி', 'லீ', 'லு', 'லூ', 'லெ', 'லே', 'லை', 'லொ', 'லோ', 'லௌ'],
    vaSeries: ['வ', 'வா', 'வி', 'வீ', 'வு', 'வூ', 'வெ', 'வே', 'வை', 'வொ', 'வோ', 'வௌ'],
    zhaSeries: ['ழ', 'ழா', 'ழி', 'ழீ', 'ழு', 'ழூ', 'ழெ', 'ழே', 'ழை', 'ழொ', 'ழோ', 'ழௌ'],
    LaSeries: ['ள', 'ளா', 'ளி', 'ளீ', 'ளு', 'ளூ', 'ளெ', 'ளே', 'ளை', 'ளொ', 'ளோ', 'ளௌ'],
    RaSeries: ['ற', 'றா', 'றி', 'றீ', 'று', 'றூ', 'றெ', 'றே', 'றை', 'றொ', 'றோ', 'றௌ'],
    naSeries2: ['ன', 'னா', 'னி', 'னீ', 'னு', 'னூ', 'னெ', 'னே', 'னை', 'னொ', 'னோ', 'னௌ']
  };

  const getTopLetters = (data, count = 7) => {
    return Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count);
  };

  const renderLetterBox = (letter) => {
    const data = performanceData[letter] || { attempts: 0, correct: 0 };
    const accuracy = data.attempts === 0 ? 0 : Math.round((data.correct / data.attempts) * 100);
    const color = getAccuracyColor(data.correct, data.attempts);
    
    // Determine text color based on background color
    const getTextColor = (bgColor) => {
      if (data.attempts === 0) return '#666'; // Grey for unexplored letters
      
      // Extract RGB values from the background color
      const rgb = bgColor.match(/\d+/g).map(Number);
      if (rgb.length !== 3) return '#fff';
      
      // Calculate relative luminance
      const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      
      // Use black text for light backgrounds (yellow, light green, etc.)
      return luminance > 0.5 ? '#000' : '#fff';
    };

    return (
      <div 
        className="letter-box" 
        key={letter}
        style={{ 
          backgroundColor: color,
          color: getTextColor(color)
        }}
      >
        <div className="letter">{letter}</div>
        <div className="stats">
          <div className="ratio">{data.correct || 0}/{data.attempts || 0}</div>
          <div className="accuracy">{accuracy}%</div>
        </div>
      </div>
    );
  };

  const renderCurrentLevelStats = () => {
    const topMistakes = getTopLetters(currentLevelMistakes);
    const topCorrect = getTopLetters(currentLevelCorrect);

    return (
      <div className="current-level-stats" style={{ display: showDetails ? 'none' : 'block' }}>
        <div className="stats-section mistakes">
          <h3>
            <span className="tamil-letter">தற்போதைய நிலை பிழைகள்</span>
            <span className="tamil-subtitle">(தற்போதைய நிலை பிழைகள்)</span>
          </h3>
          {topMistakes.length > 0 ? (
            <div className="mistakes-grid">
              {topMistakes.map(([letter, count]) => (
                <div key={letter} className="mistake-box">
                  <div className="letter">{tamilMapping[letter]}</div>
                  <div className="count">{count} முறை</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-mistakes">பிழைகள் எதுவும் இல்லை</div>
          )}
        </div>

        <div className="stats-section correct">
          <h3>
            <span className="tamil-letter">தற்போதைய நிலை சரியான எழுத்துக்கள்</span>
            <span className="tamil-subtitle">(தற்போதைய நிலை சரியான எழுத்துக்கள்)</span>
          </h3>
          {topCorrect.length > 0 ? (
            <div className="correct-grid">
              {topCorrect.map(([letter, count]) => (
                <div key={letter} className="correct-box">
                  <div className="letter">{tamilMapping[letter]}</div>
                  <div className="count">{count} முறை</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-correct">சரியான எழுத்துக்கள் எதுவும் இல்லை</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="performance-overlay">
      <div className="performance-content">
        <div className="performance-header">
          <h2>{tamilLabels.letterPerformance}</h2>
          <button className="close-button" onClick={onClose}>{tamilLabels.close}</button>
        </div>
        
        <button 
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          <img 
            src={showDetails ? lessDetailsIcon : moreDetailsIcon} 
            alt={showDetails ? tamilLabels.lessDetails : tamilLabels.moreDetails}
          />
        </button>
        
        {renderCurrentLevelStats()}
        
        {showDetails && (
          <>
            <div className={`series-selector ${showDetails ? 'visible' : ''}`}>
              <select 
                value={selectedSeries}
                onChange={(e) => setSelectedSeries(e.target.value)}
                className="series-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="vowels">{tamilLabels.vowels}</option>
                <option value="consonants">{tamilLabels.consonants}</option>
                <option value="special">{tamilLabels.special}</option>
                <option value="kaSeries">{tamilLabels.kaSeries}</option>
                <option value="ngaSeries">{tamilLabels.ngaSeries}</option>
                <option value="chaSeries">{tamilLabels.chaSeries}</option>
                <option value="njaSeries">{tamilLabels.njaSeries}</option>
                <option value="taSeries">{tamilLabels.taSeries}</option>
                <option value="NaSeries">{tamilLabels.NaSeries}</option>
                <option value="thaSeries">{tamilLabels.thaSeries}</option>
                <option value="naSeries">{tamilLabels.naSeries}</option>
                <option value="paSeries">{tamilLabels.paSeries}</option>
                <option value="maSeries">{tamilLabels.maSeries}</option>
                <option value="yaSeries">{tamilLabels.yaSeries}</option>
                <option value="raSeries">{tamilLabels.raSeries}</option>
                <option value="laSeries">{tamilLabels.laSeries}</option>
                <option value="vaSeries">{tamilLabels.vaSeries}</option>
                <option value="zhaSeries">{tamilLabels.zhaSeries}</option>
                <option value="LaSeries">{tamilLabels.LaSeries}</option>
                <option value="RaSeries">{tamilLabels.RaSeries}</option>
                <option value="naSeries2">{tamilLabels.naSeries2}</option>
              </select>
            </div>

            <div className="letter-grid">
              {letterSeries[selectedSeries].map(renderLetterBox)}
            </div>

            <div className="color-legend">
              <div className="legend-title">{tamilLabels.accuracyScale}</div>
              <div className="gradient-scale">
                {Array.from({ length: 101 }, (_, i) => (
                  <div
                    key={i}
                    className="gradient-segment"
                    style={{
                      backgroundColor: getAccuracyColor(i, 100),
                      width: `${100/101}%`
                    }}
                    title={`${i}%`}
                  />
                ))}
              </div>
              <div className="scale-labels">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <div className="legend-description">
                {/* {tamilLabels.hoverTip} */}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PerformanceOverlay;